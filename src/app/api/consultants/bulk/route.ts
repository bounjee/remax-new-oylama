import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    const { data } = await request.json();
    const lines: string[] = data.split('\n').filter((l: string) => l.trim());

    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length !== 2) {
        errors.push(`Hatalı format: ${line}`);
        skipped++;
        continue;
      }

      const name = parts[0].toUpperCase().trim();
      const gender = parts[1].toUpperCase().trim();

      if (gender !== 'ERKEK' && gender !== 'KADIN') {
        errors.push(`Geçersiz cinsiyet: ${line}`);
        skipped++;
        continue;
      }

      const existing = await sql`SELECT id FROM consultants WHERE UPPER(name) = ${name}`;
      if (existing.rows.length > 0) {
        errors.push(`Zaten kayıtlı: ${name}`);
        skipped++;
        continue;
      }

      await sql`INSERT INTO consultants (name, gender) VALUES (${name}, ${gender})`;
      added++;
    }

    return NextResponse.json({ added, skipped, errors });
  } catch (error) {
    console.error('Bulk add error:', error);
    return NextResponse.json({ error: 'Toplu ekleme hatası' }, { status: 500 });
  }
}
