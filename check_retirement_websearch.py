"""
check_retirement_websearch.py
─────────────────────────────────────────────────────────────────────────────
Uses the OpenAI Responses API with web_search_preview (live web search)
to determine CURRENT international cricket retirement status per format.

Key improvements over the chat-completions approach:
  - Live web search: no training-data cutoff limitation
  - Per-format check: T20I / ODI / Test retirement tracked separately
  - League play is NOT counted as international activity
    (e.g. Kohli/Rohit retired from T20I but play IPL)

USAGE
  pip install openai psycopg2-binary
  python check_retirement_websearch.py
"""

import csv
import json
import re
import time
from pathlib import Path
from datetime import datetime, timezone

from openai import OpenAI

# ── Config ────────────────────────────────────────────────────────────────────

OPENAI_API_KEY = (
    "sk-proj-RTNX3ybs0TQhf__JyCfpSzEfoU9EfJgGSNtZjNmZwsQviixq8GbAExAEqUJ8I5eH6L"
    "-nO9g4b8T3BlbkFJEPpHAwtH293A1CsttgOOtJzZwzaVxgoCTLmPdp2-lFTwYYFWjiFPGkEetPz"
    "yfRIC8sMzWcN4wA"
)

MODEL      = "gpt-4o"        # supports web_search_preview tool
SLEEP_SECS = 1.5             # between calls (web search is slower)

OUT_DIR     = Path(__file__).parent
RESULTS_CSV = OUT_DIR / "retirement_websearch_results.csv"

# ── 10 Pilot players ──────────────────────────────────────────────────────────
PILOT_PLAYERS = [
    {"player_name": "Ravish Sharma",   "nationality": "India"},
    {"player_name": "Virat Kohli",     "nationality": "India"},
    {"player_name": "Rohit Sharma",    "nationality": "India"},
    {"player_name": "MS Dhoni",        "nationality": "India"},
    {"player_name": "DA Warner",       "nationality": "Australia"},
    {"player_name": "SPD Smith",       "nationality": "Australia"},
    {"player_name": "AB de Villiers",  "nationality": "South Africa"},
    {"player_name": "Babar Azam",      "nationality": "Pakistan"},
    {"player_name": "KS Williamson",   "nationality": "New Zealand"},
    {"player_name": "CH Gayle",        "nationality": "West Indies"},
]

# ── Prompt ────────────────────────────────────────────────────────────────────

def build_prompt(player_name, nationality):
    return (
        f"Search the web for the CURRENT international cricket retirement status "
        f"of the cricketer '{player_name}' who plays for {nationality}.\n\n"
        f"IMPORTANT rules:\n"
        f"- Playing in the IPL, BBL, PSL or any other domestic/franchise league "
        f"  does NOT mean the player is active in international cricket.\n"
        f"- Retirement from T20 Internationals (T20I) is separate from ODI or Test retirement.\n"
        f"- If the player is unknown or the name seems wrong, set retired fields to null.\n\n"
        f"After searching, return ONLY a JSON object — no extra text:\n"
        f"{{\n"
        f'  "player_name": "{player_name}",\n'
        f'  "retired_t20i": true | false | null,\n'
        f'  "retired_odi":  true | false | null,\n'
        f'  "retired_test": true | false | null,\n'
        f'  "fully_retired_international": true | false | null,\n'
        f'  "retirement_year": <4-digit integer or null>,\n'
        f'  "still_plays_league": true | false | null,\n'
        f'  "confidence": "high" | "medium" | "low",\n'
        f'  "notes": "<1-sentence current-status summary with source>"\n'
        f"}}"
    )

# ── Helpers ───────────────────────────────────────────────────────────────────

def extract_json(text):
    """Extract first JSON object from model response text."""
    # Try markdown code block first
    md = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if md:
        return json.loads(md.group(1))
    # Then bare JSON object
    bare = re.search(r"\{.*\}", text, re.DOTALL)
    if bare:
        return json.loads(bare.group())
    raise ValueError("No JSON found in response")


