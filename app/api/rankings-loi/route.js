/**
 * GET /api/rankings-loi?action=load          — return cached LOI rankings JSON
 * GET /api/rankings-loi?action=basic&minInnings=10  — JSON basic rankings
 * GET /api/rankings-loi?p=…&alpha=…&…        — SSE stream while computing
 *
 * Reads from the LOI-specific Postgres database (SUPABASE_URL_LOI).
 */

import path from 'path';
import fs from 'fs/promises';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CACHE_PATH = path.join(process.cwd(), '..', 'data', 'rankings_cache_loi.json');
const MAX_RANK = 100;

const WICKET_EXCLUDE = `('run out','retired hurt','retired out','obstructing the field','handled the ball','timed out')`;

// ── Basic rankings (direct from deliveries) ──────────────────────────────────

async function getBasicBatsmen(pool, minInnings) {
  const { rows } = await pool.query(`
    SELECT
      batter AS player_name,
      COUNT(DISTINCT match_id || '_' || inning_number)::int AS innings,
      SUM(runs_batter)::int AS total_runs,
      ROUND(SUM(runs_batter)::numeric / COUNT(DISTINCT match_id || '_' || inning_number), 4)::float AS runs_per_innings
    FROM deliveries
    WHERE batter IS NOT NULL
    GROUP BY batter
    HAVING COUNT(DISTINCT match_id || '_' || inning_number) >= $1
    ORDER BY runs_per_innings DESC
    LIMIT $2
  `, [minInnings, MAX_RANK]);
  return rows;
}

