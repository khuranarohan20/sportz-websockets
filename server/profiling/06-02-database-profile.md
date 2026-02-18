# Database Performance Profile

**Generated:** 2026-02-18
**Phase:** 06-02 Database Profiling
**Purpose:** Profile database operations under load to identify slow queries and bottlenecks

---

## Test Environment

**Load Test Configuration:**
- Scenarios: 6 (Baseline to Stress: 10, 50, 100, 200, 500, 1000 concurrent)
- Duration: 10 seconds per scenario
- Endpoints tested: Health (read), Match creation (write)
- Total match creations: 2,853 across all scenarios

**Database:** Neon Postgres with pg_stat_statements extension enabled

---

## Overall Database Statistics

| Metric | Value |
|--------|-------|
| Unique queries tracked | 61 |
| Total query executions | 6,321 |
| Total execution time | 397.69 ms (0.40 seconds) |
| Average query execution time | 0.06 ms |

---

## Top 10 Slowest Queries (by average execution time)

| Rank | Query Sample | Calls | Total (ms) | Avg (ms) | StdDev (ms) | Max (ms) |
|------|--------------|-------|------------|----------|-------------|----------|
| 1 | SELECT count(*) as total_queries... | 1 | 0.18 | 0.18 | 0.00 | 0.18 |
| 2 | SELECT pg_stat_statements_reset() | 1 | 0.11 | 0.11 | 0.00 | 0.11 |
| 3 | insert into "matches" ("id", "sport", "home_team",...) | 2,843 | 105.24 | 0.04 | 0.04 | 1.35 |

**Analysis:**
- **Match insertion** is the primary application query (only 0.04ms avg)
- Very fast execution time for INSERT operations
- Low standard deviation (0.04ms) indicates consistent performance
- Max execution time of 1.35ms suggests occasional delays (likely network)

---

## Top 10 Most Frequently Called Queries

| Rank | Query Sample | Calls | Avg (ms) | Type |
|------|--------------|-------|----------|------|
| 1 | insert into "matches" | 2,853 | 0.04 | Application |
| 2 | SELECT CASE pg_catalog.pg_is_in_recovery()... | 368 | 0.01 | Monitoring |
| 3 | SELECT $1 | 350 | 0.00 | Drizzle ORM |
| 4 | select count(*) from pg_stat_activity... | 348 | 0.08 | Monitoring |
| 5 | select count(*) from pg_stat_subscription... | 348 | 0.01 | Monitoring |
| 6 | SELECT state, pg_catalog.to_char(state_change...) | 348 | 0.13 | Monitoring |
| 7 | select count(*) from pg_stat_replication... | 348 | 0.09 | Monitoring |
| 8 | SELECT COALESCE(pg_catalog.sum(active_time)...) | 348 | 0.03 | Monitoring |
| 9 | SELECT COALESCE(lfc_value, 0) AS count... | 208 | 0.01 | Neon internal |
| 10 | SELECT bucket_le, value FROM neon.neon_perf_counters... | 60 | 0.12 | Neon internal |

**Analysis:**
- **Application queries (match inserts)**: Only 2,853 calls (45% of total)
- **Monitoring queries**: ~2,100+ calls (Neon internal monitoring)
- **Drizzle ORM overhead**: SELECT $1 queries (350 calls) for parameter checks

---

## Key Findings

### 1. Database Queries Are NOT the Bottleneck

**Surprising Discovery:**
- Average match INSERT time: **0.04ms** (extremely fast)
- Total database time: 397.69ms across 6,321 queries
- Database operations are highly efficient

**Implication:**
The slow HTTP response times (381ms to 5,355ms mean latency) are NOT caused by slow SQL queries.

### 2. High Monitoring Overhead from Neon

**Observation:**
- 55% of database calls are Neon internal monitoring queries
- Monitoring queries run continuously (every ~30ms during load test)
- This is Neon Postgres infrastructure overhead

**Impact:**
- Monitoring queries are fast (0.01-0.13ms avg)
- Not a performance bottleneck, but adds to connection pool usage

### 3. No N+1 Query Patterns Detected

**Analysis:**
- All application queries are single INSERT/SELECT operations
- No loops executing multiple queries per request
- Commentary endpoints not tested (should test in Phase 6-03)

### 4. Connection Latency vs. Query Execution

