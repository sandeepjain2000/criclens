/**
 * GET  /api/team-selector?format=t20i|odi|test&status=Active&role=...&country=...&search=...
 *   → Browse/filter player pool
 *
 * POST /api/team-selector
 *   Body: { format, country, requirements: { batsmen, wk, allRounders, paceBowlers, spinBowlers } }
 *   → Auto-select best XI by ranking within each role bucket
 *
 * player_profiles lives in SUPABASE_URL_T20.
 * Performance ranking is computed from the format-appropriate deliveries table.
 */

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// player_profiles column that holds the relevant status
const FORMAT_STATUS_COL = {
  t20i: 'intl_t20i_status',
  odi:  'intl_odi_status',
  test: 'intl_test_status',
};

// Which pool holds deliveries for each format
const FORMAT_POOL = {
  t20i: 't20',
  odi:  'loi',
  test: 'test',
};

// Keywords that classify bowling_type as pace or spin
const PACE_KEYWORDS  = ['fast', 'medium', 'seam', 'swing', 'pace'];
const SPIN_KEYWORDS  = ['spin', 'break', 'orthodox', 'wrist', 'googly', 'doosra', 'carrom', 'flick'];

function isPace(bowlingType = '') {
  const bt = bowlingType.toLowerCase();
  return PACE_KEYWORDS.some(k => bt.includes(k));
}
function isSpin(bowlingType = '') {
  const bt = bowlingType.toLowerCase();
  return SPIN_KEYWORDS.some(k => bt.includes(k));
}

// ─── GET: browse / filter player pool ────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format   = (searchParams.get('format')  || 't20i').toLowerCase();
  const roles    = searchParams.get('role');
  const country  = searchParams.get('country');
  const search   = searchParams.get('search');
  const statuses = searchParams.get('status') || 'Active';

  const statusCol = FORMAT_STATUS_COL[format];
  if (!statusCol) return NextResponse.json({ error: `Unknown format '${format}'` }, { status: 400 });

  try {
    const pool = getPool('t20');
    const conditions = [`${statusCol} IS NOT NULL`];
    const params = [];
    let p = 1;

    const statusList = statuses.split(',').map(s => s.trim()).filter(Boolean);
    if (statusList.length === 1) {
      conditions.push(`${statusCol} = $${p++}`); params.push(statusList[0]);
    } else if (statusList.length > 1) {
      conditions.push(`${statusCol} IN (${statusList.map(() => `$${p++}`).join(',')})`);
      params.push(...statusList);
    }

    if (roles) {
      const roleList = roles.split(',').map(r => r.trim().toUpperCase()).filter(Boolean);
      if (roleList.length === 1) { conditions.push(`playing_role = $${p++}`); params.push(roleList[0]); }
      else { conditions.push(`playing_role IN (${roleList.map(() => `$${p++}`).join(',')})`); params.push(...roleList); }
    }

    if (country) { conditions.push(`LOWER(COALESCE(nationality,'')) = LOWER($${p++})`); params.push(country); }
    if (search?.length > 1) { conditions.push(`LOWER(player_name) LIKE $${p++}`); params.push(`%${search.toLowerCase()}%`); }

    const { rows } = await pool.query(`
      SELECT player_name,
             COALESCE(nationality,'')   AS nationality,
             COALESCE(playing_role,'')  AS playing_role,
             COALESCE(batting_style,'') AS batting_style,
             COALESCE(bowling_style,'') AS bowling_style,
             COALESCE(bowling_type,'')  AS bowling_type,
             intl_t20i_status, intl_odi_status, intl_test_status,
             intl_t20i_last_year, intl_odi_last_year, intl_test_last_year,
             intl_available, intl_retired_all, intl_status_notes
      FROM player_profiles
      WHERE ${conditions.join(' AND ')}
      ORDER BY nationality ASC, playing_role ASC, player_name ASC
    `, params);

    const { rows: countryRows } = await pool.query(`
      SELECT DISTINCT COALESCE(nationality,'') AS nationality
      FROM player_profiles
      WHERE ${statusCol} IS NOT NULL
        AND ${statusCol} NOT IN ('Never Played','Unknown')
        AND nationality IS NOT NULL AND nationality <> ''
      ORDER BY nationality ASC
    `);

    return NextResponse.json({ players: rows, countries: countryRows.map(r => r.nationality), format, total: rows.length });

  } catch (err) {
    console.error('team-selector GET error:', err);
    return NextResponse.json({ error: true, message: err.message }, { status: 500 });
  }
}

