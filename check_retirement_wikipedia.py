"""
check_retirement_wikipedia.py
─────────────────────────────────────────────────────────────────────────────
PURPOSE
  1. Backs up the current player_profiles retirement data → CSV + SQLite
     (safe snapshot before any changes)
  2. Tests Wikipedia-based retirement lookup via OpenAI for 10 pilot players.
     Prompt uses: player name + sport=cricket + country + retirement keyword
  3. Prints a summary table and saves results to retirement_wiki_results.csv
     for manual review before applying to the DB.

PILOT PLAYERS
  Includes "Ravish Sharma" and "Virat Kohli" as requested.

USAGE
  pip install psycopg2-binary openai
  python check_retirement_wikipedia.py
"""

import csv
import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from openai import OpenAI

# ── Config ────────────────────────────────────────────────────────────────────

T20_DB_URL = (
    "postgresql://postgres.lwvejufzfbcnetrfgnuz:tnvgsL50YYLR0DPh"
    "@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
)

OPENAI_API_KEY = (
    "sk-proj-RTNX3ybs0TQhf__JyCfpSzEfoU9EfJgGSNtZjNmZwsQviixq8GbAExAEqUJ8I5eH6L"
    "-nO9g4b8T3BlbkFJEPpHAwtH293A1CsttgOOtJzZwzaVxgoCTLmPdp2-lFTwYYFWjiFPGkEetPz"
    "yfRIC8sMzWcN4wA"
)

MODEL       = "gpt-4o-mini"
SLEEP_SECS  = 0.4  # between calls to avoid rate-limit

OUT_DIR       = Path(__file__).parent
BACKUP_CSV    = OUT_DIR / "retirement_backup.csv"
BACKUP_SQLITE = OUT_DIR / "retirement_backup.db"
RESULTS_CSV   = OUT_DIR / "retirement_wiki_results.csv"

# ── 10 Pilot players ──────────────────────────────────────────────────────────
# "Ravish Sharma" is included as requested — OpenAI will indicate if unknown.
PILOT_PLAYERS = [
    {"player_name": "Ravish Sharma",   "nationality": "India"},
    {"player_name": "Virat Kohli",     "nationality": "India"},
    {"player_name": "MS Dhoni",        "nationality": "India"},
    {"player_name": "Rohit Sharma",    "nationality": "India"},
    {"player_name": "DA Warner",       "nationality": "Australia"},
    {"player_name": "SPD Smith",       "nationality": "Australia"},
    {"player_name": "AB de Villiers",  "nationality": "South Africa"},
    {"player_name": "Babar Azam",      "nationality": "Pakistan"},
    {"player_name": "KS Williamson",   "nationality": "New Zealand"},
    {"player_name": "CH Gayle",        "nationality": "West Indies"},
]

# ── OpenAI system prompt ──────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a cricket domain expert with comprehensive Wikipedia-level knowledge \
about international cricketers.

Given a player's name, sport, and country, determine whether they have retired from \
international cricket. Use Wikipedia as your primary reference.

Return ONLY a valid JSON object — no extra text outside it:
{
  "player_name":     "<exact name as given>",
  "retired":         true | false | null,
  "retirement_year": <4-digit integer year, or null if not retired / unknown>,
  "confidence":      "high" | "medium" | "low",
  "notes":           "<1-sentence explanation referencing Wikipedia if possible>"
}

