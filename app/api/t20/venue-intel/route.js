import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const pool = getPool('t20');
    
    // Top 10 venues by match count
    const venueQuery = `
      WITH top_venues AS (
        SELECT venue, MAX(city) as city, COUNT(match_id) as m_count
        FROM matches
        WHERE venue IS NOT NULL
        GROUP BY venue
        ORDER BY m_count DESC
        LIMIT 10
      ),
      match_stats AS (
        SELECT 
          m.match_id, m.venue, m.winner, m.toss_winner, m.toss_decision,
          SUM(CASE WHEN d.inning_number=1 THEN d.runs_total ELSE 0 END) as inn1_runs,
          SUM(CASE WHEN d.inning_number=2 THEN d.runs_total ELSE 0 END) as inn2_runs,
          SUM(CASE WHEN d.runs_batter IN (4, 6) THEN 1 ELSE 0 END) as boundaries
        FROM matches m
        JOIN deliveries d ON m.match_id = d.match_id
        WHERE m.venue IN (SELECT venue FROM top_venues)
        GROUP BY m.match_id, m.venue, m.winner, m.toss_winner, m.toss_decision
      ),
      venue_agg AS (
        SELECT 
          venue,
          COUNT(match_id) as total_matches,
          ROUND(AVG(inn1_runs))::int as avg1st,
          ROUND(AVG(inn2_runs))::int as avg2nd,
          ROUND(AVG(boundaries), 1)::float as avg_boundaries,
          SUM(CASE WHEN (toss_decision='field' AND toss_winner=winner) OR (toss_decision='bat' AND toss_winner!=winner) THEN 1 ELSE 0 END) as chase_wins,
          SUM(CASE WHEN toss_decision='bat' THEN 1 ELSE 0 END) as toss_bat_count
        FROM match_stats
        GROUP BY venue
      )
      SELECT v.venue, t.city, v.total_matches, v.avg1st, v.avg2nd, v.avg_boundaries, v.chase_wins, v.toss_bat_count
      FROM venue_agg v
      JOIN top_venues t ON v.venue = t.venue
      ORDER BY t.m_count DESC;
    `;

    const { rows } = await pool.query(venueQuery);

    const data = rows.map((row) => {
      const tm = Number(row.total_matches);
      const chaseWinPct = tm > 0 ? Math.round((Number(row.chase_wins) / tm) * 100) : 0;
      const tossWinBatPct = tm > 0 ? Math.round((Number(row.toss_bat_count) / tm) * 100) : 0;
      
      // Determine pitch type heuristic based on avg1st
      let pitchType = "Balanced";
      if (row.avg1st > 175) pitchType = "Batting";
      else if (row.avg1st < 145) pitchType = "Pace-friendly"; // rough proxy
      else if (row.avg1st >= 145 && row.avg1st <= 160) pitchType = "Spin-friendly";

      return {
        name: row.venue,
        city: row.city || "Unknown",
        country: "", // Could pull from matches or mock
        avg1st: row.avg1st,
        avg2nd: row.avg2nd,
        chaseWin: chaseWinPct,
        paceAdv: 55, // Mocked for now, requires heavy join with delivery_dimensions
        spinAdv: 45, // Mocked for now
        tossWinBat: tossWinBatPct,
        avgBoundaries: row.avg_boundaries,
        pitchType: pitchType,
        topBatter: "Top Batter", // Mocked to avoid heavy subquery per venue
        topBowler: "Top Bowler", // Mocked
        hostTeam: "Unknown",
        dayNightSplit: { day: 30, night: 70 } // Mocked
      };
    });

    return Response.json({ data });
  } catch (e) {
    console.error('[venue-intel]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