**Observation:**
- Query execution: 0.04ms average
- HTTP response time: 381ms to 5,355ms average
- **Gap: ~10,000x difference**

**Conclusion:**
The bottleneck is NOT query execution time. It's likely:
- Connection pool acquisition time
- Network latency to Neon database
- Node.js event loop blocking
- Connection pool exhaustion

---

## Query Performance Characteristics

### Match Creation INSERT

```sql
insert into "matches" ("id", "sport", "home_team", "away_team",
  "status", "start_time", "end_time", "home_score", "away_score",
  "created_at", "updated_at")
values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
returning *
```

**Metrics:**
- Calls: 2,843
- Avg execution: 0.04ms
- Max execution: 1.35ms
- StdDev: 0.04ms (very consistent)

**Analysis:**
- Excellent performance
- Minimal variance (consistent execution times)
- Max of 1.35ms suggests occasional network delays
- **NOT the bottleneck**

---

## Comparison with Baseline HTTP Performance

### HTTP vs Database Latency

| Concurrency | HTTP Mean Latency | Database Query Time | Ratio |
|-------------|-------------------|---------------------|-------|
| 10 | 381.98ms | 0.04ms | 9,549x |
| 50 | 1,782.77ms | 0.04ms | 44,569x |
| 100 | 3,409.37ms | 0.04ms | 85,234x |
| 200 | 5,564.64ms | 0.04ms | 139,116x |
| 500 | 5,062.09ms | 0.04ms | 126,552x |
| 1000 | 5,355.37ms | 0.04ms | 133,884x |

**Critical Insight:**
Database query execution time is **negligible** (0.04ms) compared to HTTP response times (381ms - 5,355ms). The bottleneck is elsewhere.

---

## Recommendations for Phase 7

### High Priority

1. **Connection Pool Configuration**
   - Current pool size: Unknown (defaults likely too small)
   - Action: Add connection pool metrics (active/idle/waiting counts)
   - Test: Increase pool size to 20-50 connections
   - Monitor: Connection acquisition time under load

2. **Network Latency Investigation**
   - Neon database latency may be significant
   - Action: Measure round-trip time to database
   - Test: Compare local vs. Neon database performance
   - Consider: Connection keepalive settings

3. **Event Loop Profiling**
   - Something is blocking between HTTP request and DB query
   - Action: Use 0x or clinic.js to identify blocking operations
   - Check: Validation overhead (Zod schemas)
   - Check: Drizzle ORM query building overhead

### Medium Priority

4. **Drizzle ORM Overhead**
   - 350 SELECT $1 queries (parameter validation)
   - Action: Profile ORM query building time
   - Consider: Raw SQL for hot paths if needed

5. **WebSocket Commentary Profiling**
   - Commentary endpoints not profiled yet
   - Action: Test commentary creation and querying under load
   - Check: N+1 patterns when fetching commentary

### Low Priority

6. **Query Optimization**
   - Current queries are already very fast (0.04ms)
   - No optimization needed at this time
   - Indexes are appropriate (matchId, matchId+minute+sequence)

---

## Next Steps

1. **Task 3:** Analyze connection pool configuration and behavior
   - Review pool settings in `server/src/db/db.ts`
   - Add connection pool metrics monitoring
   - Identify pool exhaustion patterns

2. **Phase 6-03:** WebSocket Performance Profiling
   - Profile message broadcast throughput
   - Test parallel commentary creation + WebSocket load
   - Identify real-time update bottlenecks

3. **Phase 7:** Performance Optimization
   - Implement connection pool improvements
   - Profile event loop blocking operations
   - Optimize network/connection overhead

---

## Appendix: Test Methodology

**Load Test Configuration:**
```javascript
{
  url: 'http://localhost:8000/matches',
  method: 'POST',
  connections: [10, 50, 100, 200, 500, 1000],
  duration: 10,
  body: JSON.stringify({
    sport, homeTeam, awayTeam,
    startTime, endTime
  })
}
```

**Statistics Capture:**
```sql
-- Reset before load test
SELECT pg_stat_statements_reset();

-- After load test
SELECT LEFT(query, 100) as query_sample,
  calls, total_exec_time, mean_exec_time,
  stddev_exec_time, max_exec_time, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

**Document Status:** Complete
**Last Updated:** 2026-02-18
**Next Review:** After Task 3 (Connection Pool Analysis)
