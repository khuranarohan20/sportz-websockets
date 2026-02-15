#!/usr/bin/env node

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { matches, commentary } from "../src/db/schema.js";
import { eq, gt } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function cleanup() {
  console.log("🧹 Cleaning up test data from load testing...\n");

  try {
    // Check current counts
    console.log("📊 Current database state:");

    const [matchCount, commentaryCount] = await Promise.all([
      db.select({ count: matches.id }).from(matches),
      db.select({ count: commentary.id }).from(commentary),
    ]);

    console.log(`   Matches: ${matchCount.length}`);
    console.log(`   Commentary entries: ${commentaryCount.length}\n`);

    // Find test matches (matches created during load testing)
    // Load test matches typically have high IDs or were created recently
    const allMatches = await db.select().from(matches).orderBy(matches.id);

    if (allMatches.length === 0) {
      console.log("✅ No matches to clean up");
      await pool.end();
      return;
    }

    console.log(`🗑️  Deleting ${allMatches.length} match(es)...`);

    // Delete all matches (cascade will delete commentary)
    const deleteResult = await db.delete(matches).returning();

    console.log(`✅ Deleted ${deleteResult.length} match(es)`);
    console.log(`✅ Associated commentary entries deleted via cascade\n`);

    // Verify cleanup
    const [remainingMatches, remainingCommentary] = await Promise.all([
      db.select().from(matches),
      db.select().from(commentary),
    ]);

    console.log("📊 Cleanup verification:");
    console.log(`   Remaining matches: ${remainingMatches.length}`);
    console.log(`   Remaining commentary: ${remainingCommentary.length}`);
    console.log("\n✅ Cleanup complete!");

  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

cleanup().catch(console.error);