Rules:
- "retired" = true  → player has formally retired from ALL international cricket
- "retired" = false → player is still active / available for selection
- "retired" = null  → player is completely unknown (possible name error)
- confidence "high"   → well-documented on Wikipedia
- confidence "medium" → known but retirement status is ambiguous
- confidence "low"    → very limited information available"""

# ── Core function ─────────────────────────────────────────────────────────────

def check_retirement(client, player_name, nationality):
    """Query OpenAI for retirement status using Wikipedia knowledge."""
    user_msg = (
        f"Player name : {player_name}\n"
        f"Sport       : cricket (international)\n"
        f"Country     : {nationality}\n"
        f"Query       : Has this player retired from international cricket? "
        f"Please check Wikipedia retirement records."
    )
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)

# ── Backup helpers ────────────────────────────────────────────────────────────

def backup_to_csv(rows, path):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["player_name", "nationality", "is_retired", "backed_up_at"]
        )
        writer.writeheader()
        writer.writerows(rows)
    print(f"   OK CSV    -> {path}  ({len(rows)} rows)")


def backup_to_sqlite(rows, path):
    con = sqlite3.connect(path)
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS retirement_backup (
            player_name   TEXT PRIMARY KEY,
            nationality   TEXT,
            is_retired    INTEGER,  -- 1=retired, 0=active, NULL=unknown
            backed_up_at  TEXT
        )
    """)
    cur.executemany(
        "INSERT OR REPLACE INTO retirement_backup VALUES (?, ?, ?, ?)",
        [
            (r["player_name"], r["nationality"],
             (1 if r["is_retired"] else (0 if r["is_retired"] is False else None)),
             r["backed_up_at"])
            for r in rows
        ],
    )
    con.commit()
    con.close()
    print(f"   OK SQLite -> {path}  ({len(rows)} rows)")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # ── Step 1: Backup existing retirement data from Supabase ────────────────
    print("=" * 60)
    print("STEP 1 — Backing up retirement data from Supabase DB")
    print("=" * 60)

    conn = psycopg2.connect(T20_DB_URL)
    cur  = conn.cursor()

    # is_retired column may not exist yet — handle gracefully
    try:
        cur.execute("""
            SELECT player_name,
                   COALESCE(nationality, '') AS nationality,
                   is_retired
            FROM player_profiles
            ORDER BY player_name
        """)
        db_rows = cur.fetchall()
        print(f"   Fetched {len(db_rows)} rows (with is_retired column)")
    except Exception as col_err:
        print(f"   Note: is_retired column not present yet ({col_err})")
        conn.rollback()
        cur.execute("""
            SELECT player_name,
                   COALESCE(nationality, '') AS nationality,
                   NULL::boolean AS is_retired
            FROM player_profiles
            ORDER BY player_name
        """)
        db_rows = cur.fetchall()
        print(f"   Fetched {len(db_rows)} rows (is_retired as NULL)")

    conn.close()

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    backup  = [
        {
            "player_name": r[0],
            "nationality": r[1],
            "is_retired":  r[2],
            "backed_up_at": now_str,
        }
        for r in db_rows
    ]

    backup_to_csv(backup, BACKUP_CSV)
    backup_to_sqlite(backup, BACKUP_SQLITE)

    # ── Step 2: OpenAI pilot on 10 players ───────────────────────────────────
    print()
    print("=" * 60)
    print(f"STEP 2 — Wikipedia retirement check via OpenAI ({MODEL})")
    print("=" * 60)

    client  = OpenAI(api_key=OPENAI_API_KEY)
    results = []

    for i, p in enumerate(PILOT_PLAYERS, 1):
        name    = p["player_name"]
        country = p["nationality"]
        print(f"   [{i:02d}/{len(PILOT_PLAYERS)}] {name:<25} ({country:<15}) ... ", end="", flush=True)

        try:
            res = check_retirement(client, name, country)
            retired_raw  = res.get("retired")
            retire_year  = res.get("retirement_year")
            confidence   = res.get("confidence", "?")
            notes        = res.get("notes", "")

            if retired_raw is True:
                status_str = f"RETIRED{f' ({retire_year})' if retire_year else ''}"
            elif retired_raw is False:
                status_str = "ACTIVE"
            else:
                status_str = "UNKNOWN (player not found)"

            print(f"{status_str}  [{confidence} confidence]")

            results.append({
                "player_name":     name,
                "nationality":     country,
                "retired":         retired_raw,
                "retirement_year": retire_year,
                "confidence":      confidence,
                "notes":           notes,
            })

        except Exception as e:
            print(f"ERROR - {e}")
            results.append({
                "player_name":     name,
                "nationality":     country,
                "retired":         None,
                "retirement_year": None,
                "confidence":      "low",
                "notes":           f"API error: {e}",
            })

        time.sleep(SLEEP_SECS)

    # ── Step 3: Save + print summary ─────────────────────────────────────────
    with open(RESULTS_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["player_name","nationality","retired","retirement_year","confidence","notes"]
        )
        writer.writeheader()
        writer.writerows(results)

    print()
    print("=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    print(f"{'#':<3} {'Player':<26} {'Country':<16} {'Status':<10} {'Year':<6} {'Conf':<8} Notes")
    print("-" * 90)
    for i, r in enumerate(results, 1):
        if r["retired"] is True:
            status = "RETIRED"
        elif r["retired"] is False:
            status = "ACTIVE"
        else:
            status = "UNKNOWN"
        yr = str(r["retirement_year"]) if r["retirement_year"] else "—"
        print(
            f"{i:<3} {r['player_name']:<26} {r['nationality']:<16} "
            f"{status:<10} {yr:<6} {r['confidence']:<8} {r['notes']}"
        )
    print("-" * 90)
    print()
    print(f"Results CSV   -> {RESULTS_CSV}")
    print(f"Backup CSV    -> {BACKUP_CSV}")
    print(f"Backup SQLite -> {BACKUP_SQLITE}")
    print()
    print("Review retirement_wiki_results.csv before applying any changes to the DB.")
    print("Done.")


if __name__ == "__main__":
    main()
