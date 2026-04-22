/**
 * GET /api/team-selector?format=t20i|odi|test&status=Active&role=BAT,WK,AR,BWL&country=India
 *
 * Returns players from player_profiles filtered by international availability
 * and format-specific career status.
 *
 * Uses the T20 Postgres database (SUPABASE_URL_T20) — that's where player_profiles lives.
 */

import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Map URL ?format= param → player_profiles column names
const FORMAT_COL = {
  t20i: { status: 'intl_t20i_status', lastYear: 'intl_t20i_last_year' },
  odi:  { status: 'intl_odi_status',  lastYear: 'intl_odi_last_year'  },
  test: { status: 'intl_test_status', lastYear: 'intl_test_last_year' },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const format   = (searchParams.get('format')  || 't20i').toLowerCase();
  const roles    = searchParams.get('role');      // comma-separated or null = all
  const country  = searchParams.get('country');   // null = all
  const search   = searchParams.get('search');    // partial player name
  const statuses = searchParams.get('status') || 'Active'; // comma-separated statuses to include

  const cols = FORMAT_COL[format];
  if (!cols) {
    return NextResponse.json({ error: `Unknown format '${format}'` }, { status: 400 });
  }

  try {
    const pool = getPool('t20');

    // Build dynamic WHERE clauses
    const conditions = [];
    const params     = [];
    let   p          = 1;

    // Always require the intl_status columns to be populated
    conditions.push(`${cols.status} IS NOT NULL`);

    // Filter by status values
    if (statuses) {
      const statusList = statuses.split(',').map(s => s.trim()).filter(Boolean);
      if (statusList.length === 1) {
        conditions.push(`${cols.status} = $${p++}`);
        params.push(statusList[0]);
      } else if (statusList.length > 1) {
        const placeholders = statusList.map(() => `$${p++}`).join(', ');
        conditions.push(`${cols.status} IN (${placeholders})`);
        params.push(...statusList);
      }
    }

    // Filter by role
    if (roles) {
      const roleList = roles.split(',').map(r => r.trim().toUpperCase()).filter(Boolean);
      if (roleList.length === 1) {
        conditions.push(`playing_role = $${p++}`);
        params.push(roleList[0]);
      } else {
        const placeholders = roleList.map(() => `$${p++}`).join(', ');
        conditions.push(`playing_role IN (${placeholders})`);
        params.push(...roleList);
      }
    }

    // Filter by country / nationality
    if (country) {
      conditions.push(`LOWER(COALESCE(nationality,'')) = LOWER($${p++})`);
      params.push(country);
    }

    // Partial name search
    if (search && search.length > 1) {
      conditions.push(`LOWER(player_name) LIKE $${p++}`);
      params.push(`%${search.toLowerCase()}%`);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const { rows } = await pool.query(`
      SELECT
        player_name,
        COALESCE(nationality, '')          AS nationality,
        COALESCE(playing_role, '')         AS playing_role,
        COALESCE(batting_style, '')        AS batting_style,
        COALESCE(bowling_style, '')        AS bowling_style,
        COALESCE(bowling_type, '')         AS bowling_type,
        intl_t20i_status,
        intl_odi_status,
        intl_test_status,
        intl_t20i_last_year,
        intl_odi_last_year,
        intl_test_last_year,
        intl_available,
        intl_retired_all,
        intl_status_notes
      FROM player_profiles
      ${whereClause}
      ORDER BY nationality ASC, playing_role ASC, player_name ASC
    `, params);

    // Collect unique nationalities for the country filter dropdown
    const { rows: countryRows } = await pool.query(`
      SELECT DISTINCT COALESCE(nationality,'') AS nationality
      FROM player_profiles
      WHERE ${cols.status} IS NOT NULL
        AND ${cols.status} NOT IN ('Never Played','Unknown')
        AND nationality IS NOT NULL AND nationality <> ''
      ORDER BY nationality ASC
    `);

    return NextResponse.json({
      players:   rows,
      countries: countryRows.map(r => r.nationality),
      format,
      total:     rows.length,
    });

  } catch (err) {
    console.error('team-selector API error:', err);
    return NextResponse.json({ error: true, message: err.message }, { status: 500 });
  }
}
