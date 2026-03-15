import { neon } from '@neondatabase/serverless';

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql;
}

let migrated = false;

export async function ensureTable() {
  if (migrated) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      username VARCHAR(20) NOT NULL DEFAULT 'ANON',
      score INTEGER NOT NULL,
      level INTEGER NOT NULL,
      kills INTEGER NOT NULL,
      max_combo INTEGER NOT NULL DEFAULT 0,
      weapon VARCHAR(50) NOT NULL DEFAULT 'pulse_pistol',
      time_played INTEGER NOT NULL DEFAULT 0,
      damage_dealt INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC)`;
  migrated = true;
}
