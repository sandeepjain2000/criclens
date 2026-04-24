import 'dotenv/config';
import { getPool } from './lib/db.js';

async function main() {
  try {
    const pool = getPool('t20');
    let res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'deliveries'");
    console.log("Deliveries cols:", res.rows.map(r=>r.column_name).join(', '));
    
    res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'matches'");
    console.log("Matches cols:", res.rows.map(r=>r.column_name).join(', '));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
main();
