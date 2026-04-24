import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const player = searchParams.get('player');
  const limit = parseInt(searchParams.get('limit')) || 20;

  if (!player) {
    return Response.json({ error: 'Player name is required' }, { status: 400 });
  }

  try {
    const pool = getPool('t20');
    
    // We get the player's team from match_players or infer it from the match
    // To properly determine "vs" and "result" (W/L), we need the player's team.
    // A quick way is to check match_players table for this player in this match.
    const query = `
      SELECT 
        d.match_id,
        MAX(m.start_date) as start_date,
        MAX(m.team1) as team1,
        MAX(m.team2) as team2,
        MAX(m.winner) as winner,
        MAX(mp.team) as player_team,
        SUM(d.runs_batter)::int as runs,
        COUNT(d.delivery_id)::int as balls,
        SUM(CASE WHEN d.runs_batter = 4 THEN 1 ELSE 0 END)::int as fours,
        SUM(CASE WHEN d.runs_batter = 6 THEN 1 ELSE 0 END)::int as sixes
      FROM deliveries d
      JOIN matches m ON d.match_id = m.match_id
      LEFT JOIN match_players mp ON mp.match_id = d.match_id AND mp.player_name = $1
      WHERE d.batter = $1
      GROUP BY d.match_id
      ORDER BY start_date ASC
    `;
    
    // Note: ORDER BY ASC to return oldest to newest if we want to mimic the UI behavior 
    // where we slice the last N matches, but actually it's better to fetch DESC, limit, then reverse.
    const limitedQuery = `
      WITH recent_matches AS (
        SELECT 
          d.match_id,
          MAX(m.start_date) as start_date,
          MAX(m.team1) as team1,
          MAX(m.team2) as team2,
          MAX(m.winner) as winner,
          MAX(mp.team) as player_team,
          SUM(d.runs_batter)::int as runs,
          COUNT(d.delivery_id)::int as balls,
          SUM(CASE WHEN d.runs_batter = 4 THEN 1 ELSE 0 END)::int as fours,
          SUM(CASE WHEN d.runs_batter = 6 THEN 1 ELSE 0 END)::int as sixes
        FROM deliveries d
        JOIN matches m ON d.match_id = m.match_id
        LEFT JOIN match_players mp ON mp.match_id = d.match_id AND mp.player_name = d.batter
        WHERE d.batter = (SELECT COALESCE((SELECT player_name FROM player_profiles WHERE full_name = $1 LIMIT 1), $1))
        GROUP BY d.match_id
        ORDER BY start_date DESC
        LIMIT $2
      )
      SELECT * FROM recent_matches ORDER BY start_date ASC;
    `;

    const { rows } = await pool.query(limitedQuery, [player, limit]);

    const data = rows.map((row, index) => {
      // Determine opposition
      const opp = row.team1 === row.player_team ? row.team2 : row.team1;
      
      // Determine Win/Loss
      let result = '-';
      if (row.winner) {
        result = row.winner === row.player_team ? 'W' : 'L';
      }

      // Strike rate
      const sr = row.balls > 0 ? Math.round((row.runs / row.balls) * 100) : 0;

      return {
        m: index + 1,
        match_id: row.match_id,
        vs: "vs " + (opp || 'Unknown'),
        runs: row.runs,
        balls: row.balls,
        sr: sr,
        fours: row.fours,
        sixes: row.sixes,
        result: result,
        start_date: row.start_date
      };
    });

    return Response.json({ data });
  } catch (e) {
    console.error('[form-tracker]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
