import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Allowlisted filter values — never passed raw from user input to SQL
const ALLOWED = {
  phase:           new Set(['All', 'Powerplay', 'Middle', 'Death']),
  paceOrSpin:      new Set(['All', 'Pace', 'Spin']),
  bowlerSubtype:   new Set(['All', 'Pure Pace', 'Swing', 'Seam', 'Fast-medium', 'Off-spin', 'Leg-spin', 'Left-arm orthodox', 'Chinaman']),
  bowlerRank:      new Set(['All', 'Rank 1', 'Top 2', 'Top 3', 'Rank 4+']),
  inningsRole:     new Set(['All', 'Batting First', 'Batting Second']),
  venueContext:    new Set(['All', 'Home', 'Away', 'Neutral']),
  competitionType: new Set(['All', 'Bilateral', 'Tournament', 'Domestic']),
  matchStage:      new Set(['All', 'Group', 'Super 4', 'Super 8', 'Qualifier', 'Semi-final', 'Final']),
};

function safe(val, key) {
  return ALLOWED[key]?.has(val) ? val : 'All';
}

function buildFilterClauses(filters) {
  // Returns array of SQL fragments referencing the dd alias
  const clauses = [];
  if (filters.phase           !== 'All') clauses.push(`dd.over_phase                 = '${filters.phase}'`);
  if (filters.paceOrSpin      !== 'All') clauses.push(`dd.bowler_pace_or_spin        = '${filters.paceOrSpin}'`);
  if (filters.bowlerSubtype   !== 'All') clauses.push(`dd.bowler_bowling_subtype     = '${filters.bowlerSubtype}'`);
  if (filters.bowlerRank      !== 'All') {
    if      (filters.bowlerRank === 'Rank 1') clauses.push(`dd.bowler_match_rank = 1`);
    else if (filters.bowlerRank === 'Top 2')  clauses.push(`dd.bowler_match_rank <= 2`);
    else if (filters.bowlerRank === 'Top 3')  clauses.push(`dd.bowler_match_rank <= 3`);
    else if (filters.bowlerRank === 'Rank 4+') clauses.push(`(dd.bowler_match_rank >= 4 OR dd.bowler_match_rank IS NULL)`);
  }
  if (filters.inningsRole     !== 'All') clauses.push(`dd.innings_role               = '${filters.inningsRole}'`);
  if (filters.venueContext    !== 'All') clauses.push(`dd.venue_context              = '${filters.venueContext}'`);
  if (filters.competitionType !== 'All') clauses.push(`dd.competition_type           = '${filters.competitionType}'`);
  if (filters.matchStage      !== 'All') clauses.push(`dd.match_stage                = '${filters.matchStage}'`);
  return clauses;
}

function calcAvg(runs, dismissals) {
  if (dismissals === 0) return runs > 0 ? '∞' : '-';
  return (runs / dismissals).toFixed(2);
}

