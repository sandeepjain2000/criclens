import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'players';
  const pool = getPool('t20');

  try {
    // === PLAYER LIST (for dropdown) ===
    if (action === 'players') {
      const { rows } = await pool.query(`
        SELECT COALESCE(pp.full_name, d.batter) as name, MAX(mp.team) as country,
               COUNT(DISTINCT d.match_id) as innings,
               SUM(d.runs_batter) as runs
        FROM deliveries d
        LEFT JOIN match_players mp ON d.batter = mp.player_name AND d.match_id = mp.match_id
        LEFT JOIN player_profiles pp ON d.batter = pp.player_name
        WHERE d.batter IS NOT NULL
        GROUP BY d.batter, pp.full_name
        HAVING COUNT(DISTINCT d.match_id) >= 15 AND SUM(d.runs_batter) >= 200
        ORDER BY SUM(d.runs_batter) DESC
        LIMIT 60
      `);
      return Response.json({ players: rows.map(r => ({ name: r.name, country: r.country || "Unknown" })) });
    }

    // === COMPARE TWO PLAYERS ===
    if (action === 'compare') {
      const p1Name = searchParams.get('p1');
      const p2Name = searchParams.get('p2');
      if (!p1Name || !p2Name) return Response.json({ error: 'p1 and p2 required' }, { status: 400 });

      async function getPlayerStats(playerName) {
        // We first resolve the true db player name
        const dbNameRes = await pool.query('SELECT COALESCE((SELECT player_name FROM player_profiles WHERE full_name = $1 LIMIT 1), $1) as pname', [playerName]);
        const dbName = dbNameRes.rows[0].pname;

        // Overall stats
        const overall = await pool.query(`
          SELECT 
            batter,
            MAX(mp.team) as country,
            COUNT(DISTINCT d.match_id) as innings,
            SUM(d.runs_batter) as runs,
            (SUM(d.runs_batter)::float / NULLIF(COUNT(d.delivery_id),0)) * 100 as sr,
            SUM(d.runs_batter)::float / NULLIF(
              SUM(CASE WHEN d.wicket_player_out = d.batter THEN 1 ELSE 0 END), 0
            ) as avg,
            SUM(CASE WHEN d.runs_batter IN (4,6) THEN 1 ELSE 0 END) as boundaries,
            COUNT(d.delivery_id) as balls
          FROM deliveries d
          LEFT JOIN match_players mp ON d.batter = mp.player_name AND d.match_id = mp.match_id
          WHERE d.batter = $1
          GROUP BY d.batter
        `, [dbName]);

        if (!overall.rows.length) return null;
        const o = overall.rows[0];

        // Fifties & centuries
        const milestones = await pool.query(`
          SELECT 
            SUM(CASE WHEN total >= 50 AND total < 100 THEN 1 ELSE 0 END) as fifties,
            SUM(CASE WHEN total >= 100 THEN 1 ELSE 0 END) as centuries
          FROM (
            SELECT match_id, SUM(runs_batter) as total
            FROM deliveries WHERE batter = $1
            GROUP BY match_id
          ) sub
        `, [dbName]);

        // Phase SR
        const phases = await pool.query(`
          SELECT 
            CASE WHEN over_number <= 6 THEN 'pp'
                 WHEN over_number BETWEEN 7 AND 15 THEN 'mid'
                 ELSE 'death' END as phase,
            (SUM(runs_batter)::float / NULLIF(COUNT(delivery_id),0)) * 100 as sr
          FROM deliveries WHERE batter = $1
          GROUP BY 1
        `, [dbName]);

        const phaseMap = {};
        phases.rows.forEach(r => { phaseMap[r.phase] = Math.round(Number(r.sr)); });

        // vs Pace / Spin (use delivery_dimensions if available, fallback mock)
        let vsPace = Math.round(Number(o.sr));
        let vsSpin = Math.round(Number(o.sr));
        try {
          const vsRes = await pool.query(`
            SELECT dd.bowler_pace_or_spin as btype,
                   (SUM(d.runs_batter)::float / NULLIF(COUNT(d.delivery_id),0)) * 100 as sr
            FROM deliveries d
            JOIN delivery_dimensions dd ON d.delivery_id = dd.delivery_id
            WHERE d.batter = $1 AND dd.bowler_pace_or_spin IN ('Pace','Spin')
            GROUP BY dd.bowler_pace_or_spin
          `, [dbName]);
          vsRes.rows.forEach(r => {
            if (r.btype === 'Pace') vsPace = Math.round(Number(r.sr));
            if (r.btype === 'Spin') vsSpin = Math.round(Number(r.sr));
          });
        } catch (e) {
          // delivery_dimensions may not exist, use overall SR as fallback
        }

        const m = milestones.rows[0] || {};
        return {
          country: o.country || "Unknown",
          flag: "",
          role: "BAT",
          sr: Math.round(Number(o.sr)),
          avg: Number(Number(o.avg || 0).toFixed(1)),
          runs: Number(o.runs),
          innings: Number(o.innings),
          fifties: Number(m.fifties || 0),
          centuries: Number(m.centuries || 0),
          phase: { pp: phaseMap.pp || 0, mid: phaseMap.mid || 0, death: phaseMap.death || 0 },
          vs: { pace: vsPace, spin: vsSpin }
        };
      }

      const [stats1, stats2] = await Promise.all([
        getPlayerStats(p1Name),
        getPlayerStats(p2Name)
      ]);

      if (!stats1 || !stats2) {
        return Response.json({ error: 'One or both players not found' }, { status: 404 });
      }

      return Response.json({ p1: { name: p1Name, ...stats1 }, p2: { name: p2Name, ...stats2 } });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('[battle-cards]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
