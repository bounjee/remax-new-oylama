import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

export async function GET() {
  try {
    await initializeDatabase();
    return NextResponse.json({ message: 'Veritabanı başarıyla oluşturuldu' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Veritabanı oluşturulamadı', detail: message }, { status: 500 });
  }
}