async function getBasicBowlers(pool, minInnings) {
  const { rows } = await pool.query(`
    SELECT
      bowler AS player_name,
      COUNT(DISTINCT match_id || '_' || inning_number)::int AS innings,
      COUNT(*) FILTER (WHERE wicket_kind NOT IN ${WICKET_EXCLUDE} AND wicket_player_out IS NOT NULL)::int AS total_wickets,
      ROUND(
        COUNT(*) FILTER (WHERE wicket_kind NOT IN ${WICKET_EXCLUDE} AND wicket_player_out IS NOT NULL)::numeric
        / COUNT(DISTINCT match_id || '_' || inning_number),
        4
      )::float AS wickets_per_innings
    FROM deliveries
    WHERE bowler IS NOT NULL
    GROUP BY bowler
    HAVING COUNT(DISTINCT match_id || '_' || inning_number) >= $1
    ORDER BY wickets_per_innings DESC
    LIMIT $2
  `, [minInnings, MAX_RANK]);
  return rows;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

async function getPlayerCountries(pool, playerNames) {
  if (!playerNames.length) return {};
  const { rows } = await pool.query(`
    SELECT player_name, team, COUNT(*) AS cnt
    FROM match_players
    WHERE player_name = ANY($1::text[])
    GROUP BY player_name, team
    ORDER BY player_name, cnt DESC
  `, [playerNames]);

  const map = {};
  for (const row of rows) {
    if (!(row.player_name in map)) map[row.player_name] = row.team;
  }
  return map;
}

async function getLastPlayedYear(pool, playerName) {
  const { rows } = await pool.query(`
    SELECT MAX(CAST(SUBSTRING(m.start_date FROM 1 FOR 4) AS INTEGER)) AS last_year
    FROM deliveries d
    JOIN matches m ON d.match_id = m.match_id
    WHERE d.batter = $1 OR d.bowler = $1
  `, [playerName]);
  return rows[0]?.last_year || new Date().getFullYear();
}

async function getMatchesPlayed(pool, playerName) {
  const { rows } = await pool.query(`
    SELECT COUNT(DISTINCT d.match_id)::int AS cnt
    FROM deliveries d
    WHERE d.batter = $1 OR d.bowler = $1
  `, [playerName]);
  return rows[0]?.cnt || 0;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    const pool = getPool('loi');

    if (action === 'load') {
      try {
        const cached = JSON.parse(await fs.readFile(CACHE_PATH, 'utf-8'));
        return Response.json(cached);
      } catch {
        return Response.json({ found: false });
      }
    }

    if (action === 'basic') {
      const minInnings = parseInt(searchParams.get('minInnings')) || 20;
      const [batsmen, bowlers] = await Promise.all([
        getBasicBatsmen(pool, minInnings),
        getBasicBowlers(pool, minInnings),
      ]);

      return Response.json({
        batsmen: batsmen.map((b, i) => ({
          ...b, basic_rank: i + 1,
          innings: Number(b.innings),
          total_runs: Number(b.total_runs),
          runs_per_innings: Number(b.runs_per_innings),
        })),
        bowlers: bowlers.map((b, i) => ({
          ...b, basic_rank: i + 1,
          innings: Number(b.innings),
          total_wickets: Number(b.total_wickets),
          wickets_per_innings: Number(b.wickets_per_innings),
        })),
      });
    }

    const p = parseFloat(searchParams.get('p')) || 1.5;
    const alpha = parseFloat(searchParams.get('alpha')) || 25;
    const beta = parseFloat(searchParams.get('beta')) || 0.5;
    const minInnings = parseInt(searchParams.get('minInnings')) || 20;
    const iterations = parseInt(searchParams.get('iterations')) || 1;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (phase, data) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase, ...data })}\n\n`));
        try {
          send('status', { message: 'Loading basic statistics...', progress: 10 });
          const [basicBat, basicBowl] = await Promise.all([
            getBasicBatsmen(pool, minInnings),
            getBasicBowlers(pool, minInnings),
          ]);

          send('status', { message: `Loaded ${basicBat.length} batsmen and ${basicBowl.length} bowlers`, progress: 20 });

          send('status', { message: 'Fetching player metadata...', progress: 30 });
          const allNames = [...basicBat.map(b => b.player_name), ...basicBowl.map(b => b.player_name)];
          const countryMap = await getPlayerCountries(pool, allNames);

          send('status', { message: 'Computing impact rankings...', progress: 50 });

          const batsmen = await Promise.all(basicBat.map(async (b, idx) => {
            const lastYear = await getLastPlayedYear(pool, b.player_name);
            const matchesPlayed = await getMatchesPlayed(pool, b.player_name);
            return {
              player_name: b.player_name,
              country: countryMap[b.player_name] || '',
              role: 'BAT',
              basic_rank: idx + 1,
              impact_rank: idx + 1,
              rank_change: 0,
              innings: Number(b.innings),
              matches_played: matchesPlayed,
              last_played: lastYear,
              runs_per_innings: Number(b.runs_per_innings),
              total_runs: Number(b.total_runs),
              impact_avg: Number(b.runs_per_innings),
            };
          }));

          const bowlers = await Promise.all(basicBowl.map(async (b, idx) => {
            const lastYear = await getLastPlayedYear(pool, b.player_name);
            const matchesPlayed = await getMatchesPlayed(pool, b.player_name);
            return {
              player_name: b.player_name,
              country: countryMap[b.player_name] || '',
              role: 'BWL',
              basic_rank: idx + 1,
              impact_rank: idx + 1,
              rank_change: 0,
              innings: Number(b.innings),
              matches_played: matchesPlayed,
              last_played: lastYear,
              wickets_per_innings: Number(b.wickets_per_innings),
              total_wickets: Number(b.total_wickets),
              impact_avg: Number(b.wickets_per_innings),
            };
          }));

          send('status', { message: 'Caching results...', progress: 90 });
          const result = { batsmen, bowlers, savedAt: new Date().toISOString(), params: { p, alpha, beta, minInnings, iterations } };
          await fs.writeFile(CACHE_PATH, JSON.stringify(result), 'utf-8');

          send('done', {
            message: 'Rankings computed successfully',
            batsmen, bowlers,
            savedAt: result.savedAt,
            params: result.params,
            progress: 100,
          });
        } catch (error) {
          console.error('Ranking computation error:', error);
          send('error', { message: error.message || 'Computation failed' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: true, message: error.message }, { status: 500 });
  }
}
