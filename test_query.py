import sqlite3
import json

conn = sqlite3.connect(r'c:\Users\sandeep\Downloads\Claudes\Cricket\data\cricket_test.db')
c = conn.cursor()

query1 = """
SELECT batter, SUM(runs_batter) as total_runs
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
WHERE (m.team1 = 'India' OR m.team2 = 'India') AND m.date LIKE '2024%'
GROUP BY batter
ORDER BY total_runs DESC
LIMIT 5;
"""

print("Test 1:")
for row in c.execute(query1):
    print(row)

query2 = """
SELECT SUM(runs_batter)
FROM deliveries d
JOIN matches m ON d.match_id = m.match_id
WHERE m.date LIKE '2024%' AND m.team1 = 'India'
"""
print("Total possible issue:", list(c.execute(query2)))
