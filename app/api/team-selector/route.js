/**
 * GET  /api/team-selector?format=t20i|odi|test
 *   → returns list of countries that have played that format
 *
 * POST /api/team-selector
 *   Body: { format, country, requirements: { batsmen, wk, allRounders, paceBowlers, spinBowlers } }
 *   → Auto-select best XI from AVAILABLE players ranked by career stats
 *
 * Selection strategy:
 *   1. Source candidate pool — players who appeared in a match in the last 3 years
 *   2. LEFT JOIN player_profiles for role, bowling_type, AND retirement status
 *   3. EXCLUDE retired players (is_retired = true in player_profiles)
 *   4. EXCLUDE players inactive for > 1 year (no match appearance in the last 12 months)
 *      — handles cases where retirement flag may be missing/incorrect
 *   5. Rank remaining players by career stats (batting avg/SR; wickets+economy)
 *   6. Pick top N per role bucket
 *
 * Note: The 1-year inactivity filter may occasionally exclude players who are
 * resting/injured but still available — accepted trade-off to avoid picking
 * confirmed retirees who lack an is_retired flag.
 */

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FORMAT_POOL = { t20i: 't20', odi: 'loi', test: 'test' };

const WICKET_EXCLUDE = `('run out','retired hurt','retired out','obstructing the field','handled the ball','timed out')`;

const PACE_KW = ['fast', 'medium', 'seam', 'swing', 'pace', 'quick', 'inswing', 'outswing'];
const SPIN_KW = ['spin', 'break', 'orthodox', 'wrist', 'googly', 'doosra', 'carrom', 'offbreak', 'legbreak', 'slow'];

function isPace(bt = '') { return PACE_KW.some(k => bt.toLowerCase().includes(k)); }
function isSpin(bt = '') { return SPIN_KW.some(k => bt.toLowerCase().includes(k)); }

/**
 * Confirmed male players used as match co-occurrence anchors.
 * Any player who has appeared in the same match as one of these is
 * definitively playing in a men's fixture — no gender column needed.
 * Covers the major Test/T20I nations so the filter works for all countries.
 */
const KNOWN_MALE_ANCHORS = [
  // India — core (CricSheet abbreviated names as stored in match_players)
  'V Kohli', 'RG Sharma', 'JJ Bumrah', 'HH Pandya', 'KL Rahul',
  'SA Yadav',                          // Suryakumar Yadav
  'RR Pant',                           // Rishabh Pant
  'B Kumar',                           // Bhuvneshwar Kumar
  'YBK Jaiswal',                       // Yashasvi Jaiswal
  'RA Jadeja', 'YS Chahal', 'Kuldeep Yadav',
  // New-gen core
  'Shubman Gill', 'Rinku Singh', 'Tilak Varma', 'Shivam Dube',
  'Ravi Bishnoi', 'Arshdeep Singh', 'Mohammed Siraj', 'S Samson',
  // Rotational
  'Ishan Kishan', 'DL Chahar', 'SN Thakur', 'Washington Sundar',
  'AR Patel', 'Harshal Patel', 'Avesh Khan', 'Umran Malik', 'CV Varun',
  // Recent / fringe / emerging
  'Riyan Parag', 'Jitesh Sharma', 'Abhishek Sharma',
  'KH Ahmed', 'Harshit Rana', 'N Kumar Reddy', 'PR Krishna',
  // Australia
  'SPD Smith', 'DA Warner', 'PM Siddle', 'MG Johnson', 'NM Lyon',
  'MS Wade', 'A Finch', 'AT Finch', 'MP Stoinis', 'D Warner',
  'JR Hazlewood', 'MA Starc', 'GJ Maxwell', 'T Head', 'Travis Head',
  'MR Marsh', 'Cameron Green', 'Pat Cummins', 'PJ Cummins',
  // England
  'JE Root', 'BEN Stokes', 'JM Bairstow', 'EJG Morgan', 'JC Buttler',
  'JJ Roy', 'MA Wood', 'SCJ Broad', 'ST Finn', 'MJ Ali',
  'CR Woakes', 'LS Livingstone', 'BA Stokes', 'JL Denly',
  // Pakistan
  'Babar Azam', 'Mohammad Rizwan', 'Shaheen Afridi', 'Shadab Khan',
  'Fakhar Zaman', 'Imam ul Haq', 'Hasan Ali', 'Naseem Shah',
  // South Africa
  'Q de Kock', 'HM Amla', 'AB de Villiers', 'F du Plessis',
  'KA Maharaj', 'K Rabada', 'L Ngidi', 'Temba Bavuma',
  'Anrich Nortje', 'David Miller',
  // New Zealand
  'KS Williamson', 'TR Southee', 'MJ Henry', 'TA Boult',
  'MJ Guptill', 'CJ Anderson', 'GD Phillips', 'DP Conway',
  // West Indies
  'KA Pollard', 'N Pooran', 'SP Narine', 'DJ Bravo',
  'CH Gayle', 'A Russell', 'SS Hetmyer', 'Shai Hope',
  // Sri Lanka
  'DPD Jayantha', 'WU Tharanga', 'MDKJ Perera', 'AD Mathews',
  'PBB Rajapaksa', 'C Asalanka', 'D Chameera', 'W Hasaranga',
  // Bangladesh
  'Shakib Al Hasan', 'Mushfiqur Rahim', 'Tamim Iqbal',
  'Mahmudullah', 'Mustafizur Rahman', 'Taskin Ahmed',
  // Afghanistan
  'Rashid Khan', 'Mohammad Nabi', 'Mujeeb Ur Rahman',
  'Ibrahim Zadran', 'Gulbadin Naib',
  // Zimbabwe
  'SC Williams', 'Sikandar Raza', 'BRM Taylor', 'BN Muzarabani',
];

