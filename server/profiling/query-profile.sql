-- Reset statistics before profiling
SELECT pg_stat_statements_reset();

-- After load tests, find slowest queries
SELECT
  LEFT(query, 80) as query_sample,
  calls,
  total_exec_time as total_ms,
  mean_exec_time as avg_ms,
  stddev_exec_time as stddev_ms,
  max_exec_time as max_ms,
  rows
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find most frequently called queries
SELECT
  LEFT(query, 80) as query_sample,
  calls,
  total_exec_time / calls as avg_ms
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;
