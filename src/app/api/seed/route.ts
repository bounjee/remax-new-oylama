import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

export async function GET() {
  try {
    await initializeDatabase();
    return NextResponse.json({ message: 'Veritabanı başarıyla oluşturuldu' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Veritabanı oluşturulamadı' }, { status: 500 });
  }
}
