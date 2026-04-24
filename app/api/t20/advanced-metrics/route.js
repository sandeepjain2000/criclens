import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const pool = getPool('t20');

    // Fetch Batters
    const batterQuery = `
      WITH batter_match AS (
        SELECT batter, match_id, 
               SUM(runs_batter) as runs,
               COUNT(delivery_id) as balls,
               SUM(CASE WHEN runs_batter IN (4, 6) THEN 1 ELSE 0 END) as boundaries,
               SUM(CASE WHEN runs_batter = 0 THEN 1 ELSE 0 END) as dots
        FROM deliveries
        WHERE batter IS NOT NULL
        GROUP BY batter, match_id
      ),
      batter_agg AS (
        SELECT COALESCE(pp.full_name, b.batter) as name,
               MAX(mp.team) as country,
               COUNT(b.match_id) as innings,
               SUM(b.runs) as total_runs,
               SUM(b.balls) as total_balls,
               SUM(b.boundaries) as total_boundaries,
               SUM(b.dots) as total_dots,
               AVG(b.runs) as avg_runs,
               COALESCE(STDDEV(b.runs), 0) as stddev_runs,
               (SUM(b.runs)::float / NULLIF(SUM(b.balls), 0)) * 100 as strike_rate
        FROM batter_match b
        LEFT JOIN match_players mp ON b.batter = mp.player_name AND b.match_id = mp.match_id
        LEFT JOIN player_profiles pp ON b.batter = pp.player_name
        GROUP BY b.batter, pp.full_name
        HAVING COUNT(b.match_id) >= 15 AND SUM(b.balls) > 100
      )
      SELECT * FROM batter_agg ORDER BY avg_runs DESC LIMIT 20;
    `;

    const bowlerQuery = `
      WITH bowler_match AS (
        SELECT bowler, match_id, 
               SUM(runs_total) as runs_conceded,
               COUNT(delivery_id) as balls,
               SUM(CASE WHEN runs_batter IN (4, 6) THEN 1 ELSE 0 END) as boundaries,
               SUM(CASE WHEN runs_batter = 0 AND runs_extras = 0 THEN 1 ELSE 0 END) as dots,
               SUM(CASE WHEN wicket_player_out IS NOT NULL THEN 1 ELSE 0 END) as wickets
        FROM deliveries
        WHERE bowler IS NOT NULL
        GROUP BY bowler, match_id
      ),
      bowler_agg AS (
        SELECT COALESCE(pp.full_name, b.bowler) as name,
               MAX(mp.team) as country,
               COUNT(b.match_id) as innings,
               SUM(b.runs_conceded) as total_runs,
               SUM(b.balls) as total_balls,
               SUM(b.wickets) as total_wickets,
               SUM(b.boundaries) as total_boundaries,
               SUM(b.dots) as total_dots,
               (SUM(b.runs_conceded)::float / NULLIF(SUM(b.balls), 0)) * 6 as economy,
               COALESCE(STDDEV(b.runs_conceded), 0) as stddev_runs
        FROM bowler_match b
        LEFT JOIN match_players mp ON b.bowler = mp.player_name AND b.match_id = mp.match_id
        LEFT JOIN player_profiles pp ON b.bowler = pp.player_name
        GROUP BY b.bowler, pp.full_name
        HAVING COUNT(b.match_id) >= 15 AND SUM(b.balls) > 100
      )
      SELECT * FROM bowler_agg ORDER BY total_wickets DESC LIMIT 20;
    `;

    const [batterRes, bowlerRes] = await Promise.all([
      pool.query(batterQuery),
      pool.query(bowlerQuery)
    ]);

    const batters = batterRes.rows.map(r => {
      const tb = Number(r.total_balls);
      const sr = Number(r.strike_rate) || 0;
      const cv = (Number(r.stddev_runs) / Number(r.avg_runs)) || 1; 
      
      return {
        name: r.name,
        country: r.country || "Unknown",
        xRuns: Number(r.avg_runs), // approx
        pressureIdx: Math.round((sr / 130) * 100), 
        consistency: Math.round(Math.max(0, 100 - (cv * 40))), 
        impactPerBall: Number((Number(r.total_runs) / tb) - 1.25), 
        boundaryCat: Math.round((Number(r.total_boundaries) / tb) * 100),
        dotPct: Math.round((Number(r.total_dots) / tb) * 100)
      };
    });

    const bowlers = bowlerRes.rows.map(r => {
      const tb = Number(r.total_balls);
      const eco = Number(r.economy) || 0;
      
      return {
        name: r.name,
        country: r.country || "Unknown",
        xRuns: Number(-(eco - 8.0) * 4), 
        pressureIdx: Math.round((7.5 / eco) * 100),
        consistency: Math.round(Math.max(0, 100 - Number(r.stddev_runs))), 
        impactPerBall: Number((Number(r.total_wickets) / tb) * 10), 
        boundaryCat: Math.round((Number(r.total_boundaries) / tb) * 100),
        dotPct: Math.round((Number(r.total_dots) / tb) * 100)
      };
    });

    return Response.json({ batters, bowlers });
  } catch (e) {
    console.error('[advanced-metrics]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
