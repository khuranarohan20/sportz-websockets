import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

// Re-export schema types for convenient imports in routes
export type { Match, NewMatch, Commentary, NewCommentary } from './schema.js';

// Type inference examples:
// const allMatches: Match[] = await db.select().from(matches);
// const newMatch: NewMatch = { sport: 'basketball', homeTeam: 'Lakers', awayTeam: 'Warriors', startTime: new Date() };
// await db.insert(matches).values(newMatch);
