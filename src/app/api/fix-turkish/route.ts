import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { turkishUpperCase } from '@/lib/turkish';

export async function GET() {
  try {
    const consultants = await sql`SELECT id, name FROM consultants`;
    let fixed = 0;

    for (const c of consultants.rows) {
      const corrected = turkishUpperCase(c.name).trim();
      if (corrected !== c.name) {
        await sql`UPDATE consultants SET name = ${corrected} WHERE id = ${c.id}`;
        fixed++;
      }
    }

    const votes = await sql`SELECT id, voter_name FROM votes`;
    for (const v of votes.rows) {
      const corrected = turkishUpperCase(v.voter_name).trim();
      if (corrected !== v.voter_name) {
        await sql`UPDATE votes SET voter_name = ${corrected} WHERE id = ${v.id}`;
      }
    }

    return NextResponse.json({ message: `${fixed} danışman ismi düzeltildi` });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
