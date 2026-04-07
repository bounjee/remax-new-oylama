import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT v.id, v.voter_name, v.created_at,
        m.name as male_vote_name,
        f.name as female_vote_name
      FROM votes v
      LEFT JOIN consultants m ON v.male_vote_id = m.id
      LEFT JOIN consultants f ON v.female_vote_id = f.id
      ORDER BY v.created_at DESC
    `;
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET votes error:', error);
    return NextResponse.json({ error: 'Oylar yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { voter_name, male_vote_id, female_vote_id } = await request.json();

    if (!voter_name || !male_vote_id || !female_vote_id) {
      return NextResponse.json({ error: 'Tüm alanlar zorunludur' }, { status: 400 });
    }

    // Check if voting is open
    const settings = await sql`SELECT value FROM settings WHERE key = 'voting_open'`;
    if (settings.rows.length === 0 || settings.rows[0].value !== 'true') {
      return NextResponse.json({ error: 'Oylama şu anda kapalı' }, { status: 403 });
    }

    // Verify voter is a registered consultant
    const upperVoter = voter_name.toLocaleUpperCase('tr-TR').trim();
    const consultant = await sql`SELECT id FROM consultants WHERE name = ${upperVoter}`;
    if (consultant.rows.length === 0) {
      return NextResponse.json({ error: 'Kayıtlı danışman bulunamadı. Lütfen ad soyadınızı kontrol edin.' }, { status: 404 });
    }

    // Check if already voted
    const existingVote = await sql`SELECT id FROM votes WHERE voter_name = ${upperVoter}`;
    if (existingVote.rows.length > 0) {
      return NextResponse.json({ error: 'Zaten oy kullandınız' }, { status: 409 });
    }

    // Cannot vote for self
    const voterId = consultant.rows[0].id;
    if (voterId === male_vote_id || voterId === female_vote_id) {
      return NextResponse.json({ error: 'Kendinize oy veremezsiniz' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO votes (voter_name, male_vote_id, female_vote_id)
      VALUES (${upperVoter}, ${male_vote_id}, ${female_vote_id})
      RETURNING *
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('POST vote error:', error);
    return NextResponse.json({ error: 'Oy gönderilemedi' }, { status: 500 });
  }
}
