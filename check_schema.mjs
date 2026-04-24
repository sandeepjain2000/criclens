import { getPool } from './lib/db.js';
const pool = getPool('t20');
// Check player_profiles columns
const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'player_profiles' ORDER BY ordinal_position");
console.log('PROFILE COLS:', cols.rows.map(x=>x.column_name).join(', '));
// Check distinct gender values in matches table
const genders = await pool.query("SELECT DISTINCT gender, COUNT(*) AS cnt FROM matches GROUP BY gender ORDER BY gender");
console.log('MATCH GENDERS:', JSON.stringify(genders.rows));
// Check matches columns to confirm gender field exists
const matchCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'matches' ORDER BY ordinal_position");
console.log('MATCHES COLS:', matchCols.rows.map(x=>x.column_name).join(', '));
// Check India active players with gender filter
const indiaM = await pool.query("SELECT DISTINCT mp.player_name FROM match_players mp JOIN matches m ON mp.match_id = m.match_id WHERE mp.team = 'India' AND m.gender ILIKE 'male' ORDER BY mp.player_name LIMIT 10");
console.log('INDIA MALE PLAYERS (sample):', JSON.stringify(indiaM.rows));
process.exit(0);
