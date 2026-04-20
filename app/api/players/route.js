import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { KNOWN_WK, WICKET_EXCLUDE, classifyRole } from '@/lib/cricketUtils';

// Force dynamic rendering — this route queries Supabase at request time
export const dynamic = 'force-dynamic';

export async function GET() {
  try {

    // ── 1. All players with primary country ──────────────────────────────────
    // We use a simple two-step approach to avoid a complex correlated subquery.
    const { rows: playerRows } = await pool.query(`SELECT name FROM players ORDER BY name ASC`);

    const { rows: countryRows } = await pool.query(`
      SELECT player_name, team, COUNT(*) AS cnt
      FROM match_players
      GROUP BY player_name, team
      ORDER BY player_name, cnt DESC
    `);

    // Build player → primary country map (first row per player = highest count)
    const countryMap = new Map();
    for (const row of countryRows) {
      if (!countryMap.has(row.player_name)) countryMap.set(row.player_name, row.team);
    }

    // ── 2. Batting career stats (from materialized view — fast!) ─────────────
    const { rows: batRows } = await pool.query(`
      SELECT player_name AS name, total_runs AS career_runs, innings AS bat_innings
      FROM player_bat_stats
    `);
    const batMap = new Map(batRows.map(r => [r.name, r]));

    // ── 3. Bowling career stats (from materialized view — fast!) ─────────────
    const { rows: bowlRows } = await pool.query(`
      SELECT player_name AS name, total_wickets AS career_wickets, innings AS bowl_innings
      FROM player_bowl_stats
    `);
    const bowlMap = new Map(bowlRows.map(r => [r.name, r]));

    // ── 4. Assemble player list ───────────────────────────────────────────────
    const countries = new Set();
    const playerData = playerRows.map(p => {
      const country = countryMap.get(p.name) ?? '';
      const role    = classifyRole(p.name, batMap, bowlMap);
      if (country) countries.add(country);
      return { name: p.name, country, role };
    });

    return NextResponse.json({
      players:    playerData.map(p => p.name),          // backward-compat plain list
      playerData,                                         // [{name, country, role}]
      countries:  Array.from(countries).sort(),
    });

  } catch (error) {
    console.error('Players API error:', error);
    // Graceful fallback — plain names only
    try {
      const { rows } = await pool.query('SELECT name FROM players ORDER BY name ASC');
      return NextResponse.json({
        players:    rows.map(r => r.name),
        playerData: rows.map(r => ({ name: r.name, country: '', role: 'BAT' })),
        countries:  [],
      });
    } catch {
      return NextResponse.json({ error: true, message: error.message }, { status: 500 });
    }
  }
}
