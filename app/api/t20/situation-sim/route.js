import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const pool = getPool('t20');

    // To prevent sending thousands of players, we'll limit to those with at least 20 total innings
    const query = `
      WITH valid_batters AS (
        SELECT batter
        FROM deliveries
        GROUP BY batter
        HAVING COUNT(DISTINCT match_id) >= 20
      ),
      phase_stats AS (
        SELECT 
          d.batter,
          CASE 
            WHEN d.over_number <= 6 THEN 'powerplayProfile'
            WHEN d.over_number BETWEEN 7 AND 15 THEN 'chaseProfile' -- middle
            ELSE 'deathProfile'
          END as phase,
          d.match_id,
          SUM(d.runs_batter) as runs,
          COUNT(d.delivery_id) as balls,
          MAX(CASE WHEN d.inning_number = 2 THEN 1 ELSE 0 END) as is_chase
        FROM deliveries d
        JOIN valid_batters vb ON d.batter = vb.batter
        GROUP BY d.batter, 
          CASE 
            WHEN d.over_number <= 6 THEN 'powerplayProfile'
            WHEN d.over_number BETWEEN 7 AND 15 THEN 'chaseProfile'
            ELSE 'deathProfile'
          END,
          d.match_id
      ),
      phase_agg AS (
        SELECT 
          batter,
          phase,
          COUNT(match_id) as innings,
          SUM(runs) as total_runs,
          SUM(balls) as total_balls,
          AVG(runs) as avg_runs,
          (SUM(runs)::float / NULLIF(SUM(balls), 0)) * 100 as sr,
          (SUM(CASE WHEN runs >= 15 AND (runs::float/NULLIF(balls,0))*100 >= 130 THEN 1 ELSE 0 END)::float / COUNT(match_id)) * 100 as successRate
        FROM phase_stats
        GROUP BY batter, phase
      ),
      pressure_stats AS (
        SELECT 
          batter,
          AVG(runs) as chase_avg,
          (SUM(runs)::float / NULLIF(SUM(balls), 0)) * 100 as chase_sr
        FROM phase_stats
        WHERE is_chase = 1
        GROUP BY batter
      )
      SELECT 
        COALESCE(pp.full_name, p.batter) as name,
        MAX(mp.team) as country,
        'BAT' as role, 
        json_object_agg(p.phase, json_build_object(
          'sr', ROUND(p.sr),
          'avgRuns', ROUND(p.avg_runs, 1),
          'successRate', ROUND(p.successRate)
        )) as profiles,
        ROUND(MAX(pr.chase_sr * 0.5 + pr.chase_avg * 0.5)) as highPressureRating
      FROM phase_agg p
      LEFT JOIN pressure_stats pr ON p.batter = pr.batter
      LEFT JOIN match_players mp ON p.batter = mp.player_name
      LEFT JOIN player_profiles pp ON p.batter = pp.player_name
      GROUP BY p.batter, pp.full_name
      HAVING json_object_agg(p.phase, '1') ? 'powerplayProfile' 
         AND json_object_agg(p.phase, '1') ? 'chaseProfile' 
         AND json_object_agg(p.phase, '1') ? 'deathProfile'
    `;

    const { rows } = await pool.query(query);

    const data = rows.map(r => ({
      name: r.name,
      country: r.country || "Unknown",
      role: r.role,
      chaseProfile: r.profiles.chaseProfile,
      powerplayProfile: r.profiles.powerplayProfile,
      deathProfile: r.profiles.deathProfile,
      highPressureRating: Number(r.highpressurerating) || 80
    }));

    return Response.json({ data });
  } catch (e) {
    console.error('[situation-sim]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
