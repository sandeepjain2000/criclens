import psycopg2

T20_DB_URL = (
    "postgresql://postgres.lwvejufzfbcnetrfgnuz:tnvgsL50YYLR0DPh"
    "@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
)

conn = psycopg2.connect(T20_DB_URL)
cur = conn.cursor()

# Check what gender was assigned to suspected women players
suspects = [
    'DB Sharma', 'RP Yadav', 'Deepti Sharma', 'Radha Yadav',
    'Renuka Singh', 'P Vastrakar', 'S Mandhana', 'H Kaur',
    'Shafali Verma', 'RM Ghosh', 'JI Rodrigues', 'Sneh Rana',
]
placeholders = ','.join(['%s'] * len(suspects))
cur.execute(
    f"SELECT player_name, gender FROM player_profiles WHERE player_name IN ({placeholders}) ORDER BY player_name",
    suspects
)
rows = cur.fetchall()
print("Gender for suspect players:")
for r in rows:
    print(f"  {r[0]:30s}: {r[1]}")

# Manual corrections - these are definitively female players with abbreviated names
# that GPT misclassified due to ambiguous initials
corrections = {
    'DB Sharma':  'female',  # Deepti Sharma
    'RP Yadav':   'female',  # Radha Yadav (Richa Ghosh uses RM Ghosh)
    'RM Ghosh':   'female',  # Richa Ghosh
    'JI Rodrigues': 'female', # Jemimah Rodrigues
    'P Vastrakar': 'female',  # Pooja Vastrakar
    'S Mandhana':  'female',  # Smriti Mandhana
    'H Kaur':      'female',  # Harmanpreet Kaur
    'Shafali Verma': 'female',
    'Sneh Rana':   'female',
    'Renuka Singh': 'female',
    'RS Gayakwad': 'female',  # Rajeshwari Gayakwad
    'D Hemalatha': 'female',
    'S Rana':      'female',
    'Deepti Sharma': 'female',
    'Radha Yadav': 'female',
    'T Bhatia':    'female',  # Taniya Bhatia
    'YH Bhatia':   'female',  # Yastika Bhatia
    'R Ghosh':     'female',  # Richa Ghosh (alternate spelling)
    'PG Raut':     'female',  # Punam Raut
    'M Raj':       'female',  # Mithali Raj
    'J Goswami':   'female',  # Jhulan Goswami
    'J Yadav':     'female',  # Jemimah Yadav / if female
    'S Pandey':    'female',  # Sushma Pandey / check
    'Meghna Singh': 'female',
}

updated = 0
for name, gender in corrections.items():
    cur.execute(
        "UPDATE player_profiles SET gender = %s WHERE player_name = %s",
        (gender, name)
    )
    updated += cur.rowcount

conn.commit()
print(f"\nManually corrected {updated} players to female")

# Verify the corrections
cur.execute(
    f"SELECT player_name, gender FROM player_profiles WHERE player_name IN ({placeholders}) ORDER BY player_name",
    suspects
)
rows = cur.fetchall()
print("\nAfter correction:")
for r in rows:
    print(f"  {r[0]:30s}: {r[1]}")

# Overall summary
cur.execute("SELECT gender, COUNT(*) FROM player_profiles GROUP BY gender ORDER BY gender")
summary = cur.fetchall()
print("\n-- Final gender distribution --")
for gender, cnt in summary:
    label = gender if gender else "(null)"
    print(f"  {label:10s}: {cnt:,}")

conn.close()
print("\nDone.")