/**
 * Normalize full DB role strings → short codes (BAT, WK, AR, BWL, P-BOW)
 * player_profiles may store 'Batsman', 'Bowler', 'Allrounder', 'Wicket Keeper' etc.
 */
function normalizeRole(raw = '') {
  const r = raw.toLowerCase().replace(/[\s-_]/g, '');
  if (!r) return '';
  // Already a short code
  if (r === 'bat')  return 'BAT';
  if (r === 'wk')   return 'WK';
  if (r === 'ar')   return 'AR';
  if (r === 'bwl')  return 'BWL';
  if (r === 'pbow') return 'P-BOW';
  // Full English strings from Cricinfo / CricSheet
  if (r.includes('wicket') || r.includes('keeper'))             return 'WK';
  if (r.includes('bowlingallrounder') || r.includes('bowlingall') || r === 'pbowl') return 'P-BOW';
  if (r.includes('allrounder') || r.includes('allround'))       return 'AR';
  if (r.includes('bowl'))                                        return 'BWL';
  if (r.includes('bat') || r.includes('toporder') || r.includes('middleorder') || r.includes('opening')) return 'BAT';
  return '';
}

// Candidate pool: players who appeared in any match within the last N years
const ACTIVE_YEARS_THRESHOLD = 3;

// Players inactive for longer than this many years are excluded from selection.
// This acts as a fallback when is_retired flag is missing/wrong.
const INACTIVITY_CUTOFF_YEARS = 1;

// ── GET: country list ─────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 't20i').toLowerCase();
  const poolKey = FORMAT_POOL[format] || 't20';

  try {
    const pool = getPool(poolKey);
    const currentYear = new Date().getFullYear();
    const cutoffYear  = currentYear - ACTIVE_YEARS_THRESHOLD;

    // Only return countries that have active players in recent years
    const { rows } = await pool.query(`
      SELECT DISTINCT mp.team AS country
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.match_id
      WHERE mp.team IS NOT NULL AND mp.team <> ''
        AND mp.team NOT ILIKE '%women%'
        AND CAST(SUBSTRING(m.start_date FROM 1 FOR 4) AS INTEGER) >= $1
      ORDER BY country ASC
    `, [cutoffYear]);

    // Fallback: return all countries if no active ones found
    if (rows.length === 0) {
      const { rows: allRows } = await pool.query(`
        SELECT DISTINCT mp.team AS country
        FROM match_players mp
        JOIN matches m ON mp.match_id = m.match_id
        WHERE mp.team IS NOT NULL AND mp.team <> ''
          AND mp.team NOT ILIKE '%women%'
        ORDER BY country ASC
      `);
      return NextResponse.json({ countries: allRows.map(r => r.country), format });
    }

    return NextResponse.json({ countries: rows.map(r => r.country), format });
  } catch (err) {
    console.error('team-selector GET error:', err);
    return NextResponse.json({ error: true, message: err.message }, { status: 500 });
  }
}

