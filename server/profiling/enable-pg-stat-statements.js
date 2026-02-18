import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function enablePgStatStatements() {
  const client = await pool.connect();

  try {
    console.log('Enabling pg_stat_statements extension...\n');

    // Enable the extension
    const result = await client.query("CREATE EXTENSION IF NOT EXISTS pg_stat_statements");
    console.log('✓ Extension enabled (or already exists)');

    // Verify installation
    const verify = await client.query(`
      SELECT *
      FROM pg_available_extensions
      WHERE name = 'pg_stat_statements'
    `);

    console.log('\nExtension verification:');
    console.log('  Name:', verify.rows[0].name);
    console.log('  Default version:', verify.rows[0].default_version);
    console.log('  Installed version:', verify.rows[0].installed_version);
    console.log('  Is installed:', verify.rows[0].installed_version ? 'Yes' : 'No');

    // Check current stats
    const stats = await client.query('SELECT count(*) as query_count FROM pg_stat_statements');
    console.log('\nCurrent query count in pg_stat_statements:', stats.rows[0].query_count);

    console.log('\n✓ pg_stat_statements is ready for query profiling');

  } catch (error) {
    console.error('Error enabling pg_stat_statements:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

enablePgStatStatements().catch(console.error);
