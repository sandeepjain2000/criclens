/**
 * GET /api/rankings?action=load          — return cached rankings JSON
 * GET /api/rankings?p=…&alpha=…&…       — SSE stream while computing
 *
 * Query params (compute mode):
 *   p          – power exponent for weight curve      (default 1.5)
 *   alpha      – wicket credit for bowlers            (default 25)
 *   beta       – run-conceded penalty for bowlers     (default 0.5)
 *   minInnings – minimum innings to qualify           (default 20)
 *   iterations – 1 or 2 refinement passes            (default 1)
 */

import pool from '@/lib/db';
import path      from 'path';
import fs        from 'fs/promises';
import { KNOWN_WK } from '@/lib/cricketUtils';

// Force dynamic rendering — this route queries Supabase at request time
export const dynamic = 'force-dynamic';

const CACHE_PATH = path.join(process.cwd(), '..', 'data', 'rankings_cache.json');
const MAX_RANK   = 100;

// ── Weight formula ────────────────────────────────────────────────────────────
function weight(rank, p) {
  const r = Math.min(rank ?? MAX_RANK, MAX_RANK);
  return Math.pow(1.0 / r, p);
}

const WICKET_EXCLUDE = `('run out','retired hurt','retired out','obstructing the field','handled the ball','timed out')`;

// ── SQL: basic rankings (uses pre-computed materialized views for speed) ─────

const SQL_BASIC_BAT = (minInnings) => `
  SELECT
    player_name,
    innings,
    total_runs,
    ROUND(total_runs::numeric / innings, 4) AS runs_per_innings
  FROM player_bat_stats
  WHERE innings >= ${minInnings}
  ORDER BY runs_per_innings DESC
  LIMIT ${MAX_RANK}
`;

const SQL_BASIC_BOWL = (minInnings) => `
  SELECT
    player_name,
    innings,
    total_wickets,
    ROUND(total_wickets::numeric / innings, 4) AS wickets_per_innings
  FROM player_bowl_stats
  WHERE innings >= ${minInnings}
  ORDER BY wickets_per_innings DESC
  LIMIT ${MAX_RANK}
`;

// Coerce Postgres numeric strings to JS numbers for .toFixed() safety
function normBat(b, i) {
  return {
    ...b,
    basic_rank:       i + 1,
    innings:          Number(b.innings),
    total_runs:       Number(b.total_runs),
    runs_per_innings: Number(b.runs_per_innings),
  };
}
function normBowl(b, i) {
  return {
    ...b,
    basic_rank:          i + 1,
    innings:             Number(b.innings),
    total_wickets:       Number(b.total_wickets),
    wickets_per_innings: Number(b.wickets_per_innings),
  };
}

// ── SQL: supplementary metadata ───────────────────────────────────────────────

// Country (team) for a list of players — most-common team per player
function SQL_PLAYER_COUNTRIES(names) {
  const ph = names.map((_, i) => '$' + (i + 1)).join(',');
  return `
    SELECT player_name, team, COUNT(*) AS cnt
    FROM match_players
    WHERE player_name IN (${ph})
    GROUP BY player_name, team
    ORDER BY player_name, cnt DESC
  `;
}

// Date column is start_date in our Postgres schema

// Last played year + matches played — no join fallback when date unavailable
function SQL_BAT_META(names, dateExpr) {
  const ph = names.map((_, i) => '$' + (i + 1)).join(',');
  if (dateExpr) {
    return `
      SELECT
        d.batter                                 AS player_name,
        substr(MAX(${dateExpr}), 1, 4)          AS last_played,
        COUNT(DISTINCT d.match_id)               AS matches_played
      FROM deliveries d
      JOIN matches m ON d.match_id = m.match_id
      WHERE d.batter IN (${ph})
      GROUP BY d.batter
    `;
  }
  return `
    SELECT
      d.batter                   AS player_name,
      ''                         AS last_played,
      COUNT(DISTINCT d.match_id) AS matches_played
    FROM deliveries d
    WHERE d.batter IN (${ph})
    GROUP BY d.batter
  `;
}

function SQL_BOWL_META(names, dateExpr) {
  const ph = names.map((_, i) => '$' + (i + 1)).join(',');
  if (dateExpr) {
    return `
      SELECT
        d.bowler                                 AS player_name,
        substr(MAX(${dateExpr}), 1, 4)          AS last_played,
        COUNT(DISTINCT d.match_id)               AS matches_played
      FROM deliveries d
      JOIN matches m ON d.match_id = m.match_id
      WHERE d.bowler IN (${ph})
      GROUP BY d.bowler
    `;
  }
  return `
    SELECT
      d.bowler                   AS player_name,
      ''                         AS last_played,
      COUNT(DISTINCT d.match_id) AS matches_played
    FROM deliveries d
    WHERE d.bowler IN (${ph})
    GROUP BY d.bowler
  `;
}

