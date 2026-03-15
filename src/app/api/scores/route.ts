import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT username, score, level, kills, max_combo, weapon, created_at
      FROM scores
      ORDER BY score DESC
      LIMIT 100
    `;
    return NextResponse.json({ scores: rows });
  } catch (e) {
    console.error('Leaderboard fetch error:', e);
    return NextResponse.json({ scores: [], error: 'Failed to fetch scores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, score, level, kills, maxCombo, weapon } = body;

    // Validate inputs
    if (typeof score !== 'number' || score < 0 || score > 99999999) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }
    if (typeof level !== 'number' || level < 1 || level > 9999) {
      return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
    }
    if (typeof kills !== 'number' || kills < 0 || kills > 999999) {
      return NextResponse.json({ error: 'Invalid kills' }, { status: 400 });
    }

    const sanitizedName = String(username || 'ANON').replace(/[^a-zA-Z0-9_\-. ]/g, '').slice(0, 20) || 'ANON';
    const safeCombo = typeof maxCombo === 'number' ? Math.max(0, Math.min(maxCombo, 99999)) : 0;
    const safeWeapon = String(weapon || 'pulse_pistol').slice(0, 50);

    const sql = getDb();
    await sql`
      INSERT INTO scores (username, score, level, kills, max_combo, weapon)
      VALUES (${sanitizedName}, ${score}, ${level}, ${kills}, ${safeCombo}, ${safeWeapon})
    `;

    // Return the player's rank
    const rankResult = await sql`
      SELECT COUNT(*) + 1 AS rank FROM scores WHERE score > ${score}
    `;
    const rank = rankResult[0]?.rank ?? '?';

    return NextResponse.json({ success: true, rank });
  } catch (e) {
    console.error('Score submit error:', e);
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 });
  }
}
