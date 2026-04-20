import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SCHEMA = `
TABLE matches (
    match_id TEXT PRIMARY KEY,
    match_type TEXT,
    gender TEXT,
    start_date TEXT,
    end_date TEXT,
    dates_json TEXT,
    venue TEXT,
    city TEXT,
    team1 TEXT,
    team2 TEXT,
    toss_winner TEXT,
    toss_decision TEXT,
    outcome_winner TEXT,
    outcome_result TEXT,
    outcome_by_type TEXT,
    outcome_by_value INTEGER,
    balls_per_over INTEGER DEFAULT 6,
    event_name TEXT,
    event_match_number INTEGER,
    season TEXT,
    umpires_json TEXT,
    match_referees_json TEXT,
    json_file_path TEXT,
    data_version TEXT,
    imported_at TEXT NOT NULL
)

TABLE innings (
    id SERIAL PRIMARY KEY,
    match_id TEXT NOT NULL,
    innings_number INTEGER NOT NULL,
    team TEXT,
    declared INTEGER DEFAULT 0,
    forfeited INTEGER DEFAULT 0,
    target_runs INTEGER,
    target_overs REAL,
    FOREIGN KEY (match_id) REFERENCES matches(match_id)
)

TABLE overs (
    id SERIAL PRIMARY KEY,
    innings_id INTEGER NOT NULL,
    match_id TEXT NOT NULL,
    over_number INTEGER NOT NULL,
    FOREIGN KEY (innings_id) REFERENCES innings(id)
)

TABLE deliveries (
    id SERIAL PRIMARY KEY,
    over_id INTEGER NOT NULL,
    innings_id INTEGER NOT NULL,
    match_id TEXT NOT NULL,
    ball_in_over INTEGER,
    batter TEXT,
    non_striker TEXT,
    bowler TEXT,
    runs_batter INTEGER DEFAULT 0,
    runs_extras INTEGER DEFAULT 0,
    runs_total INTEGER DEFAULT 0,
    extras_wides INTEGER DEFAULT 0,
    extras_noballs INTEGER DEFAULT 0,
    extras_byes INTEGER DEFAULT 0,
    extras_legbyes INTEGER DEFAULT 0,
    extras_penalty INTEGER DEFAULT 0,
    is_wicket INTEGER DEFAULT 0,
    wicket_kind TEXT,
    wicket_player_out TEXT,
    wickets_json TEXT,
    review_json TEXT,
    replacements_json TEXT,
    FOREIGN KEY (over_id) REFERENCES overs(id)
)

TABLE players (
    identifier TEXT PRIMARY KEY,
    name TEXT NOT NULL
)

TABLE match_players (
    match_id TEXT NOT NULL,
    team TEXT NOT NULL,
    player_name TEXT NOT NULL,
    player_id TEXT,
    PRIMARY KEY (match_id, team, player_name),
    FOREIGN KEY (match_id) REFERENCES matches(match_id)
)
`;