function calcSR(runs, balls) {
  if (!balls) return '-';
  return ((runs / balls) * 100).toFixed(1);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'stats';
  const pool   = getPool('t20');

  // ── SEARCH: autocomplete player names from deliveries table ──────────────
  if (action === 'search') {
    const q = (searchParams.get('q') || '').trim();
    if (q.length < 2) return Response.json({ players: [] });

    try {
      const result = await pool.query(
        `SELECT DISTINCT batter AS name
         FROM deliveries
         WHERE LOWER(batter) LIKE LOWER($1)
         ORDER BY batter
         LIMIT 25`,
        [`%${q}%`]
      );
      return Response.json({ players: result.rows.map(r => r.name) });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  // ── STATS: return overall + filtered stats for each player ────────────────
  const playersParam = searchParams.get('players') || '';
  const players = playersParam.split(',').map(p => p.trim()).filter(Boolean);
  if (!players.length) return Response.json({ data: [] });

  const filters = {
    phase:           safe(searchParams.get('phase'),           'phase'),
    paceOrSpin:      safe(searchParams.get('paceOrSpin'),      'paceOrSpin'),
    bowlerSubtype:   safe(searchParams.get('bowlerSubtype'),   'bowlerSubtype'),
    bowlerRank:      safe(searchParams.get('bowlerRank'),      'bowlerRank'),
    inningsRole:     safe(searchParams.get('inningsRole'),     'inningsRole'),
    venueContext:    safe(searchParams.get('venueContext'),     'venueContext'),
    competitionType: safe(searchParams.get('competitionType'), 'competitionType'),
    matchStage:      safe(searchParams.get('matchStage'),      'matchStage'),
  };

  const filterClauses = buildFilterClauses(filters);
  const hasFilter     = filterClauses.length > 0;
  const filterWhere   = hasFilter ? 'AND ' + filterClauses.join(' AND ') : '';

  try {
    const data = [];

    for (const player of players) {
      // ── Overall stats (no dimension filter) ────────────────────────────
      const oRes = await pool.query(
        `SELECT
           COUNT(DISTINCT match_id || '_' || inning_number::text)::int  AS innings,
           COALESCE(SUM(runs_batter), 0)::int                           AS runs,
           COUNT(delivery_id)::int                                      AS balls,
           COUNT(CASE WHEN wicket_player_out = $1 THEN 1 END)::int      AS dismissals
         FROM deliveries
         WHERE batter = $1`,
        [player]
      );

      // ── Filtered stats (joined with delivery_dimensions) ───────────────
      let fRes, filteredDeliveries = 0;
      if (hasFilter) {
        fRes = await pool.query(
          `SELECT
             COUNT(DISTINCT d.match_id || '_' || d.inning_number::text)::int  AS innings,
             COALESCE(SUM(d.runs_batter), 0)::int                             AS runs,
             COUNT(d.delivery_id)::int                                        AS balls,
             COUNT(CASE WHEN d.wicket_player_out = $1 THEN 1 END)::int        AS dismissals
           FROM deliveries d
           JOIN delivery_dimensions dd ON dd.delivery_id = d.delivery_id
           WHERE d.batter = $1 ${filterWhere}`,
          [player]
        );
        filteredDeliveries = fRes.rows[0].balls;
      } else {
        fRes = oRes;
        filteredDeliveries = oRes.rows[0].balls;
      }

      const o = oRes.rows[0];
      const f = fRes.rows[0];

      // ── Career analytics from pre-computed table ──────────────────────
      const cRes = await pool.query(
        `SELECT dot_ball_pct, boundary_pct, balls_per_boundary,
                avg_contribution_team, avg_contribution_match,
                consistency, runs_in_wins, runs_in_losses, win_contribution_pct
         FROM batter_career_stats
         WHERE batter = $1`,
        [player]
      );
      const c = cRes.rows[0] || {};

      data.push({
        name: player,
        overall: {
          innings:    o.innings,
          runs:       o.runs,
          balls:      o.balls,
          dismissals: o.dismissals,
          avg:        calcAvg(o.runs, o.dismissals),
          sr:         calcSR(o.runs, o.balls),
        },
        filtered: {
          innings:    f.innings,
          runs:       f.runs,
          balls:      f.balls,
          dismissals: f.dismissals,
          avg:        calcAvg(f.runs, f.dismissals),
          sr:         calcSR(f.runs, f.balls),
        },
        career: {
          dotPct:          c.dot_ball_pct        != null ? Number(c.dot_ball_pct).toFixed(1)        : '-',
          boundaryPct:     c.boundary_pct        != null ? Number(c.boundary_pct).toFixed(1)        : '-',
          ballsPerBdry:    c.balls_per_boundary  != null ? Number(c.balls_per_boundary).toFixed(1)  : '-',
          contribTeam:     c.avg_contribution_team  != null ? Number(c.avg_contribution_team).toFixed(1)  : '-',
          contribMatch:    c.avg_contribution_match != null ? Number(c.avg_contribution_match).toFixed(1) : '-',
          consistency:     c.consistency         != null ? Number(c.consistency).toFixed(2)         : '-',
          runsInWins:      c.runs_in_wins        ?? '-',
          runsInLosses:    c.runs_in_losses      ?? '-',
          winContribPct:   c.win_contribution_pct != null ? Number(c.win_contribution_pct).toFixed(1) : '-',
        },
      });
    }

    return Response.json({ data, filters });
  } catch (e) {
    console.error('[slice-dice-t20]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
