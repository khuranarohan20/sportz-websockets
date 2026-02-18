import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetStats() {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_stat_statements_reset()');
    console.log('✓ Statistics reset\n');
  } finally {
    client.release();
  }
}

async function getSlowestQueries() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        LEFT(query, 100) as query_sample,
        calls,
        total_exec_time as total_ms,
        mean_exec_time as avg_ms,
        stddev_exec_time as stddev_ms,
        max_exec_time as max_ms,
        rows
      FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      ORDER BY mean_exec_time DESC
      LIMIT 20
    `);

    console.log('## Top 20 Slowest Queries (by average execution time)\n');
    console.log('| Query | Calls | Total (ms) | Avg (ms) | StdDev (ms) | Max (ms) | Rows |');
    console.log('|-------|-------|------------|----------|-------------|----------|------|');

    for (const row of result.rows) {
      console.log(`| ${row.query_sample} | ${row.calls} | ${row.total_ms.toFixed(2)} | ${row.avg_ms.toFixed(2)} | ${row.stddev_ms.toFixed(2)} | ${row.max_ms.toFixed(2)} | ${row.rows} |`);
    }

    console.log('\n');
    return result.rows;
  } finally {
    client.release();
  }
}

async function getMostFrequentQueries() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        LEFT(query, 100) as query_sample,
        calls,
        total_exec_time / calls as avg_ms
      FROM pg_stat_statements
      ORDER BY calls DESC
      LIMIT 20
    `);

    console.log('## Top 20 Most Frequently Called Queries\n');
    console.log('| Query | Calls | Avg (ms) |');
    console.log('|-------|-------|----------|');

    for (const row of result.rows) {
      console.log(`| ${row.query_sample} | ${row.calls} | ${row.avg_ms.toFixed(2)} |`);
    }

    console.log('\n');
    return result.rows;
  } finally {
    client.release();
  }
}

async function getTotalStats() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        count(*) as total_queries,
        sum(calls) as total_calls,
        sum(total_exec_time) as total_time_ms
      FROM pg_stat_statements
    `);

    const row = result.rows[0];
    console.log('## Overall Database Statistics\n');
    console.log(`- Unique queries: ${row.total_queries}`);
    console.log(`- Total executions: ${row.total_calls}`);
    console.log(`- Total execution time: ${row.total_time_ms.toFixed(2)} ms (${(row.total_time_ms / 1000).toFixed(2)} seconds)`);
    console.log(`- Average execution time: ${(row.total_time_ms / row.total_calls).toFixed(2)} ms`);
    console.log('\n');

    return row;
  } finally {
    client.release();
  }
}

// Main execution
const command = process.argv[2];

if (command === 'reset') {
  resetStats().catch(console.error);
} else if (command === 'profile') {
  getTotalStats()
    .then(() => getSlowestQueries())
    .then(() => getMostFrequentQueries())
    .then(() => pool.end())
    .catch(console.error);
} else {
  console.log('Usage: node run-profile.js [reset|profile]');
  console.log('  reset   - Reset pg_stat_statements statistics');
  console.log('  profile - Display query performance profile');
  process.exit(1);
}