def fmt_bool(v):
    if v is True:  return "YES"
    if v is False: return "NO"
    return "?"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    client = OpenAI(api_key=OPENAI_API_KEY)
    results = []

    print("=" * 70)
    print(f"Retirement Web-Search Check ({MODEL} + web_search_preview)")
    print(f"Run at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 70)
    print("Note: This uses live web search - no training cutoff limitation.")
    print()

    for i, p in enumerate(PILOT_PLAYERS, 1):
        name    = p["player_name"]
        country = p["nationality"]
        print(f"[{i:02d}/{len(PILOT_PLAYERS)}] {name} ({country}) ... ", end="", flush=True)

        try:
            response = client.responses.create(
                model=MODEL,
                tools=[{"type": "web_search_preview"}],
                input=build_prompt(name, country),
            )
            raw_text = response.output_text

            try:
                data = extract_json(raw_text)
            except Exception:
                # If JSON parse fails, store raw text as notes
                data = {
                    "player_name":               name,
                    "retired_t20i":              None,
                    "retired_odi":               None,
                    "retired_test":              None,
                    "fully_retired_international": None,
                    "retirement_year":           None,
                    "still_plays_league":        None,
                    "confidence":                "low",
                    "notes":                     raw_text[:300],
                }

            # Normalise field names
            data.setdefault("player_name",               name)
            data.setdefault("retired_t20i",              None)
            data.setdefault("retired_odi",               None)
            data.setdefault("retired_test",              None)
            data.setdefault("fully_retired_international", None)
            data.setdefault("retirement_year",           None)
            data.setdefault("still_plays_league",        None)
            data.setdefault("confidence",                "low")
            data.setdefault("notes",                     "")
            data["nationality"] = country

            results.append(data)

            # Compact status line
            t20  = fmt_bool(data["retired_t20i"])
            odi  = fmt_bool(data["retired_odi"])
            test = fmt_bool(data["retired_test"])
            league = fmt_bool(data["still_plays_league"])
            conf = data["confidence"]
            yr   = data["retirement_year"] or "-"
            print(f"T20I:{t20} ODI:{odi} Test:{test} League:{league} ({conf}) yr:{yr}")

        except Exception as e:
            print(f"ERROR - {e}")
            results.append({
                "player_name": name, "nationality": country,
                "retired_t20i": None, "retired_odi": None,
                "retired_test": None, "fully_retired_international": None,
                "retirement_year": None, "still_plays_league": None,
                "confidence": "low", "notes": f"API error: {e}",
            })

        time.sleep(SLEEP_SECS)

    # ── Save CSV ──────────────────────────────────────────────────────────────
    fields = [
        "player_name","nationality",
        "retired_t20i","retired_odi","retired_test",
        "fully_retired_international","retirement_year",
        "still_plays_league","confidence","notes",
    ]
    with open(RESULTS_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)

    # ── Print summary table ───────────────────────────────────────────────────
    print()
    print("=" * 90)
    print("SUMMARY")
    print("=" * 90)
    hdr = f"{'#':<3} {'Player':<26} {'Country':<16} {'T20I':<6} {'ODI':<5} {'Test':<5} {'League':<7} {'Yr':<5} {'Conf'}"
    print(hdr)
    print("-" * 90)
    for i, r in enumerate(results, 1):
        print(
            f"{i:<3} {r['player_name']:<26} {r['nationality']:<16} "
            f"{fmt_bool(r['retired_t20i']):<6} {fmt_bool(r['retired_odi']):<5} "
            f"{fmt_bool(r['retired_test']):<5} {fmt_bool(r['still_plays_league']):<7} "
            f"{str(r['retirement_year'] or '-'):<5} {r['confidence']}"
        )
        if r["notes"]:
            print(f"     >> {r['notes']}")
    print("-" * 90)
    print()
    print(f"Results -> {RESULTS_CSV}")
    print("Done.")


if __name__ == "__main__":
    main()