// ── POST: auto-select XI ──────────────────────────────────────────────────────

export async function POST(request) {
  const body = await request.json();
  const format   = (body.format || 't20i').toLowerCase();
  const country  = (body.country || '').trim();
  const req      = body.requirements || {};

  const batsmen     = Math.max(0, parseInt(req.batsmen     ?? 4, 10));
  const wk          = Math.max(0, parseInt(req.wk          ?? 1, 10));
  const allRounders = Math.max(0, parseInt(req.allRounders ?? 2, 10));
  const paceBowlers = Math.max(0, parseInt(req.paceBowlers ?? 2, 10));
  const spinBowlers = Math.max(0, parseInt(req.spinBowlers ?? 2, 10));

  const total = batsmen + wk + allRounders + paceBowlers + spinBowlers;
  if (total !== 11) {
    return NextResponse.json({ error: `Requirements must sum to 11 — currently ${total}` }, { status: 400 });
  }

  if (!country) {
    return NextResponse.json({ error: 'Please select a country to build the XI.' }, { status: 400 });
  }

  const poolKey = FORMAT_POOL[format] || 't20';
  const now            = new Date();
  const currentYear    = now.getFullYear();
  const cutoffYear     = currentYear - ACTIVE_YEARS_THRESHOLD;
  // Inactivity cutoff: players must have played within the last 12 months
  const inactivityCutoffDate = new Date(now);
  inactivityCutoffDate.setFullYear(inactivityCutoffDate.getFullYear() - INACTIVITY_CUTOFF_YEARS);
  const inactivityCutoffStr  = inactivityCutoffDate.toISOString().slice(0, 10); // 'YYYY-MM-DD'

  try {
    const pool        = getPool(poolKey);
    const profilePool = getPool('t20'); // player_profiles always in T20 DB

    // ── 1. Active players for this country (played at least once since cutoffYear) ──
    // Co-occurrence anchor check: only include players who have appeared in a match
    // alongside at least one confirmed male player. This is the most reliable
    // men-only filter — no gender column or AI classification required.
    const { rows: activePlayers } = await pool.query(`
      SELECT DISTINCT mp.player_name
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.match_id
      WHERE mp.player_name IS NOT NULL
        AND mp.team = $1
        AND mp.team NOT ILIKE '%women%'
        AND CAST(SUBSTRING(m.start_date FROM 1 FOR 4) AS INTEGER) >= $2
        AND EXISTS (
          SELECT 1 FROM match_players mp_anchor
          WHERE mp_anchor.match_id = mp.match_id
            AND mp_anchor.player_name = ANY($3)
        )
    `, [country, cutoffYear, KNOWN_MALE_ANCHORS]);

    // Fallback: if no recent players found, use all-time players for that country
    let playerNames;
    let sourceNote = '';

    if (activePlayers.length === 0) {
      const { rows: allPlayers } = await pool.query(`
        SELECT DISTINCT mp.player_name
        FROM match_players mp
        WHERE mp.player_name IS NOT NULL
          AND mp.team = $1
          AND mp.team NOT ILIKE '%women%'
          AND EXISTS (
            SELECT 1 FROM match_players mp_anchor
            WHERE mp_anchor.match_id = mp.match_id
              AND mp_anchor.player_name = ANY($2)
          )
      `, [country, KNOWN_MALE_ANCHORS]);

      if (allPlayers.length === 0) {
        return NextResponse.json({
          error: `No players found for "${country}" in the ${format.toUpperCase()} database.`
        }, { status: 404 });
      }

      playerNames = allPlayers.map(r => r.player_name);
      sourceNote = `No recent matches found — using all-time ${country} players`;
    } else {
      playerNames = activePlayers.map(r => r.player_name);
    }

    // ── 2. Pull player_profiles for role, bowling_type, gender & retirement ──
    // Try to fetch is_retired column; fall back gracefully if column doesn't exist yet.
    let profiles;
    try {
      ({ rows: profiles } = await profilePool.query(`
        SELECT player_name,
               COALESCE(nationality,'')   AS nationality,
               COALESCE(playing_role,'')  AS playing_role,
               COALESCE(batting_style,'') AS batting_style,
               COALESCE(bowling_style,'') AS bowling_style,
               COALESCE(bowling_type,'')  AS bowling_type,
               COALESCE(gender,'')        AS gender,
               COALESCE(is_retired, false) AS is_retired
        FROM player_profiles
        WHERE player_name = ANY($1)
      `, [playerNames]));
    } catch (_colErr) {
      // is_retired column not present yet — fetch without it
      ({ rows: profiles } = await profilePool.query(`
        SELECT player_name,
               COALESCE(nationality,'')   AS nationality,
               COALESCE(playing_role,'')  AS playing_role,
               COALESCE(batting_style,'') AS batting_style,
               COALESCE(bowling_style,'') AS bowling_style,
               COALESCE(bowling_type,'')  AS bowling_type,
               COALESCE(gender,'')        AS gender,
               false AS is_retired
        FROM player_profiles
        WHERE player_name = ANY($1)
      `, [playerNames]));
    }

    const profileMap = new Map(profiles.map(p => [p.player_name, p]));

    // ── 3. Last match date per player (in THIS format's DB) ──────────────────
    // We look up the most recent match each player appeared in so we can
    // exclude anyone who hasn't played in the last INACTIVITY_CUTOFF_YEARS year(s).
    const { rows: activityRows } = await pool.query(`
      SELECT mp.player_name,
             MAX(m.start_date) AS last_match_date
      FROM match_players mp
      JOIN matches m ON mp.match_id = m.match_id
      WHERE mp.player_name = ANY($1)
        AND m.start_date IS NOT NULL
      GROUP BY mp.player_name
    `, [playerNames]);

    const lastMatchMap = new Map(
      activityRows.map(r => [r.player_name, r.last_match_date])
    );

    // ── 4. Apply exclusion filters ────────────────────────────────────────────
    let retiredCount  = 0;
    let inactiveCount = 0;

    playerNames = playerNames.filter(name => {
      const prof = profileMap.get(name);

      // (a) Gender gate — exclude confirmed female players
      const g = (prof?.gender || '').toLowerCase();
      if (g === 'female') return false;

      // (b) Retirement gate — exclude players explicitly marked as retired
      if (prof?.is_retired === true) {
        retiredCount++;
        return false;
      }

      // (c) Inactivity gate — exclude players with no match in the last year.
      //     Players with NO match record at all are kept (data may be incomplete).
      const lastDate = lastMatchMap.get(name);
      if (lastDate) {
        const lastDateStr = typeof lastDate === 'string' ? lastDate : lastDate.toISOString().slice(0, 10);
        if (lastDateStr < inactivityCutoffStr) {
          inactiveCount++;
          return false;
        }
      }

      return true;
    });

    // Build a note if any players were filtered out
    const filterNote = [];
    if (retiredCount  > 0) filterNote.push(`${retiredCount} retired player(s) excluded`);
    if (inactiveCount > 0) filterNote.push(`${inactiveCount} player(s) inactive for 1+ year excluded`);
    if (filterNote.length > 0 && !sourceNote) sourceNote = filterNote.join('; ');

    // ── 3. Batting stats from deliveries (career totals for these players) ──
    const { rows: batStats } = await pool.query(`
      SELECT
        batter                                                             AS player_name,
        COUNT(DISTINCT match_id || '_' || inning_number)::int             AS innings,
        SUM(runs_batter)::int                                             AS total_runs,
        ROUND(SUM(runs_batter)::numeric /
          NULLIF(COUNT(DISTINCT match_id || '_' || inning_number), 0), 2) AS bat_avg,
        ROUND(SUM(runs_batter) * 100.0 / NULLIF(COUNT(*), 0), 2)         AS bat_sr
      FROM deliveries
      WHERE batter = ANY($1)
      GROUP BY batter
      HAVING COUNT(DISTINCT match_id || '_' || inning_number) >= 3
    `, [playerNames]);

    // ── 4. Bowling stats from deliveries ────────────────────────────────────
    const { rows: bowlStats } = await pool.query(`
      SELECT
        bowler                                                             AS player_name,
        COUNT(DISTINCT match_id || '_' || inning_number)::int             AS bowl_innings,
        COUNT(*) FILTER (
          WHERE wicket_kind NOT IN ${WICKET_EXCLUDE}
            AND wicket_player_out IS NOT NULL
        )::int                                                             AS wickets,
        ROUND(
          SUM(runs_batter) * 6.0 / NULLIF(COUNT(*), 0), 2
        )                                                                  AS economy
      FROM deliveries
      WHERE bowler = ANY($1)
      GROUP BY bowler
      HAVING COUNT(DISTINCT match_id || '_' || inning_number) >= 2
    `, [playerNames]);

    const batMap  = new Map(batStats.map(r  => [r.player_name, r]));
    const bowlMap = new Map(bowlStats.map(r => [r.player_name, r]));

    // ── 5. Build enriched player list ────────────────────────────────────────
    const enriched = playerNames.map(name => {
      const p  = profileMap.get(name) || {};
      const b  = batMap.get(name)     || {};
      const bw = bowlMap.get(name)    || {};
      return {
        player_name:   name,
        nationality:   p.nationality   || country || '',
        playing_role:  p.playing_role  || '',
        batting_style: p.batting_style || '',
        bowling_style: p.bowling_style || '',
        bowling_type:  p.bowling_type  || '',
        innings:       b.innings       || 0,
        total_runs:    b.total_runs    || 0,
        bat_avg:       parseFloat(b.bat_avg)  || 0,
        bat_sr:        parseFloat(b.bat_sr)   || 0,
        wickets:       bw.wickets      || 0,
        economy:       parseFloat(bw.economy) || 99,
        bowl_innings:  bw.bowl_innings || 0,
      };
    });

    // ── 6. Scoring functions ─────────────────────────────────────────────────
    function batScore(p) {
      const avgN = Math.min(p.bat_avg / 50, 1);
      const srN  = Math.min(p.bat_sr  / 160, 1);
      // reward players with more experience
      const expN = Math.min(p.innings / 30, 1) * 0.1;
      return Math.round((avgN * 60 + srN * 30 + expN * 10) * 100) / 100;
    }
    function bowlScore(p) {
      const ecoN = Math.max(0, 1 - (p.economy - 4) / 8);
      const wktN = Math.min(p.wickets / 60, 1);
      const expN = Math.min(p.bowl_innings / 30, 1) * 0.1;
      return Math.round((ecoN * 50 + wktN * 40 + expN * 10) * 100) / 100;
    }
    function arScore(p) { return Math.round((batScore(p) * 0.5 + bowlScore(p) * 0.5) * 100) / 100; }

    // ── 7. Role inference ────────────────────────────────────────────────────
    function inferRole(p) {
      // 1. Trust the DB role if present — but normalize it to short codes
      const norm = normalizeRole(p.playing_role);
      if (norm) return norm;

      // 2. Stats-based inference — use ratios to distinguish real bowlers
      //    from tail-enders who happened to bat 3+ innings
      const hasBat     = p.innings      >= 3;
      const hasBowl    = p.bowl_innings >= 2;
      const pureWickets = p.wickets;
      const hasRuns     = p.total_runs  >= 50;

      // Clear-cut cases
      if (!hasBat && !hasBowl) return 'BAT';   // insufficient data — default
      if (hasBowl && !hasBat)  return 'BWL';
      if (hasBat  && !hasBowl) return 'BAT';

      // Both bat & bowl — need to distinguish AR from BWL masquerading as AR
      // A "bowling allrounder" / pure bowler: wickets ≥ 5 AND low batting average
      // A true allrounder: decent with both bat AND ball
      if (hasBat && hasBowl) {
        const isBowlerPrimary = pureWickets >= 5 &&
          (p.bat_avg < 12 || p.innings < p.bowl_innings * 0.6);
        if (isBowlerPrimary) return 'BWL';  // tail-end bat, proper bowler
        return 'AR';
      }
      return 'BAT';
    }

    const withRole = enriched.map(p => ({ ...p, eff_role: inferRole(p) }));

    // ── 8. Role buckets ──────────────────────────────────────────────────────
    const pureBatters = withRole.filter(p => p.eff_role === 'BAT');
    const wkPlayers   = withRole.filter(p => p.eff_role === 'WK');
    const arPlayers   = withRole.filter(p => ['AR','P-BOW'].includes(p.eff_role));

    // Separate pure bowlers (BWL/P-BOW) from allrounders for role buckets
    // but BOTH contribute to the bowling pools
    const pureBowlPool = withRole.filter(p => ['BWL','P-BOW'].includes(p.eff_role));
    const allBowlPool  = withRole.filter(p => ['BWL','P-BOW','AR'].includes(p.eff_role));

    // Pace / Spin split — use bowling_type string, with AR players also contributing
    const paceFromProfile = allBowlPool.filter(p =>  isPace(p.bowling_type));
    const spinFromProfile = allBowlPool.filter(p =>  isSpin(p.bowling_type));
    // Players with no bowling_type info: distribute 50/50 ONLY from pure bowlers first
    const unknownBowl     = pureBowlPool.filter(p => !isPace(p.bowling_type) && !isSpin(p.bowling_type));
    // Any remaining unclassified — include AR who bowl to fill gaps
    const unknownAR       = arPlayers.filter(p => !isPace(p.bowling_type) && !isSpin(p.bowling_type));

    // WK fallback: best batters if no profile WK found
    const wkFallback = wkPlayers.length > 0
      ? wkPlayers
      : withRole.filter(p => p.bat_avg > 0).sort((a, b) => batScore(b) - batScore(a)).slice(0, 3);

    // Pace pool: pace-classified first, then odd-indexed unknown bowlers, then AR who bowl
    const pacePool = [
      ...paceFromProfile,
      ...unknownBowl.filter((_, i) => i % 2 === 0),
      ...unknownAR.filter((_, i) => i % 2 === 0),
    ];
    // Spin pool: spin-classified first, then even-indexed unknown bowlers, then AR who bowl
    const spinPool = [
      ...spinFromProfile,
      ...unknownBowl.filter((_, i) => i % 2 !== 0),
      ...unknownAR.filter((_, i) => i % 2 !== 0),
    ];

    const usedNames = new Set();
    function pickTop(pool, n, scoreFn, label) {
      return [...pool]
        .filter(p => !usedNames.has(p.player_name))
        .map(p => ({ ...p, rank_score: scoreFn(p), rank_label: label }))
        .sort((a, b) => b.rank_score - a.rank_score)
        .slice(0, n)
        .map(p => { usedNames.add(p.player_name); return p; });
    }

    const selectedWK   = pickTop(wkFallback,  wk,          batScore,  'WK');
    const selectedBat  = pickTop(pureBatters,  batsmen,     batScore,  'Batsman');
    const selectedAR   = pickTop(arPlayers,    allRounders, arScore,   'All-Rounder');
    const selectedPace = pickTop(pacePool,     paceBowlers, bowlScore, 'Pace Bowler');
    const selectedSpin = pickTop(spinPool,     spinBowlers, bowlScore, 'Spin Bowler');

    // Fill gaps if not enough typed bowlers — draw from all-bowler pool, label correctly
    const remainBowlers = withRole
      .filter(p => ['BWL','P-BOW','AR'].includes(p.eff_role) && !usedNames.has(p.player_name))
      .sort((a, b) => bowlScore(b) - bowlScore(a));

    const gapPace = Math.max(0, paceBowlers - selectedPace.length);
    const gapSpin = Math.max(0, spinBowlers - selectedSpin.length);
    const gapAR   = Math.max(0, allRounders - selectedAR.length);

    // Fill pace gap first (label them 'Pace Bowler'), then spin gap
    const extraPace = pickTop(remainBowlers, gapPace, bowlScore, 'Pace Bowler');
    const extraSpin = pickTop(remainBowlers, gapSpin, bowlScore, 'Spin Bowler');
    const extraAR   = pickTop(
      withRole.filter(p => !usedNames.has(p.player_name)).sort((a, b) => arScore(b) - arScore(a)),
      gapAR, arScore, 'All-Rounder'
    );

    // Final squad — cap at 11
    const squad = [
      ...selectedWK,
      ...selectedBat,
      ...selectedAR, ...extraAR,
      ...selectedPace, ...extraPace,
      ...selectedSpin, ...extraSpin,
    ].slice(0, 11);

    return NextResponse.json({
      squad,
      requirements: { batsmen, wk, allRounders, paceBowlers, spinBowlers },
      format,
      total:  squad.length,
      source: `${playerNames.length} eligible ${country} players (active in last ${INACTIVITY_CUTOFF_YEARS}yr, non-retired)`,
      note:   sourceNote || undefined,
    });

  } catch (err) {
    console.error('team-selector POST error:', err);
    return NextResponse.json({ error: true, message: err.message }, { status: 500 });
  }
}
