import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    await sql`DELETE FROM votes`;
    return NextResponse.json({ message: 'Tüm oylar sıfırlandı' });
  } catch (error) {
    console.error('Reset votes error:', error);
    return NextResponse.json({ error: 'Oylar sıfırlanamadı' }, { status: 500 });
  }
}
