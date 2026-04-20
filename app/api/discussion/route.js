import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch up to 150 to ensure we capture threads
        const query = `
            SELECT id, username, content, created_at, parent_id
            FROM discussion_posts
            ORDER BY created_at ASC
            LIMIT 150
        `;
        const { rows } = await pool.query(query);
        return NextResponse.json({ success: true, posts: rows });
    } catch (error) {
        console.error("Discussion GET Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, content, parent_id } = body;

        if (!username || !content || !username.trim() || !content.trim()) {
            return NextResponse.json({ success: false, error: "Username and content are required" }, { status: 400 });
        }

        const limitQuery = `
            SELECT COUNT(*) as recent_count
            FROM discussion_posts
            WHERE created_at > NOW() - INTERVAL '1 day'
        `;
        const { rows: limitRows } = await pool.query(limitQuery);
        const recentCount = parseInt(limitRows[0].recent_count, 10);

        if (recentCount >= 100) {
            return NextResponse.json({ 
                success: false, 
                error: "Global daily limit reached (100 posts/day). Please try again tomorrow." 
            }, { status: 429 });
        }

        const safeParentId = parent_id ? parseInt(parent_id, 10) : null;

        const insertQuery = `
            INSERT INTO discussion_posts (username, content, parent_id)
            VALUES ($1, $2, $3)
            RETURNING id, username, content, created_at, parent_id
        `;
        const { rows: insertedRows } = await pool.query(insertQuery, [
            username.trim().substring(0, 50), 
            content.trim().substring(0, 1000),
            safeParentId
        ]);

        return NextResponse.json({ success: true, post: insertedRows[0] });

    } catch (error) {
        console.error("Discussion POST Error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
