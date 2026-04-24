"""
populate_player_gender.py
---------------------------------------------------------------------------
One-time script to classify all players in player_profiles as 'male' or
'female' using OpenAI, then write the result back to the T20 Supabase DB.

Approach:
  1. ADD gender column (TEXT, nullable) to player_profiles if missing
  2. Fetch every player_name that has no gender yet
  3. Batch names into groups of 60 and ask GPT-4o-mini to classify them
  4. UPDATE player_profiles SET gender = ... per name

Run once; safe to re-run (skips already-classified rows).

Requirements:
    pip install psycopg2-binary openai
"""

import json
import time
import psycopg2
from openai import OpenAI

# -- Config -------------------------------------------------------------------

T20_DB_URL = (
    "postgresql://postgres.lwvejufzfbcnetrfgnuz:tnvgsL50YYLR0DPh"
    "@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
)

OPENAI_API_KEY = (
    "sk-proj-RTNX3ybs0TQhf__JyCfpSzEfoU9EfJgGSNtZjNmZwsQviixq8GbAExAEqUJ8I5eH6L"
    "-nO9g4b8T3BlbkFJEPpHAwtH293A1CsttgOOtJzZwzaVxgoCTLmPdp2-lFTwYYFWjiFPGkEetPz"
    "yfRIC8sMzWcN4wA"
)

BATCH_SIZE  = 60     # names per OpenAI call
MODEL       = "gpt-4o-mini"
SLEEP_SECS  = 0.5   # between batches to avoid rate-limit

# -- OpenAI prompt ------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are a cricket domain expert. You will receive a JSON array of cricket "
    "player names. Classify each as 'male' or 'female'. "
    "Return ONLY a JSON object where each key is the exact player name and the "
    "value is either 'male' or 'female'. Do not add any explanation."
)

def classify_batch(client, names):
    """Ask GPT to classify a batch of player names. Returns {name: 'male'|'female'}."""
    user_msg = json.dumps(names)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    result = json.loads(raw)
    return {
        name: str(v).strip().lower()
        for name, v in result.items()
        if str(v).strip().lower() in ("male", "female")
    }


# -- Main ---------------------------------------------------------------------

def main():
    conn = psycopg2.connect(T20_DB_URL)
    conn.autocommit = False
    cur  = conn.cursor()

    # Step 1: ensure gender column exists
    print(">> Ensuring gender column exists on player_profiles ...")
    cur.execute("""
        ALTER TABLE player_profiles
        ADD COLUMN IF NOT EXISTS gender TEXT;
    """)
    conn.commit()
    print("   gender column ready")

    # Step 2: fetch unclassified players
    cur.execute("""
        SELECT player_name FROM player_profiles
        WHERE gender IS NULL OR gender = ''
        ORDER BY player_name
    """)
    rows = cur.fetchall()
    all_names = [r[0] for r in rows]
    print(f">> {len(all_names)} players to classify ...")

    if not all_names:
        print("   Nothing to do -- all players already have gender set.")
        conn.close()
        return

    # Step 3: classify in batches
    client = OpenAI(api_key=OPENAI_API_KEY)
    results = {}
    total_batches = (len(all_names) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(all_names), BATCH_SIZE):
        batch     = all_names[i : i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        print(f"   Batch {batch_num}/{total_batches}: {len(batch)} names ...", end=" ", flush=True)
        try:
            classified = classify_batch(client, batch)
            results.update(classified)
            print(f"OK ({len(classified)} classified)")
        except Exception as e:
            print(f"ERROR: {e}")
        time.sleep(SLEEP_SECS)

    # Step 4: write back to DB
    print(f"\n>> Writing {len(results)} gender values to player_profiles ...")
    updated = 0
    for name, gender in results.items():
        cur.execute(
            "UPDATE player_profiles SET gender = %s WHERE player_name = %s",
            (gender, name)
        )
        updated += cur.rowcount

    conn.commit()
    print(f"   {updated} rows updated")

    # Summary
    cur.execute("SELECT gender, COUNT(*) FROM player_profiles GROUP BY gender ORDER BY gender")
    summary = cur.fetchall()
    print("\n-- Gender distribution in player_profiles --")
    for gender, cnt in summary:
        label = gender if gender else "(null)"
        print(f"  {label:10s}: {cnt:,}")

    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
