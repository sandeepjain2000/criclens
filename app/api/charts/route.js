import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'top-batters';
        const year = searchParams.get('year') || 'all';
        const opposition = searchParams.get('opposition') || 'all';

        let data = [];

        // Build generic WHERE clauses — use start_date (Postgres schema)
        let yearClause = year !== 'all' ? `AND m.start_date LIKE '${year}%'` : '';
        
        // For batting charts (opposition is the team NOT batting)
        let batOppClause = opposition !== 'all' ? `AND (CASE WHEN m.team1 = i.team THEN m.team2 ELSE m.team1 END) = '${opposition}'` : '';
        
        // For bowling charts (opposition is the team BATTING)
        let bowlOppClause = opposition !== 'all' ? `AND i.team = '${opposition}'` : '';

        if (type === 'top-batters') {
            const query = `
                SELECT d.batter as name, SUM(d.runs_batter) as runs
                FROM deliveries d
                JOIN innings i ON d.innings_id = i.id
                JOIN matches m ON d.match_id = m.match_id
                WHERE 1=1 ${yearClause} ${batOppClause}
                GROUP BY d.batter
                ORDER BY runs DESC
                LIMIT 10
            `;
            const { rows } = await pool.query(query);
            data = rows;
        } 
        else if (type === 'top-bowlers') {
            const query = `
                SELECT d.bowler as name, COUNT(d.wicket_player_out) as wickets
                FROM deliveries d
                JOIN innings i ON d.innings_id = i.id
                JOIN matches m ON d.match_id = m.match_id
                WHERE d.wicket_player_out IS NOT NULL AND d.wicket_player_out != ''
                AND d.wicket_kind NOT IN ('run out', 'retired hurt', 'obstructing the field')
                ${yearClause} ${bowlOppClause}
                GROUP BY d.bowler
                ORDER BY wickets DESC
                LIMIT 10
            `;
            const { rows } = await pool.query(query);
            data = rows;
        }
        else if (type === 'dismissal-types') {
            const query = `
                SELECT d.wicket_kind as name, COUNT(d.wicket_kind) as value
                FROM deliveries d
                JOIN innings i ON d.innings_id = i.id
                JOIN matches m ON d.match_id = m.match_id
                WHERE d.wicket_kind IS NOT NULL AND d.wicket_kind != ''
                ${yearClause} ${bowlOppClause}
                GROUP BY d.wicket_kind
                ORDER BY value DESC
            `;
            const { rows } = await pool.query(query);
            data = rows;
        }
        else if (type === 'team-runs') {
            // Aggregate all teams' total batting runs by year
            const query = `
                SELECT substr(m.start_date, 1, 4) as year, i.team, SUM(d.runs_total) as total_runs
                FROM deliveries d
                JOIN innings i ON d.innings_id = i.id
                JOIN matches m ON d.match_id = m.match_id
                WHERE i.team IN ('India', 'Australia', 'England', 'South Africa', 'New Zealand')
                ${batOppClause}
                GROUP BY substr(m.start_date, 1, 4), i.team
                ORDER BY year ASC
            `;
            const { rows: raw } = await pool.query(query);
            
            // Pivot the data for Recharts LineChart
            const yearsMap = {};
            raw.forEach(row => {
                if (year !== 'all' && row.year !== year) return;
                if (!yearsMap[row.year]) yearsMap[row.year] = { year: row.year };
                yearsMap[row.year][row.team] = row.total_runs;
            });
            data = Object.values(yearsMap).sort((a, b) => parseInt(a.year) - parseInt(b.year));
        }
        else if (type === 'batsman-contribution') {
            const player = searchParams.get('player') || '';
            const host = searchParams.get('host') || 'all';
            const homeAway = searchParams.get('homeAway') || 'all';
            
            if (!player) { data = { matchByMatch: [], yearOnYear: [] }; }
            else {
                // Match-by-match: player runs vs team total runs in innings where player batted
                const matchQuery = `
                    WITH player_innings AS (
                        SELECT
                            d.match_id,
                            d.innings_id,
                            SUM(d.runs_batter) AS player_runs
                        FROM deliveries d
                        WHERE d.batter = $1
                        GROUP BY d.match_id, d.innings_id
                    ),
                    team_innings AS (
                        SELECT
                            d.innings_id,
                            SUM(d.runs_batter) AS team_runs
                        FROM deliveries d
                        GROUP BY d.innings_id
                    )
                    SELECT
                        m.start_date,
                        m.team1,
                        m.team2,
                        i.team AS batting_team,
                        pi.player_runs,
                        ti.team_runs,
                        ROUND(pi.player_runs * 100.0 / NULLIF(ti.team_runs, 0), 1) AS contribution_pct
                    FROM player_innings pi
                    JOIN team_innings ti ON pi.innings_id = ti.innings_id
                    JOIN innings i ON pi.innings_id = i.id
                    JOIN matches m ON pi.match_id = m.match_id
                    WHERE ti.team_runs > 0
                      AND ($2 = 'all' OR m.team1 = $2)
                      AND ($3 = 'all' OR ($3 = 'home' AND i.team = m.team1) OR ($3 = 'away' AND i.team != m.team1))
                    ORDER BY m.start_date ASC
                `;
                const { rows: matchRows } = await pool.query(matchQuery, [player, host, homeAway]);

                const matchByMatch = matchRows.map((r, idx) => ({
                    match:            `${idx + 1}. ${r.start_date?.slice(0, 7)} vs ${r.team1 === r.batting_team ? r.team2 : r.team1}`,
                    player_runs:      Number(r.player_runs),
                    team_runs:        Number(r.team_runs),
                    contribution_pct: Number(r.contribution_pct),
                }));

                // Year on year: sum player runs per year vs team runs per year (only in innings where player batted)
                const yearQuery = `
                    WITH player_innings AS (
                        SELECT
                            d.match_id,
                            d.innings_id,
                            SUM(d.runs_batter) AS player_runs
                        FROM deliveries d
                        WHERE d.batter = $1
                        GROUP BY d.match_id, d.innings_id
                    ),
                    team_innings AS (
                        SELECT
                            d.innings_id,
                            SUM(d.runs_batter) AS team_runs
                        FROM deliveries d
                        GROUP BY d.innings_id
                    )
                    SELECT
                        substr(m.start_date, 1, 4) AS year,
                        SUM(pi.player_runs)        AS player_runs,
                        SUM(ti.team_runs)          AS team_runs,
                        ROUND(SUM(pi.player_runs) * 100.0 / NULLIF(SUM(ti.team_runs), 0), 1) AS contribution_pct
                    FROM player_innings pi
                    JOIN team_innings ti ON pi.innings_id = ti.innings_id
                    JOIN innings i ON pi.innings_id = i.id
                    JOIN matches m ON pi.match_id = m.match_id
                    WHERE ti.team_runs > 0
                      AND ($2 = 'all' OR m.team1 = $2)
                      AND ($3 = 'all' OR ($3 = 'home' AND i.team = m.team1) OR ($3 = 'away' AND i.team != m.team1))
                    GROUP BY substr(m.start_date, 1, 4)
                    ORDER BY year ASC
                `;
                const { rows: yearRows } = await pool.query(yearQuery, [player, host, homeAway]);

                const yearOnYear = yearRows.map(r => ({
                    year:             r.year,
                    player_runs:      Number(r.player_runs),
                    team_runs:        Number(r.team_runs),
                    contribution_pct: Number(r.contribution_pct),
                }));

                data = { matchByMatch, yearOnYear };
            }
        }

        // Populate filter options
        let filters = {};
        if (searchParams.get('getFilters') === 'true') {
            const { rows: filterYears } = await pool.query(`SELECT DISTINCT substr(start_date, 1, 4) as year FROM matches WHERE start_date IS NOT NULL ORDER BY year DESC`);
            const { rows: filterTeams } = await pool.query(`SELECT DISTINCT team FROM innings WHERE team IS NOT NULL ORDER BY team ASC`);
            filters = {
                years: filterYears.map(y => y.year),
                teams: filterTeams.map(t => t.team)
            };
        }

        return NextResponse.json({ success: true, data, filters });

    } catch (error) {
        console.error("Charts API Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
