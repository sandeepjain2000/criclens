import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country');

    let query = `
      SELECT player_name, COALESCE(nationality, '') AS nationality, COALESCE(is_retired, false) AS is_retired
      FROM player_profiles
    `;
    const params = [];

    if (country) {
      query += ` WHERE nationality = $1`;
      params.push(country);
    }

    query += ` ORDER BY player_name ASC`;

    const pool = getPool('t20');

    const { rows } = await pool.query(query, params);

    // Get unique countries for the dropdown
    const { rows: countryRows } = await pool.query(`
      SELECT DISTINCT nationality FROM player_profiles WHERE nationality IS NOT NULL ORDER BY nationality ASC
    `);
    const countries = countryRows.map(r => r.nationality).filter(Boolean);

    return NextResponse.json({ profiles: rows, countries });
  } catch (error) {
    console.error('Error fetching player profiles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { player_name, is_retired } = body;

    if (!player_name || typeof is_retired !== 'boolean') {
      return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
    }

    const pool = getPool('t20');

    // Upsert logic just in case the profile doesn't exist yet, though it usually should.
    // If it doesn't exist, we can't really guess nationality here, so we only update.
    const { rowCount } = await pool.query(`
      UPDATE player_profiles
      SET is_retired = $1
      WHERE player_name = $2
    `, [is_retired, player_name]);

    if (rowCount === 0) {
      // Profile not found, so insert it with unknown nationality
      await pool.query(`
        INSERT INTO player_profiles (player_name, is_retired)
        VALUES ($1, $2)
      `, [player_name, is_retired]);
    }

    return NextResponse.json({ success: true, player_name, is_retired });
  } catch (error) {
    console.error('Error updating player profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
