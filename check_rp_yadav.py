import psycopg2

T20_DB_URL = (
    "postgresql://postgres.lwvejufzfbcnetrfgnuz:tnvgsL50YYLR0DPh"
    "@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
)

conn = psycopg2.connect(T20_DB_URL)
cur = conn.cursor()

# Find all RP Yadav variants in player_profiles
cur.execute("""
    SELECT player_name, gender, playing_role, bowling_type
    FROM player_profiles
    WHERE player_name ILIKE '%yadav%'
      AND player_name ILIKE 'r%'
    ORDER BY player_name
""")
rows = cur.fetchall()
print("All R* Yadav players in player_profiles:")
for r in rows:
    print(f"  {r}")

# Also check match_players for RP Yadav
cur.execute("""
    SELECT DISTINCT player_name, team
    FROM match_players
    WHERE player_name ILIKE '%RP Yadav%'
       OR player_name ILIKE '%Radha Yadav%'
    LIMIT 20
""")
rows2 = cur.fetchall()
print("\nRP Yadav / Radha Yadav in match_players:")
for r in rows2:
    print(f"  {r}")

# Check if RP Yadav is in profiles
cur.execute("SELECT player_name, gender FROM player_profiles WHERE player_name = 'RP Yadav'")
r = cur.fetchone()
print(f"\nExact 'RP Yadav' in player_profiles: {r}")

# Check Rishabh Pant (RP Yadav should NOT be him)
cur.execute("""
    SELECT DISTINCT player_name
    FROM match_players
    WHERE player_name LIKE 'RP %' AND team = 'India'
    LIMIT 10
""")
rows3 = cur.fetchall()
print("\nAll 'RP *' players for India in match_players:")
for r in rows3:
    print(f"  {r}")

conn.close()