// Career wickets for batsmen list → detect all-rounders (uses materialized view)
function SQL_BAT_WICKETS(names) {
  const ph = names.map((_, i) => '$' + (i + 1)).join(',');
  return `
    SELECT player_name, total_wickets AS career_wickets
    FROM player_bowl_stats
    WHERE player_name IN (${ph})
  `;
}

// Career runs for bowlers list → detect all-rounders (uses materialized view)
function SQL_BOWL_RUNS(names) {
  const ph = names.map((_, i) => '$' + (i + 1)).join(',');
  return `
    SELECT player_name, total_runs AS career_runs
    FROM player_bat_stats
    WHERE player_name IN (${ph})
  `;
}

// ── SQL: delivery pairs ───────────────────────────────────────────────────────

function SQL_BAT_PAIRS(names) {
  const ph = names.map((_, i) => '$' + (i + 1)).join(',');
  return `
    SELECT
      d.batter,
      d.bowler,
      SUM(d.runs_batter) AS runs
    FROM deliveries d
    WHERE d.batter IN (${ph})
    GROUP BY d.batter, d.bowler
    HAVING SUM(d.runs_batter) > 0
  `;
}

function SQL_BOWL_PAIRS(names) {
  const ph = names.map((_, i) => '$' + (i + 1)).join(',');
  return `
    SELECT
      d.bowler,
      d.batter,
      SUM(
        CASE WHEN d.wicket_player_out = d.batter
             AND  d.wicket_kind NOT IN ${WICKET_EXCLUDE}
        THEN 1 ELSE 0 END
      )                        AS wickets,
      SUM(d.runs_batter)       AS runs_faced
    FROM deliveries d
    WHERE d.bowler IN (${ph})
    GROUP BY d.bowler, d.batter
  `;
}

// ── Impact computation ────────────────────────────────────────────────────────

function computeBatsmanImpact(basicBatsmen, bowlerRankMap, batPairs, p) {
  const byName = new Map(basicBatsmen.map((b, i) => [
    b.player_name,
    { ...b, basic_rank: i + 1, impact_score: 0 }
  ]));

  for (const pair of batPairs) {
    const entry = byName.get(pair.batter);
    if (!entry) continue;
    const bowlerRank = bowlerRankMap.get(pair.bowler) ?? MAX_RANK;
    entry.impact_score += pair.runs * weight(bowlerRank, p);
  }

  const arr = [...byName.values()].map(b => ({
    ...b,
    impact_avg: b.innings > 0 ? b.impact_score / b.innings : 0,
  }));

  arr.sort((a, b) => b.impact_avg - a.impact_avg);
  return arr.map((b, idx) => ({
    ...b,
    impact_rank:  idx + 1,
    rank_change:  b.basic_rank - (idx + 1),
    impact_score: Math.round(b.impact_score * 100) / 100,
    impact_avg:   Math.round(b.impact_avg   * 100) / 100,
  }));
}

function computeBowlerImpact(basicBowlers, batsmanRankMap, bowlPairs, p, alpha, beta) {
  const byName = new Map(basicBowlers.map((b, i) => [
    b.player_name,
    { ...b, basic_rank: i + 1, impact_score: 0 }
  ]));

  for (const pair of bowlPairs) {
    const entry = byName.get(pair.bowler);
    if (!entry) continue;
    const batsmanRank = batsmanRankMap.get(pair.batter) ?? MAX_RANK;
    entry.impact_score += (pair.wickets * alpha - pair.runs_faced * beta) * weight(batsmanRank, p);
  }

  const arr = [...byName.values()].map(b => ({
    ...b,
    impact_avg: b.innings > 0 ? b.impact_score / b.innings : 0,
  }));

  arr.sort((a, b) => b.impact_avg - a.impact_avg);
  return arr.map((b, idx) => ({
    ...b,
    impact_rank:  idx + 1,
    rank_change:  b.basic_rank - (idx + 1),
    impact_score: Math.round(b.impact_score * 100) / 100,
    impact_avg:   Math.round(b.impact_avg   * 100) / 100,
  }));
}

