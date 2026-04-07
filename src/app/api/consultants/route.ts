import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

function isAdmin(request: NextRequest): boolean {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  return !!token && verifyToken(token);
}

export async function GET() {
  try {
    const result = await sql`
      SELECT c.*,
        CASE WHEN v.consultant_id IS NOT NULL THEN true ELSE false END as has_voted
      FROM consultants c
      LEFT JOIN (
        SELECT DISTINCT voter_name as consultant_id FROM votes
      ) v ON c.name = v.consultant_id
      ORDER BY c.name ASC
    `;

    // Simpler query - get consultants and check if they voted by name
    const consultants = await sql`SELECT * FROM consultants ORDER BY name ASC`;
    const votes = await sql`SELECT DISTINCT voter_name FROM votes`;
    const voterNames = new Set(votes.rows.map(v => v.voter_name));

    const data = consultants.rows.map(c => ({
      ...c,
      has_voted: voterNames.has(c.name)
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET consultants error:', error);
    return NextResponse.json({ error: 'Danışmanlar yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const { name, gender } = await request.json();

    if (!name || !gender) {
      return NextResponse.json({ error: 'Ad soyad ve cinsiyet gerekli' }, { status: 400 });
    }

    const upperName = name.toUpperCase().trim();
    const upperGender = gender.toUpperCase().trim();

    if (upperGender !== 'ERKEK' && upperGender !== 'KADIN') {
      return NextResponse.json({ error: 'Cinsiyet ERKEK veya KADIN olmalı' }, { status: 400 });
    }

    // Check duplicate
    const existing = await sql`SELECT id FROM consultants WHERE UPPER(name) = ${upperName}`;
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Bu danışman zaten kayıtlı' }, { status: 409 });
    }

    const result = await sql`
      INSERT INTO consultants (name, gender) VALUES (${upperName}, ${upperGender})
      RETURNING *
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('POST consultant error:', error);
    return NextResponse.json({ error: 'Danışman eklenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    await sql`DELETE FROM votes WHERE male_vote_id = ${id} OR female_vote_id = ${id}`;
    await sql`DELETE FROM consultants WHERE id = ${id}`;
    return NextResponse.json({ message: 'Danışman silindi' });
  } catch (error) {
    console.error('DELETE consultant error:', error);
    return NextResponse.json({ error: 'Danışman silinemedi' }, { status: 500 });
  }
}
