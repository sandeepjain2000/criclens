import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const pool = getPool('t20');

    // Fetch top 10 players by runs to show as clickable pills
    const topPlayersQuery = `
      SELECT COALESCE(pp.full_name, d.batter) as name, SUM(d.runs_batter) as total_runs
      FROM deliveries d
      LEFT JOIN player_profiles pp ON d.batter = pp.player_name
      WHERE d.batter IS NOT NULL
      GROUP BY d.batter, pp.full_name
      ORDER BY total_runs DESC
      LIMIT 10;
    `;

    // Fetch all eligible players for the search autocomplete
    // We only want players with at least some data so the search isn't bloated with 1-match wonders.
    // > 5 matches is a good threshold
    const allPlayersQuery = `
      SELECT COALESCE(pp.full_name, d.batter) as name
      FROM deliveries d
      LEFT JOIN player_profiles pp ON d.batter = pp.player_name
      WHERE d.batter IS NOT NULL
      GROUP BY d.batter, pp.full_name
      HAVING COUNT(DISTINCT d.match_id) >= 5
      ORDER BY name ASC;
    `;

    const [topRes, allRes] = await Promise.all([
      pool.query(topPlayersQuery),
      pool.query(allPlayersQuery)
    ]);

    return Response.json({
      topPlayers: topRes.rows.map(r => r.name),
      allPlayers: allRes.rows.map(r => r.name)
    });
  } catch (e) {
    console.error('[form-tracker-init]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