// ── SSE helper ────────────────────────────────────────────────────────────────
function sseMsg(controller, encoder, phase, payload) {
  const line = `data: ${JSON.stringify({ phase, ...payload })}\n\n`;
  controller.enqueue(encoder.encode(line));
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const action = searchParams.get('action');

  // ── Load saved rankings ───────────────────────────────────────────────────
  if (action === 'load') {
    try {
      const raw = await fs.readFile(CACHE_PATH, 'utf-8');
      return Response.json({ found: true, ...JSON.parse(raw) });
    } catch {
      return Response.json({ found: false });
    }
  }

  // ── Basic rankings (no impact weighting) ─────────────────────────────────
  if (action === 'basic') {
    try {
      const minInn = parseInt(searchParams.get('minInnings') ?? '20');
      const { rows: batsmen } = await pool.query(SQL_BASIC_BAT(minInn));
      const { rows: bowlers } = await pool.query(SQL_BASIC_BOWL(minInn));
      return Response.json({
        batsmen: batsmen.map(normBat),
        bowlers: bowlers.map(normBowl),
      });
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  // ── Compute rankings via SSE stream ───────────────────────────────────────
  const p          = parseFloat(searchParams.get('p')          ?? '1.5');
  const alpha      = parseFloat(searchParams.get('alpha')      ?? '25');
  const beta       = parseFloat(searchParams.get('beta')       ?? '0.5');
  const minInnings = parseInt  (searchParams.get('minInnings') ?? '20');
  const iterations = Math.min(2, Math.max(1, parseInt(searchParams.get('iterations') ?? '1')));

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (phase, payload) => sseMsg(controller, encoder, phase, payload);
      try {

        // ── Phase 1: Basic rankings ──────────────────────────────────────────
        send('status', { message: 'Computing basic batsman rankings…', progress: 5 });
        const { rows: _rawBat } = await pool.query(SQL_BASIC_BAT(minInnings));
        const basicBatsmen = _rawBat.map(normBat);
        send('status', {
          message:  `${basicBatsmen.length} batsmen qualified (min ${minInnings} innings).`,
          progress: 15,
        });

        send('status', { message: 'Computing basic bowler rankings…', progress: 18 });
        const { rows: _rawBowl } = await pool.query(SQL_BASIC_BOWL(minInnings));
        const basicBowlers = _rawBowl.map(normBowl);
        send('status', {
          message:  `${basicBowlers.length} bowlers qualified (min ${minInnings} innings).`,
          progress: 28,
        });

        if (basicBatsmen.length === 0 || basicBowlers.length === 0) {
          send('error', { message: 'Not enough data — try lowering Min Innings or check the DB has data.' });
          return;
        }

        const batNames  = basicBatsmen.map(b => b.player_name);
        const bowlNames = basicBowlers.map(b => b.player_name);
        const allNames  = [...new Set([...batNames, ...bowlNames])];

        // ── Phase 2: Supplementary metadata ─────────────────────────────────
        send('status', { message: 'Loading player metadata (country, role, last played)…', progress: 30 });

        // Auto-detect which date column exists in the matches table
        const dateExpr = 'm.start_date';

        const { rows: countryRows }    = await pool.query(SQL_PLAYER_COUNTRIES(allNames),  allNames);
        const { rows: batMetaRows }    = await pool.query(SQL_BAT_META(batNames,  dateExpr), batNames);
        const { rows: bowlMetaRows }   = await pool.query(SQL_BOWL_META(bowlNames, dateExpr), bowlNames);
        const { rows: batWicketRows }  = await pool.query(SQL_BAT_WICKETS(batNames),       batNames);
        const { rows: bowlRunRows }    = await pool.query(SQL_BOWL_RUNS(bowlNames),        bowlNames);

        send('status', { message: 'Player metadata loaded.', progress: 40 });

        // Build lookup maps
        // Country: ORDER BY cnt DESC — first row per player is their primary team
        const countryMap = new Map();
        for (const row of countryRows) {
          if (!countryMap.has(row.player_name)) countryMap.set(row.player_name, row.team);
        }
        const batMetaMap    = new Map(batMetaRows.map(r   => [r.player_name, r]));
        const bowlMetaMap   = new Map(bowlMetaRows.map(r  => [r.player_name, r]));
        const batWicketsMap = new Map(batWicketRows.map(r => [r.player_name, r.career_wickets ?? 0]));
        const bowlRunsMap   = new Map(bowlRunRows.map(r   => [r.player_name, r.career_runs   ?? 0]));

        // ── Phase 3: Delivery pairs ──────────────────────────────────────────
        send('status', {
          message:  `Loading batsman-bowler pairs for top ${batNames.length} batsmen…`,
          progress: 43,
        });
        const { rows: batPairs } = await pool.query(SQL_BAT_PAIRS(batNames), batNames);
        send('status', {
          message:  `${batPairs.length.toLocaleString()} batsman-bowler pairs loaded.`,
          progress: 55,
        });

        send('status', {
          message:  `Loading bowler-batsman pairs for top ${bowlNames.length} bowlers…`,
          progress: 58,
        });
        const { rows: bowlPairs } = await pool.query(SQL_BOWL_PAIRS(bowlNames), bowlNames);
        send('status', {
          message:  `${bowlPairs.length.toLocaleString()} bowler-batsman pairs loaded.`,
          progress: 68,
        });

        // ── Phase 4: Iteration 1 ─────────────────────────────────────────────
        send('status', { message: 'Computing batsman impact scores — Iteration 1…', progress: 72 });
        const bowlerRankMap1  = new Map(basicBowlers.map((b, i) => [b.player_name, i + 1]));
        const impactBat1      = computeBatsmanImpact(basicBatsmen, bowlerRankMap1, batPairs, p);

        send('status', { message: 'Computing bowler impact scores — Iteration 1…', progress: 80 });
        const batsmanRankMap1 = new Map(impactBat1.map(b => [b.player_name, b.impact_rank]));
        const impactBowl1     = computeBowlerImpact(basicBowlers, batsmanRankMap1, bowlPairs, p, alpha, beta);

        let finalBat  = impactBat1;
        let finalBowl = impactBowl1;

        // ── Phase 5: Optional Iteration 2 ────────────────────────────────────
        if (iterations >= 2) {
          send('status', {
            message:  'Refining — Iteration 2 (batsmen re-ranked with iteration-1 bowler ranks)…',
            progress: 84,
          });
          const bowlerRankMap2  = new Map(impactBowl1.map(b => [b.player_name, b.impact_rank]));
          finalBat = computeBatsmanImpact(basicBatsmen, bowlerRankMap2, batPairs, p);

          send('status', {
            message:  'Refining — Iteration 2 (bowlers re-ranked with refined batsman ranks)…',
            progress: 92,
          });
          const batsmanRankMap2 = new Map(finalBat.map(b => [b.player_name, b.impact_rank]));
          finalBowl = computeBowlerImpact(basicBowlers, batsmanRankMap2, bowlPairs, p, alpha, beta);

          send('status', { message: 'Iteration 2 complete.', progress: 96 });
        }

        // ── Phase 6: Merge supplementary metadata ────────────────────────────
        finalBat = finalBat.map(b => {
          const meta    = batMetaMap.get(b.player_name)    ?? {};
          const wickets = batWicketsMap.get(b.player_name) ?? 0;
          let role = 'BAT';
          if (KNOWN_WK.has(b.player_name))  role = 'WK';
          else if (wickets >= 50)           role = 'P-BOW';
          return {
            ...b,
            country:        countryMap.get(b.player_name) ?? '',
            last_played:    meta.last_played    ?? '',
            matches_played: meta.matches_played ?? 0,
            role,
          };
        });

        finalBowl = finalBowl.map(b => {
          const meta = bowlMetaMap.get(b.player_name)   ?? {};
          const runs = bowlRunsMap.get(b.player_name)   ?? 0;
          const role = runs >= 1500 ? 'AR' : 'BWL';
          return {
            ...b,
            country:        countryMap.get(b.player_name) ?? '',
            last_played:    meta.last_played    ?? '',
            matches_played: meta.matches_played ?? 0,
            role,
          };
        });

        // ── Phase 7: Save cache ───────────────────────────────────────────────
        send('status', { message: 'Saving rankings to cache…', progress: 98 });
        const savedAt = new Date().toISOString();
        try {
          const cache = {
            savedAt,
            params:  { p, alpha, beta, minInnings, iterations },
            batsmen: finalBat,
            bowlers: finalBowl,
          };
          await fs.writeFile(CACHE_PATH, JSON.stringify(cache));
        } catch (e) {
          console.warn('Rankings cache write failed:', e.message);
        }

        // ── Done ─────────────────────────────────────────────────────────────
        send('done', {
          message:  `Rankings ready! ${finalBat.length} batsmen · ${finalBowl.length} bowlers.`,
          progress: 100,
          batsmen:  finalBat,
          bowlers:  finalBowl,
          savedAt,
          params:   { p, alpha, beta, minInnings, iterations },
        });

      } catch (err) {
        send('error', { message: err.message ?? 'Unknown server error' });
      } finally {
        
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
