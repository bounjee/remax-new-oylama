import { NextRequest, NextResponse } from 'next/server';
import { createToken, getAdminPassword, verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === getAdminPassword()) {
      const token = createToken();
      return NextResponse.json({ token });
    }

    return NextResponse.json({ error: 'Yanlış şifre' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Giriş hatası' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
  return NextResponse.json({ valid: true });
}