export async function POST(req) {
    try {
        const { query } = await req.json();
        

        const sqlPrompt = `
You are a Text-to-SQL assistant for a Cricket Database.
Generate ONLY a syntactically correct PostgreSQL query without any markdown wrapping or explanation.
Use ONLY the following schema:
${SCHEMA}

The user's query is: "${query}"

Guidelines:
- When calculating percentages across a team, ALWAYS use \`CASE\` to conditionally sum the subset within the total team queries, instead of a restrictive WHERE clause. E.g., \`SELECT (SUM(CASE WHEN batter = 'Player' THEN runs_batter ELSE 0 END) * 100.0) / SUM(runs_total) FROM deliveries d JOIN innings i ON d.innings_id = i.id WHERE i.team = 'Country'\`. DO NOT restrict the global \`WHERE\` clause to just the player.
- When calculating player batting runs, use: \`SUM(runs_batter) FROM deliveries WHERE batter = 'Player Name'\`.
- When calculating team runs or filtering by batting team, join the \`innings\` table: \`JOIN innings i ON deliveries.match_id = i.match_id AND deliveries.innings_id = i.id WHERE i.team = 'Country'\`.
- When filtering by year, you can do: \`JOIN matches m ON deliveries.match_id = m.match_id WHERE m.start_date LIKE 'YYYY%'\`.
- When finding most wickets for a bowler, use: \`COUNT(wicket_player_out) FROM deliveries WHERE wicket_player_out IS NOT NULL AND wicket_player_out != ''\`.
- Keep the queries performant. Return top 5 or 10 if sorting.
- Do not use markdown like \`\`\`sql ... \`\`\`. ONLY the raw query string.
`;

        let sqlResponse;
        try {
            sqlResponse = await openai.chat.completions.create({
                model: process.env.OPENAI_SQL_MODEL,
                messages: [{ role: "user", content: sqlPrompt }],
                temperature: 0,
            });
        } catch (e) {
            return NextResponse.json({ error: true, answer: "OpenAI connection failed. Ensure your API key is valid." }, { status: 500 });
        }

        let sqlQuery = sqlResponse.choices[0].message.content.trim();
        // Robustly strip Markdown code blocks if the AI still hallucinates them
        const sqlMatch = sqlQuery.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
        if (sqlMatch && sqlMatch[1]) {
            sqlQuery = sqlMatch[1].trim();
        } else {
            sqlQuery = sqlQuery.replace(/^```sql/i, "").replace(/```$/, "").trim();
        }

        let dbResults = [];
        let sqlError = null;
        let ms = 0;
        try {
            // Read-only safety
            if (!sqlQuery.toLowerCase().startsWith("select")) {
                throw new Error("Only SELECT queries are permitted.");
            }
            const startTime = Date.now();
            dbResults = (await pool.query(sqlQuery)).rows;
            ms = Date.now() - startTime;
        } catch (e) {
            sqlError = e.message;
        }

        // Now synthesise an answer based on DB results
        const synthPrompt = `
User asked: "${query}"
The SQL executed was: 
${sqlQuery}

${sqlError ? "BUT IT FAILED WITH ERROR: " + sqlError : "Database Results (JSON): " + JSON.stringify(dbResults)}

Provide a helpful, professional, and interesting summary of the answer based on these database results. Keep it to 2-3 sentences.
Then provide up to 3 'stats' based on the results to display in a UI widgets.

FORMAT YOUR RESPONSE EXACTLY AS VALID JSON with keys:
"answer": "string containing 2-3 sentence summary",
"stats": [{"label": "Short Title", "value": "Number/String"}, ...]
`;

        let synthResponse = await openai.chat.completions.create({
            model: process.env.OPENAI_EXPLAIN_MODEL,
            messages: [{ role: "user", content: synthPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.2,
        });

        const finalParsed = JSON.parse(synthResponse.choices[0].message.content);

        // Write log for debugging
        const logEntry = `\n[${new Date().toISOString()}] USER QUERY: ${query}\nSQL EXEC: ${sqlQuery}\nERROR: ${sqlError || 'None'}\nDB RESULTS: ${JSON.stringify(dbResults)}\n----------------------------------------\n`;
        try {
            fs.appendFileSync(path.join(process.cwd(), 'query_logs.txt'), logEntry);
        } catch (err) {
            console.error("Failed to write to log file", err);
        }

        const columns = dbResults.length > 0 ? Object.keys(dbResults[0]) : [];
        return NextResponse.json({
            question: query,
            query: query,
            sql: sqlQuery,
            columns: columns,
            results: dbResults,
            rowCount: dbResults.length,
            explanation: finalParsed.answer,
            answer: finalParsed.answer,
            ms: ms,
            stats: finalParsed.stats || [],
            error: !!sqlError,
            sqlError: sqlError
        });

    } catch (error) {
        console.error("API error:", error);
        return NextResponse.json({ error: true, answer: error.message }, { status: 500 });
    }
}
