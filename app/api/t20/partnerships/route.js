import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const pool = getPool('t20');

    // 1. Top Partnerships
    const pairQuery = `
      WITH pair_match_stats AS (
        SELECT 
          d.match_id, 
          d.inning_number,
          LEAST(d.batter, d.non_striker) as p1,
          GREATEST(d.batter, d.non_striker) as p2,
          MAX(mp1.team) as team,
          SUM(d.runs_total) as runs,
          COUNT(d.delivery_id) as balls,
          MAX(CASE WHEN d.over_number <= 6 THEN 'Powerplay'
                   WHEN d.over_number BETWEEN 7 AND 15 THEN 'Middle'
                   ELSE 'Death' END) as phase_hint,
          MAX(m.winner) as winner
        FROM deliveries d
        JOIN matches m ON d.match_id = m.match_id
        LEFT JOIN match_players mp1 ON d.batter = mp1.player_name AND d.match_id = mp1.match_id
        WHERE d.batter IS NOT NULL AND d.non_striker IS NOT NULL
        GROUP BY d.match_id, d.inning_number, LEAST(d.batter, d.non_striker), GREATEST(d.batter, d.non_striker)
      ),
      pair_agg AS (
        SELECT 
          COALESCE(pp1.full_name, p1) as p1_full, 
          COALESCE(pp2.full_name, p2) as p2_full, 
          MAX(team) as team,
          COUNT(match_id) as innings,
          SUM(runs) as total_runs,
          SUM(balls) as total_balls,
          MAX(runs) as highest,
          (SUM(runs)::float / NULLIF(COUNT(match_id),0)) as avg,
          (SUM(runs)::float / NULLIF(SUM(balls),0))*100 as sr,
          MAX(phase_hint) as phase,
          SUM(CASE WHEN winner = team THEN 1 ELSE 0 END)::float / NULLIF(COUNT(match_id),0) * 100 as winRate
        FROM pair_match_stats
        LEFT JOIN player_profiles pp1 ON pair_match_stats.p1 = pp1.player_name
        LEFT JOIN player_profiles pp2 ON pair_match_stats.p2 = pp2.player_name
        GROUP BY p1, p2, pp1.full_name, pp2.full_name
        HAVING COUNT(match_id) >= 5 AND SUM(runs) > 200
      )
      SELECT * FROM pair_agg ORDER BY total_runs DESC LIMIT 30;
    `;

    // 2. Phase Data
    const phaseQuery = `
      WITH phase_partnerships AS (
        SELECT 
          CASE WHEN over_number <= 6 THEN 'Powerplay'
               WHEN over_number BETWEEN 7 AND 15 THEN 'Middle'
               ELSE 'Death' END as phase,
          match_id,
          LEAST(batter, non_striker) as p1,
          GREATEST(batter, non_striker) as p2,
          SUM(runs_total) as runs,
          COUNT(delivery_id) as balls,
          MAX(CASE WHEN m.winner = mp1.team THEN 1 ELSE 0 END) as is_win
        FROM deliveries d
        JOIN matches m ON d.match_id = m.match_id
        LEFT JOIN match_players mp1 ON d.batter = mp1.player_name AND d.match_id = mp1.match_id
        GROUP BY 1, match_id, 3, 4
      )
      SELECT 
        phase,
        AVG(runs) as avgRuns,
        (SUM(runs)::float / NULLIF(SUM(balls),0))*100 as avgSR,
        (SUM(CASE WHEN runs >= 50 AND is_win = 1 THEN 1 ELSE 0 END)::float / NULLIF(SUM(CASE WHEN runs >= 50 THEN 1 ELSE 0 END),0))*100 as winImpact
      FROM phase_partnerships
      GROUP BY phase;
    `;

    // 3. Team Pairs
    const teamPairsQuery = `
      WITH pair_match_stats AS (
        SELECT 
          MAX(mp1.team) as team,
          LEAST(d.batter, d.non_striker) as p1,
          GREATEST(d.batter, d.non_striker) as p2,
          SUM(d.runs_total) as runs,
          COUNT(DISTINCT d.match_id) as innings
        FROM deliveries d
        LEFT JOIN match_players mp1 ON d.batter = mp1.player_name AND d.match_id = mp1.match_id
        WHERE d.batter IS NOT NULL AND d.non_striker IS NOT NULL AND mp1.team IS NOT NULL
        GROUP BY LEAST(d.batter, d.non_striker), GREATEST(d.batter, d.non_striker)
        HAVING COUNT(DISTINCT d.match_id) >= 5
      ),
      ranked_pairs AS (
        SELECT 
          team,
          COALESCE(pp1.full_name, p1) || '-' || COALESCE(pp2.full_name, p2) as topPair,
          (runs::float / innings) as avgPartnership,
          ROW_NUMBER() OVER(PARTITION BY team ORDER BY runs DESC) as rn
        FROM pair_match_stats
        LEFT JOIN player_profiles pp1 ON pair_match_stats.p1 = pp1.player_name
        LEFT JOIN player_profiles pp2 ON pair_match_stats.p2 = pp2.player_name
      ),
      team_counts AS (
        SELECT team, COUNT(*) as pairsUsed
        FROM pair_match_stats
        GROUP BY team
      )
      SELECT r.team, r.topPair, r.avgPartnership, t.pairsUsed
      FROM ranked_pairs r
      JOIN team_counts t ON r.team = t.team
      WHERE r.rn = 1
      ORDER BY r.avgPartnership DESC
      LIMIT 10;
    `;

    const [pairRes, phaseRes, teamRes] = await Promise.all([
      pool.query(pairQuery),
      pool.query(phaseQuery),
      pool.query(teamPairsQuery)
    ]);

    const partnerships = pairRes.rows.map(r => ({
      p1: r.p1_full,
      p2: r.p2_full,
      team: r.team || "Unknown",
      runs: Number(r.total_runs),
      innings: Number(r.innings),
      avg: Number(Number(r.avg).toFixed(1)),
      highest: Number(r.highest),
      sr: Math.round(Number(r.sr)),
      phase: r.phase || "Any",
      winRate: Math.round(Number(r.winrate)) || 0
    }));

    const phaseData = phaseRes.rows.map(r => ({
      phase: r.phase,
      avgRuns: Math.round(Number(r.avgruns)),
      avgSR: Math.round(Number(r.avgsr)),
      winImpact: Math.round(Number(r.winimpact)) || 0
    }));

    // Reorder phase data for UI
    const phaseOrder = { 'Powerplay': 1, 'Middle': 2, 'Death': 3 };
    phaseData.sort((a,b) => (phaseOrder[a.phase]||0) - (phaseOrder[b.phase]||0));

    const teamPairs = teamRes.rows.map(r => ({
      team: r.team,
      topPair: r.toppair.replace(/ /g, ''), // Quick format
      avgPartnership: Math.round(Number(r.avgpartnership)),
      pairsUsed: Number(r.pairsused)
    }));

    return Response.json({ partnerships, phaseData, teamPairs });
  } catch (e) {
    console.error('[partnerships]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
