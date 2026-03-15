import { neon } from '@neondatabase/serverless';

export function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return sql;
}

// Run this once in Neon SQL Editor to create the table:
// CREATE TABLE IF NOT EXISTS scores (
//   id SERIAL PRIMARY KEY,
//   username VARCHAR(20) NOT NULL DEFAULT 'ANON',
//   score INTEGER NOT NULL,
//   level INTEGER NOT NULL,
//   kills INTEGER NOT NULL,
//   max_combo INTEGER NOT NULL DEFAULT 0,
//   weapon VARCHAR(50) NOT NULL DEFAULT 'pulse_pistol',
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
// );
// CREATE INDEX idx_scores_score ON scores(score DESC);
