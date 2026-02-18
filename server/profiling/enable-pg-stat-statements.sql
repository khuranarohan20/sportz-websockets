-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Verify installation
SELECT *
FROM pg_available_extensions
WHERE name = 'pg_stat_statements';

-- Check current stats (should be empty initially)
SELECT count(*) as query_count
FROM pg_stat_statements;
