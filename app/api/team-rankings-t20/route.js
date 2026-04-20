/**
 * GET /api/team-rankings-t20?action=load      — return cached team rankings JSON
 * GET /api/team-rankings-t20?minInnings=20    — SSE stream while computing
 *
 * Team ratings based on average impact score of top players per team.
 * Reads from the T20-specific Postgres database (SUPABASE_URL_T20).
 */

import path from 'path';
import fs from 'fs/promises';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

const CACHE_PATH = path.join(process.cwd(), '..', 'data', 'team_rankings_cache_t20.json');

const WICKET_EXCLUDE = `('run out','retired hurt','retired out','obstructing the field','handled the ball','timed out')`;

// ── Get all teams in the database ─────────────────────────────────────────────

async function getAllTeams(pool) {
  const { rows } = await pool.query(`
    SELECT DISTINCT team FROM match_players
    WHERE team IS NOT NULL
    ORDER BY team
  `);
  return rows.map(r => r.team).filter(Boolean);
}

// ── Get batting stats for a team ──────────────────────────────────────────────

async function getTeamBattingStats(pool, teamName, minInnings) {
  const { rows } = await pool.query(`
    SELECT
      mp.player_name,
      COUNT(DISTINCT d.match_id || '_' || d.inning_number)::int AS innings,
      SUM(d.runs_batter)::int AS total_runs,
      ROUND(SUM(d.runs_batter)::numeric / COUNT(DISTINCT d.match_id || '_' || d.inning_number), 4)::float AS runs_per_innings
    FROM match_players mp
    JOIN deliveries d
      ON mp.player_name = d.batter
     AND mp.match_id = d.match_id
    WHERE mp.team = $1 AND d.batter IS NOT NULL
    GROUP BY mp.player_name
    HAVING COUNT(DISTINCT d.match_id || '_' || d.inning_number) >= $2
    ORDER BY runs_per_innings DESC
  `, [teamName, minInnings]);
  return rows;
}

// ── Get bowling stats for a team ──────────────────────────────────────────────

async function getTeamBowlingStats(pool, teamName, minInnings) {
  const { rows } = await pool.query(`
    SELECT
      mp.player_name,
      COUNT(DISTINCT d.match_id || '_' || d.inning_number)::int AS innings,
      COUNT(*) FILTER (WHERE d.wicket_kind NOT IN ${WICKET_EXCLUDE} AND d.wicket_player_out IS NOT NULL)::int AS total_wickets,
      ROUND(
        COUNT(*) FILTER (WHERE d.wicket_kind NOT IN ${WICKET_EXCLUDE} AND d.wicket_player_out IS NOT NULL)::numeric
        / COUNT(DISTINCT d.match_id || '_' || d.inning_number),
        4
      )::float AS wickets_per_innings
    FROM match_players mp
    JOIN deliveries d
      ON mp.player_name = d.bowler
     AND mp.match_id = d.match_id
    WHERE mp.team = $1 AND d.bowler IS NOT NULL
    GROUP BY mp.player_name
    HAVING COUNT(DISTINCT d.match_id || '_' || d.inning_number) >= $2
    ORDER BY wickets_per_innings DESC
  `, [teamName, minInnings]);
  return rows;
}

// ── Get last played year for team ─────────────────────────────────────────────

async function getTeamLastPlayedYear(pool, teamName) {
  const { rows } = await pool.query(`
    SELECT MAX(CAST(SUBSTRING(m.start_date FROM 1 FOR 4) AS INTEGER)) AS last_year
    FROM matches m
    WHERE m.team1 = $1 OR m.team2 = $1
  `, [teamName]);
  return rows[0]?.last_year || new Date().getFullYear();
}

// ── Get matches played for team ───────────────────────────────────────────────

async function getTeamMatchesPlayed(pool, teamName) {
  const { rows } = await pool.query(`
    SELECT COUNT(*)::int AS cnt
    FROM matches m
    WHERE m.team1 = $1 OR m.team2 = $1
  `, [teamName]);
  return rows[0]?.cnt || 0;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    const pool = getPool('t20');

    if (action === 'load') {
      try {
        const cached = JSON.parse(await fs.readFile(CACHE_PATH, 'utf-8'));
        return Response.json(cached);
      } catch {
        return Response.json({ found: false });
      }
    }

    const minInnings = parseInt(searchParams.get('minInnings')) || 10;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (phase, data) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ phase, ...data })}\n\n`));

        try {
          send('status', { message: 'Loading teams...', progress: 10 });
          const teams = await getAllTeams(pool);

          send('status', { message: `Found ${teams.length} teams. Computing ratings...`, progress: 20 });

          const teamRatings = [];

          for (let i = 0; i < teams.length; i++) {
            const team = teams[i];
            const [battingStats, bowlingStats] = await Promise.all([
              getTeamBattingStats(pool, team, minInnings),
              getTeamBowlingStats(pool, team, minInnings),
            ]);

            const avgBattingScore = battingStats.length > 0
              ? battingStats.reduce((sum, p) => sum + Number(p.runs_per_innings), 0) / battingStats.length
              : 0;

            const avgBowlingScore = bowlingStats.length > 0
              ? bowlingStats.reduce((sum, p) => sum + Number(p.wickets_per_innings), 0) / bowlingStats.length
              : 0;

            const lastYear = await getTeamLastPlayedYear(pool, team);
            const matchesPlayed = await getTeamMatchesPlayed(pool, team);

            teamRatings.push({
              team_name: team,
              matches_played: matchesPlayed,
              last_played: lastYear,
              batting_avg_impact: Number(avgBattingScore.toFixed(4)),
              bowling_avg_impact: Number(avgBowlingScore.toFixed(4)),
              combined_impact: Number((avgBattingScore + avgBowlingScore).toFixed(4)),
              top_batsmen_count: battingStats.length,
              top_bowlers_count: bowlingStats.length,
            });

            if ((i + 1) % 5 === 0) {
              send('status', {
                message: `Processed ${i + 1}/${teams.length} teams...`,
                progress: 20 + Math.floor((i + 1) / teams.length * 70),
              });
            }
          }

          teamRatings.sort((a, b) => b.combined_impact - a.combined_impact);
          teamRatings.forEach((t, i) => { t.impact_rank = i + 1; });

          send('status', { message: 'Caching results...', progress: 90 });

          const result = { teamRatings, savedAt: new Date().toISOString() };
          await fs.writeFile(CACHE_PATH, JSON.stringify(result), 'utf-8');

          send('done', {
            message: 'Team rankings computed successfully',
            teamRatings,
            savedAt: result.savedAt,
            progress: 100,
          });

        } catch (error) {
          console.error('Team ranking computation error:', error);
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
