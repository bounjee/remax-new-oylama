import { sql } from '@vercel/postgres';

export async function initializeDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS consultants (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      gender VARCHAR(10) NOT NULL CHECK (gender IN ('ERKEK', 'KADIN')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      voter_name VARCHAR(255) NOT NULL,
      male_vote_id INTEGER REFERENCES consultants(id),
      female_vote_id INTEGER REFERENCES consultants(id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(255) PRIMARY KEY,
      value VARCHAR(255) NOT NULL
    )
  `;

  await sql`
    INSERT INTO settings (key, value) VALUES ('voting_open', 'false')
    ON CONFLICT (key) DO NOTHING
  `;
}

export { sql };
