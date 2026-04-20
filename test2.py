import sqlite3
conn = sqlite3.connect(r'c:\Users\sandeep\Downloads\Claudes\Cricket\data\cricket_test.db')
c = conn.cursor()
print(c.execute("SELECT batter, SUM(runs_batter) as total_runs FROM deliveries WHERE batter LIKE '%Tendulkar%' GROUP BY batter").fetchall())
print(c.execute("SELECT MIN(date), MAX(date) FROM matches").fetchall())
