import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

function getStyle(p) {
  if (p.deathSR > 180 && p.sr > 140) return "Death Destroyer";
  if (p.ppSR > 150 && p.avg < 35) return "Explosive Opener";
  if (p.ppSR > 140) return "Powerplay Dominator";
  if (p.sr > 155 && p.avg >= 30) return "360° Aggressor";
  if (p.sr > 145) return "All-phase Hitter";
  if (p.avg > 40 && p.sr > 130) return "Classic Accumulator";
  if (p.avg > 40 && p.sr <= 130) return "Anchor";
  if (p.avg > 30 && p.sr <= 135) return "Elegant Anchor";
  return "Elegant Stroker";
}

export async function GET(request) {
  try {
    const pool = getPool('t20');

    // 1. Overall stats
    const overallQuery = `
      SELECT COALESCE(pp.full_name, d.batter) as name, MAX(mp.team) as country,
             COUNT(DISTINCT d.match_id) as innings,
             SUM(d.runs_batter) as runs,
             (SUM(d.runs_batter)::float / NULLIF(COUNT(d.delivery_id),0)) * 100 as sr,
             (SUM(d.runs_batter)::float / NULLIF(SUM(CASE WHEN d.wicket_player_out = d.batter THEN 1 ELSE 0 END), 0)) as avg
      FROM deliveries d
      LEFT JOIN match_players mp ON d.batter = mp.player_name AND d.match_id = mp.match_id
      LEFT JOIN player_profiles pp ON d.batter = pp.player_name
      WHERE d.batter IS NOT NULL
      GROUP BY d.batter, pp.full_name
      HAVING COUNT(DISTINCT d.match_id) >= 15 AND SUM(d.runs_batter) >= 200
    `;

    // 2. Phase stats
    const phaseQuery = `
      SELECT COALESCE(pp.full_name, d.batter) as name,
             CASE WHEN over_number <= 6 THEN 'pp'
                  WHEN over_number BETWEEN 7 AND 15 THEN 'mid'
                  ELSE 'death' END as phase,
             (SUM(runs_batter)::float / NULLIF(COUNT(delivery_id),0)) * 100 as sr
      FROM deliveries d
      LEFT JOIN player_profiles pp ON d.batter = pp.player_name
      WHERE d.batter IS NOT NULL
      GROUP BY d.batter, pp.full_name, 2
    `;

    // 3. Matchup stats (vs Pace / Spin)
    // We try to query delivery_dimensions. If it fails, we fall back.
    let matchupQuery = `
      SELECT COALESCE(pp.full_name, d.batter) as name, dd.bowler_pace_or_spin as btype,
             (SUM(d.runs_batter)::float / NULLIF(COUNT(d.delivery_id),0)) * 100 as sr
      FROM deliveries d
      JOIN delivery_dimensions dd ON d.delivery_id = dd.delivery_id
      LEFT JOIN player_profiles pp ON d.batter = pp.player_name
      WHERE d.batter IS NOT NULL AND dd.bowler_pace_or_spin IN ('Pace', 'Spin')
      GROUP BY d.batter, pp.full_name, dd.bowler_pace_or_spin
    `;

    let overallRes, phaseRes, matchupRes;

    overallRes = await pool.query(overallQuery);
    phaseRes = await pool.query(phaseQuery);

    try {
      matchupRes = await pool.query(matchupQuery);
    } catch (e) {
      // Ignore, matchupRes will be undefined
    }

    const playersMap = {};

    overallRes.rows.forEach(r => {
      playersMap[r.name] = {
        name: r.name,
        country: r.country || "Unknown",
        role: "BAT", // Mock role, normally inferred from db
        sr: Math.round(Number(r.sr)),
        avg: Math.round(Number(r.avg || 0)),
        ppSR: Math.round(Number(r.sr)), // fallbacks
        midSR: Math.round(Number(r.sr)),
        deathSR: Math.round(Number(r.sr)),
        vsPaceSR: Math.round(Number(r.sr)),
        vsSpinSR: Math.round(Number(r.sr)),
      };
    });

    phaseRes.rows.forEach(r => {
      const p = playersMap[r.name];
      if (p) {
        if (r.phase === 'pp') p.ppSR = Math.round(Number(r.sr));
        if (r.phase === 'mid') p.midSR = Math.round(Number(r.sr));
        if (r.phase === 'death') p.deathSR = Math.round(Number(r.sr));
      }
    });

    if (matchupRes) {
      matchupRes.rows.forEach(r => {
        const p = playersMap[r.name];
        if (p) {
          if (r.btype === 'Pace') p.vsPaceSR = Math.round(Number(r.sr));
          if (r.btype === 'Spin') p.vsSpinSR = Math.round(Number(r.sr));
        }
      });
    }

    const data = {};
    Object.values(playersMap).forEach(p => {
      p.style = getStyle(p);
      data[p.name] = p;
    });

    return Response.json({ data });
  } catch (e) {
    console.error('[similar-players]', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
