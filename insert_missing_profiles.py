"""
insert_missing_profiles.py
Insert player_profiles entries for known female players
who have NO profile record but appear in match_players.
"""
import psycopg2

T20_DB_URL = (
    "postgresql://postgres.lwvejufzfbcnetrfgnuz:tnvgsL50YYLR0DPh"
    "@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
)

# Female players confirmed to be in match_players but missing from player_profiles
MISSING_FEMALE_PLAYERS = [
    'RP Yadav',       # Radha Yadav (spinner, India Women)
    'Radha Yadav',
    'RS Gayakwad',    # Rajeshwari Gayakwad
    'D Hemalatha',    # Deepti Hemalatha
    'S Rana',         # Sneh Rana (if missing)
    'T Bhatia',       # Taniya Bhatia
    'YH Bhatia',      # Yastika Bhatia
    'PG Raut',        # Punam Raut
    'M Raj',          # Mithali Raj
    'J Goswami',      # Jhulan Goswami
    'Meghna Singh',   # Meghna Singh
]

conn = psycopg2.connect(T20_DB_URL)
cur = conn.cursor()

inserted = 0
updated = 0

for name in MISSING_FEMALE_PLAYERS:
    # Check if already exists
    cur.execute("SELECT player_name, gender FROM player_profiles WHERE player_name = %s", (name,))
    row = cur.fetchone()
    if row is None:
        cur.execute(
            "INSERT INTO player_profiles (player_name, gender) VALUES (%s, 'female') ON CONFLICT (player_name) DO NOTHING",
            (name,)
        )
        inserted += cur.rowcount
        print(f"  INSERTED: {name} -> female")
    elif row[1] != 'female':
        cur.execute(
            "UPDATE player_profiles SET gender = 'female' WHERE player_name = %s",
            (name,)
        )
        updated += cur.rowcount
        print(f"  UPDATED:  {name} {row[1]} -> female")
    else:
        print(f"  OK:       {name} already female")

conn.commit()
print(f"\nInserted: {inserted}, Updated: {updated}")

# Final verification
check = MISSING_FEMALE_PLAYERS[:5]
placeholders = ','.join(['%s'] * len(check))
cur.execute(
    f"SELECT player_name, gender FROM player_profiles WHERE player_name IN ({placeholders})",
    check
)
print("\nVerification:")
for r in cur.fetchall():
    print(f"  {r}")

conn.close()
print("Done.")
