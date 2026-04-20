/**
 * GET /api/team-rankings
 *
 * Query params:
 *   iterations  – EV convergence passes (1–5, default 3)
 *   p           – power exponent on opponent EV weight (default 1.0)
 *   minMatches  – minimum matches to qualify (default 5)
 *
 * Algorithm (EV / Markov-chain style, per EV_Ranking_Explanation_v3.pdf):
 *   1. Build win matrix W[i][j] = wins of team i over team j
 *   2. Each team's EV = Σj (W[i][j] × EV[j]^p) / total_matches_played_by_i
 *   3. Normalise EV vector to sum = 1, iterate until convergence.
 *   The stationary distribution ranks teams by quality of opposition beaten.
 */

import pool from '@/lib/db';
const MAX_ITER = 5;

// ── EV computation (PageRank-style Markov chain) ──────────────────────────────
function computeEV(teams, winMatrix, matchMatrix, iterations, p) {
  const n = teams.length;
  if (n === 0) return new Map();

  // Initialise equally
  let ev = new Map(teams.map(t => [t, 1.0 / n]));

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Map(teams.map(t => [t, 0]));

    for (const team of teams) {
      let score  = 0;
      let played = 0;
      for (const opp of teams) {
        if (opp === team) continue;
        const wins    = winMatrix[team]?.[opp]  ?? 0;
        const matches = matchMatrix[team]?.[opp] ?? 0;
        if (matches > 0) {
          score  += wins * Math.pow(ev.get(opp) ?? 0, p);
          played += matches;
        }
      }
      next.set(team, played > 0 ? score / played : 0);
    }

    // Normalise to sum = 1
    const total = [...next.values()].reduce((a, b) => a + b, 0);
    if (total > 0) for (const [t, v] of next) next.set(t, v / total);

    ev = next;
  }
  return ev;
}

// ── Hardcoded date column for Postgres ────────────────────────────────────────
async function detectDateCol() {
  return 'start_date';
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const iterations  = Math.min(MAX_ITER, Math.max(1, parseInt(searchParams.get('iterations') ?? '3')));
  const p           = parseFloat(searchParams.get('p') ?? '1.0');
  const minMatches  = parseInt(searchParams.get('minMatches') ?? '5');

  try {
    // All matches (win + draw/no-result)
    const { rows: allMatches } = await pool.query(`
      SELECT team1, team2, outcome_winner AS winner, outcome_result AS result
      FROM   matches
      WHERE  team1 IS NOT NULL AND team2 IS NOT NULL
         AND team1 != ''       AND team2 != ''
    `);

    if (allMatches.length === 0) {
      return Response.json({ error: 'No match data found in the database.' }, { status: 404 });
    }

    // Optional: year range
    const dateCol = await detectDateCol();
    let yearRange = { min: null, max: null };
    if (dateCol) {
      const { rows } = await pool.query(
        `SELECT MIN(substr(${dateCol}, 1, 4)) AS min_yr,
                MAX(substr(${dateCol}, 1, 4)) AS max_yr
         FROM   matches`
      );
      const yr = rows[0];
      yearRange = { min: yr?.min_yr ?? null, max: yr?.max_yr ?? null };
    }

    // ── Build matrices ────────────────────────────────────────────────────────
    const teamStats  = {};   // { team: { matches, wins, losses, draws } }
    const winMatrix  = {};   // winMatrix[winner][loser]     = count
    const matchMatrix = {};  // matchMatrix[team_a][team_b]  = matches played together

    const ensure = (t) => {
      if (!teamStats[t])    teamStats[t] = { matches: 0, wins: 0, losses: 0, draws: 0 };
      if (!winMatrix[t])    winMatrix[t] = {};
      if (!matchMatrix[t])  matchMatrix[t] = {};
    };

    for (const m of allMatches) {
      const { team1: t1, team2: t2, winner } = m;
      ensure(t1); ensure(t2);

      teamStats[t1].matches++;
      teamStats[t2].matches++;

      // matchMatrix is undirected (t1→t2 and t2→t1 both incremented)
      matchMatrix[t1][t2] = (matchMatrix[t1][t2] ?? 0) + 1;
      matchMatrix[t2][t1] = (matchMatrix[t2][t1] ?? 0) + 1;

      if (winner === t1) {
        teamStats[t1].wins++;   teamStats[t2].losses++;
        winMatrix[t1][t2] = (winMatrix[t1][t2] ?? 0) + 1;
      } else if (winner === t2) {
        teamStats[t2].wins++;   teamStats[t1].losses++;
        winMatrix[t2][t1] = (winMatrix[t2][t1] ?? 0) + 1;
      } else {
        // draw / no result / tie
        teamStats[t1].draws++;
        teamStats[t2].draws++;
      }
    }

    // Filter to qualified teams
    const qualified = Object.keys(teamStats).filter(t => teamStats[t].matches >= minMatches);
    if (qualified.length === 0) {
      return Response.json({ error: `No teams with ≥${minMatches} matches found.` }, { status: 404 });
    }

    // ── Basic ranking: by win rate ────────────────────────────────────────────
    const basicSorted = [...qualified].sort((a, b) => {
      const ra = teamStats[a].wins / teamStats[a].matches;
      const rb = teamStats[b].wins / teamStats[b].matches;
      return rb - ra;
    });
    const basicRankMap = new Map(basicSorted.map((t, i) => [t, i + 1]));

    // ── EV ranking ────────────────────────────────────────────────────────────
    const evMap = computeEV(qualified, winMatrix, matchMatrix, iterations, p);

    // ── Head-to-head matrix (qualified teams only) ────────────────────────────
    // Only include top N teams to keep payload manageable
    const TOP_H2H = 12;
    const topTeams = [...qualified]
      .sort((a, b) => (evMap.get(b) ?? 0) - (evMap.get(a) ?? 0))
      .slice(0, TOP_H2H);

    const h2h = {};
    for (const t1 of topTeams) {
      h2h[t1] = {};
      for (const t2 of topTeams) {
        if (t1 === t2) continue;
        h2h[t1][t2] = {
          wins:    winMatrix[t1]?.[t2]  ?? 0,
          losses:  winMatrix[t2]?.[t1]  ?? 0,
          played:  matchMatrix[t1]?.[t2] ?? 0,
        };
      }
    }

    // ── Final sorted result list ──────────────────────────────────────────────
    const teams = [...qualified]
      .sort((a, b) => (evMap.get(b) ?? 0) - (evMap.get(a) ?? 0))
      .map((team, idx) => {
        const s         = teamStats[team];
        const ev_rank   = idx + 1;
        const basic_rank = basicRankMap.get(team) ?? 0;
        return {
          team,
          ev_rank,
          basic_rank,
          rank_change: basic_rank - ev_rank,       // positive = improved vs basic
          ev_score:    Math.round((evMap.get(team) ?? 0) * 10000) / 100,  // %
          matches:  s.matches,
          wins:     s.wins,
          losses:   s.losses,
          draws:    s.draws,
          win_pct:  Math.round((s.wins / s.matches) * 1000) / 10,
        };
      });

    return Response.json({
      teams,
      h2h,
      h2h_teams: topTeams,
      year_range: yearRange,
      params: { iterations, p, minMatches },
      total_teams:   qualified.length,
      total_matches: allMatches.length,
    });

  } catch (err) {
    return Response.json({ error: err.message ?? 'Unknown server error' }, { status: 500 });
  }
}