// ─── POST: auto-select XI by ranking ─────────────────────────────────────────

export async function POST(request) {
  const body = await request.json();
  const format   = (body.format  || 't20i').toLowerCase();
  const country  = body.country  || null;
  const req      = body.requirements || {};

  const batsmen     = parseInt(req.batsmen     ?? 4, 10);
  const wk          = parseInt(req.wk          ?? 1, 10);
  const allRounders = parseInt(req.allRounders ?? 2, 10);
  const paceBowlers = parseInt(req.paceBowlers ?? 2, 10);
  const spinBowlers = parseInt(req.spinBowlers ?? 2, 10);

  const total = batsmen + wk + allRounders + paceBowlers + spinBowlers;
  if (total !== 11) {
    return NextResponse.json({ error: `Requirements must sum to 11 (got ${total})` }, { status: 400 });
  }

  const statusCol   = FORMAT_STATUS_COL[format];
  const perfFormat  = FORMAT_POOL[format] || 't20';  // which DB to use for deliveries ranking

  try {
    const profilePool = getPool('t20');    // always — player_profiles lives here
    const perfPool    = getPool(perfFormat); // deliveries for the right format

    // ── 1. Load active players from player_profiles ───────────────────────────
    const countryClause = country ? `AND LOWER(COALESCE(nationality,'')) = LOWER($1)` : '';
    const profileParams = country ? [country] : [];

    const { rows: allProfiles } = await profilePool.query(`
      SELECT player_name,
             COALESCE(nationality,'')   AS nationality,
             COALESCE(playing_role,'')  AS playing_role,
             COALESCE(batting_style,'') AS batting_style,
             COALESCE(bowling_style,'') AS bowling_style,
             COALESCE(bowling_type,'')  AS bowling_type,
             intl_t20i_status, intl_odi_status, intl_test_status
      FROM player_profiles
      WHERE ${statusCol} = 'Active'
        AND intl_available = TRUE
        ${countryClause}
    `, profileParams);

    if (allProfiles.length === 0) {
      return NextResponse.json({ error: 'No active players found. Run enrich_player_intl_status.py first.' }, { status: 404 });
    }

    const playerNames = allProfiles.map(p => p.player_name);
    const profileMap  = new Map(allProfiles.map(p => [p.player_name, p]));

    // ── 2. Fetch batting ranking from deliveries ──────────────────────────────
    const WICKET_EXCLUDE = `('run out','retired hurt','retired out','obstructing the field','handled the ball','timed out')`;

    const { rows: batRanking } = await perfPool.query(`
      SELECT
        batter                                                                  AS player_name,
        COUNT(DISTINCT match_id || '_' || inning_number)::int                   AS innings,
        SUM(runs_batter)::int                                                   AS total_runs,
        ROUND(SUM(runs_batter)::numeric /
          NULLIF(COUNT(DISTINCT match_id || '_' || inning_number), 0), 2)       AS bat_avg,
        ROUND(SUM(runs_batter) * 100.0 / NULLIF(COUNT(*), 0), 2)               AS bat_sr
      FROM deliveries
      WHERE batter = ANY($1)
      GROUP BY batter
      HAVING COUNT(DISTINCT match_id || '_' || inning_number) >= 5
      ORDER BY bat_avg DESC
    `, [playerNames]);

    // ── 3. Fetch bowling ranking from deliveries ──────────────────────────────
    const { rows: bowlRanking } = await perfPool.query(`
      SELECT
        bowler                                                                  AS player_name,
        COUNT(DISTINCT match_id || '_' || inning_number)::int                  AS bowl_innings,
        COUNT(*) FILTER (WHERE wicket_kind NOT IN ${WICKET_EXCLUDE}
                           AND wicket_player_out IS NOT NULL)::int             AS wickets,
        ROUND(SUM(runs_off_bat + extras) * 6.0 /
          NULLIF(COUNT(*), 0), 2)                                              AS economy
      FROM deliveries
      WHERE bowler = ANY($1)
      GROUP BY bowler
      HAVING COUNT(DISTINCT match_id || '_' || inning_number) >= 3
      ORDER BY economy ASC
    `, [playerNames]);

    const batMap  = new Map(batRanking.map(r  => [r.player_name, r]));
    const bowlMap = new Map(bowlRanking.map(r => [r.player_name, r]));

    // ── 4. Score each player in each role bucket ──────────────────────────────
    function batScore(name) {
      const b = batMap.get(name);
      if (!b) return 0;
      // Weighted: avg is primary, SR is secondary bonus
      const avgNorm = Math.min((b.bat_avg || 0) / 60, 1);  // cap at 60 avg
      const srNorm  = Math.min((b.bat_sr  || 0) / 180, 1); // cap at SR 180
      return avgNorm * 70 + srNorm * 30;
    }

    function bowlScore(name) {
      const b = bowlMap.get(name);
      if (!b) return 0;
      const ecoNorm = Math.max(0, 1 - ((b.economy || 10) - 4) / 8); // lower is better; 4 eco = 1.0
      const wktNorm = Math.min((b.wickets || 0) / 100, 1);
      return ecoNorm * 60 + wktNorm * 40;
    }

    function arScore(name) {
      return batScore(name) * 0.5 + bowlScore(name) * 0.5;
    }

    // ── 5. Separate players into role buckets ─────────────────────────────────
    const pureBatters  = allProfiles.filter(p => p.playing_role === 'BAT');
    const wkPlayers    = allProfiles.filter(p => p.playing_role === 'WK');
    const arPlayers    = allProfiles.filter(p => p.playing_role === 'AR' || p.playing_role === 'P-BOW');
    const bowlers      = allProfiles.filter(p => p.playing_role === 'BWL' || p.playing_role === 'AR' || p.playing_role === 'P-BOW');
    const pacePlayers  = bowlers.filter(p => isPace(p.bowling_type));
    const spinPlayers  = bowlers.filter(p => isSpin(p.bowling_type));

    // Fallback: if bowling_type not populated, split BWL players equally
    const unknownBowlers = bowlers.filter(p => !isPace(p.bowling_type) && !isSpin(p.bowling_type));
    // Add unknowns to whichever bucket needs more
    const extraPace = unknownBowlers.filter((_, i) => i % 2 === 0);
    const extraSpin = unknownBowlers.filter((_, i) => i % 2 !== 0);

    // ── 6. Pick top N per bucket ──────────────────────────────────────────────
    function pickTop(pool, n, scoreFn, label) {
      return [...pool]
        .map(p => ({ ...p, rank_score: Math.round(scoreFn(p.player_name) * 100) / 100, rank_label: label }))
        .sort((a, b) => b.rank_score - a.rank_score)
        .slice(0, n);
    }

    const usedNames = new Set();

    function pickTopUnique(pool, n, scoreFn, label) {
      const candidates = [...pool]
        .filter(p => !usedNames.has(p.player_name))
        .map(p => ({ ...p, rank_score: Math.round(scoreFn(p.player_name) * 100) / 100, rank_label: label }))
        .sort((a, b) => b.rank_score - a.rank_score)
        .slice(0, n);
      candidates.forEach(p => usedNames.add(p.player_name));
      return candidates;
    }

    const selectedWK    = pickTopUnique(wkPlayers,                       wk,          batScore,  'WK');
    const selectedBat   = pickTopUnique(pureBatters,                     batsmen,     batScore,  'Batsman');
    const selectedAR    = pickTopUnique(arPlayers,                       allRounders, arScore,   'All-Rounder');
    const selectedPace  = pickTopUnique([...pacePlayers, ...extraPace],  paceBowlers, bowlScore, 'Pace Bowler');
    const selectedSpin  = pickTopUnique([...spinPlayers, ...extraSpin],  spinBowlers, bowlScore, 'Spin Bowler');

    const squad = [
      ...selectedWK,
      ...selectedBat,
      ...selectedAR,
      ...selectedPace,
      ...selectedSpin,
    ];

    // ── 7. Attach format status for display ───────────────────────────────────
    const statusKey = `intl_${format}_status`;
    const enriched  = squad.map(p => ({ ...p, intl_status: p[statusKey] || p.intl_t20i_status || 'Active' }));

    return NextResponse.json({
      squad:        enriched,
      requirements: { batsmen, wk, allRounders, paceBowlers, spinBowlers },
      format,
      total:        enriched.length,
      note:         perfFormat !== 't20' ? `Ranking uses ${format.toUpperCase()} performance data` : 'Ranking uses T20I performance data',
    });

  } catch (err) {
    console.error('team-selector POST error:', err);
    return NextResponse.json({ error: true, message: err.message }, { status: 500 });
  }
}
