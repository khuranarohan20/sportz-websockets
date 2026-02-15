# Codebase Concerns

**Analysis Date:** 2025-02-15

## Tech Debt

**Database Write Performance Bottleneck:**
- Issue: Match creation limited to 40-50 req/sec with 5+ second latency under load
- Files: `server/src/routes/matches.js`, `server/src/routes/commentary.js`
- Why: Synchronous database operations with default connection pool settings
- Impact: Cannot scale to real-time sports update volumes (ESPN requires 100+ writes/sec)
- Fix approach: Increase connection pool size, implement async processing queues, add write caching

**Duplicate Error Handling Patterns:**
- Issue: Similar try/catch blocks repeated across all route handlers
- Files: `server/src/routes/matches.js`, `server/src/routes/commentary.js`
- Why: No centralized error handling middleware
- Impact: Code duplication, inconsistent error responses
- Fix approach: Create shared error handler middleware

**No Caching Layer:**
- Issue: Every request hits the database, no caching for frequently accessed data
- Files: All route handlers in `server/src/routes/`
- Why: No caching implemented
- Impact: Unnecessary database load, slower read performance
- Fix approach: Add Redis or in-memory cache for match data

## Known Bugs

**No bugs documented** - Load testing completed successfully without discovering functional bugs

## Security Considerations

**Arcjet Rate Limiting Too Restrictive:**
- Risk: Legitimate traffic blocked for real-time sports app
- Files: `server/src/constants/arcjet.js` (HTTP: 50 req/10s, WS: 5 req/2s)
- Current mitigation: Rate limiting via Arcjet
- Recommendations: Increase limits for sports app use case, implement per-user rate limiting

**Error Messages Expose Internal Details:**
- Risk: Error responses may expose internal implementation details
- Files: `server/src/routes/matches.js` (line 37, 79), `server/src/routes/commentary.js` (line 51, 99)
- Current mitigation: Generic error messages in production
- Recommendations: Sanitize all error messages before sending to clients

**Missing .env.example:**
- Risk: Developers don't know which environment variables are required
- Files: Root directory
- Current mitigation: Documented in CLAUDE.md
- Recommendations: Create .env.example with all required variables

## Performance Bottlenecks

**Database Write Operations:**
- Problem: 40-50 req/sec for match creation, 5+ second latency under load
- Files: `server/src/routes/matches.js` (POST /matches), `server/src/db/db.js`
- Measurement: Load test shows 742x difference between read (36,889 req/sec) and write performance
- Cause: Default pg connection pool, no connection optimization
- Improvement path: Tune pool settings, implement connection pooling, add async queue

**No Query Optimization:**
- Problem: All queries use default Drizzle ORM settings
- Files: `server/src/routes/`
- Measurement: Not measured
- Cause: No query optimization or indexing strategy
- Improvement path: Add composite indexes, analyze slow queries, optimize N+1 patterns

## Fragile Areas

**WebSocket Memory Management:**
- Why fragile: In-memory subscriber tracking without cleanup limits
- Files: `server/src/ws/server.js` (matchSubscribers Map)
- Common failures: Memory leaks with long-lived connections
- Safe modification: Add connection limits, implement subscription timeouts
- Test coverage: No tests for WebSocket memory behavior

**Database Connection Pool:**
- Why fragile: Default settings may not handle production load
- Files: `server/src/db/db.js`
- Common failures: Connection exhaustion under high load
- Safe modification: Configure max connections, add connection timeout
- Test coverage: Only load tested, no unit tests

## Scaling Limits

**Database Write Throughput:**
- Current capacity: 40-50 req/sec (measured via load testing)
- Limit: Connection pool exhaustion, latency spikes
- Symptoms at limit: 5+ second response times, timeouts
- Scaling path: Increase pool size, add write queue, implement caching

**WebSocket Connections:**
- Current capacity: 1000+ concurrent connections (load tested)
- Limit: Memory for in-memory subscriber tracking
- Symptoms at limit: Memory leaks, dropped connections
- Scaling path: Redis pub/sub for distributed WebSocket, connection limits

## Dependencies at Risk

**Arcjet Beta Version:**
- Risk: Using beta version (1.0.0-beta.11) in production
- Impact: Potential breaking changes in stable release
- Migration plan: Monitor for stable release, test upgrade in staging

## Missing Critical Features

**Test Coverage:**
- Problem: No unit, integration, or E2E tests
- Current workaround: Manual testing, load testing only
- Blocks: Safe refactoring, confidence in deployments
- Implementation complexity: Medium (choose framework, write tests)

**Health Check Endpoint:**
- Problem: Only basic "/" endpoint, no comprehensive health check
- Current workaround: Process monitoring
- Blocks: Production monitoring, alerting
- Implementation complexity: Low (add /health endpoint with DB check)

**API Documentation:**
- Problem: No OpenAPI/Swagger documentation
- Current workaround: CLAUDE.md and code reading
- Blocks: Easy API consumption by external developers
- Implementation complexity: Medium (add Swagger/OpenAPI)

## Test Coverage Gaps

**All Untested Areas:**
- What's not tested: Unit tests, integration tests, E2E tests
- Risk: Breaking changes go undetected
- Priority: High
- Difficulty to test: Medium - need to choose framework and write tests from scratch

**WebSocket Message Handling:**
- What's not tested: WebSocket subscription, message parsing, broadcast logic
- Risk: Real-time features fail in production
- Priority: High
- Difficulty to test: Medium - need WebSocket testing utilities

---

*Concerns audit: 2025-02-15*
*Update as issues are fixed or new ones discovered*
