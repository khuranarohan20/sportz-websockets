# TypeScript Sports API - Performance & Type Safety

## What This Is

A real-time sports API built with Express.js, WebSocket support, and PostgreSQL. Currently in JavaScript, this project will convert to TypeScript for type safety and improve performance/scalability before building a v2.0 React client application.

## Core Value

**Type-safe codebase with measurable performance improvements.** Every change must either enhance type safety or demonstrably improve performance metrics (req/sec, latency, database throughput).

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

✓ REST API with match CRUD operations — existing
✓ WebSocket-based real-time match commentary — existing
✓ PostgreSQL database with Drizzle ORM — existing
✓ Match status automation (scheduled/live/finished) — existing
✓ Arcjet security middleware (rate limiting, bot detection) — existing
✓ Load testing infrastructure with autocannon — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Complete TypeScript conversion of entire server codebase
- [ ] Achieve measurable performance improvements in req/sec
- [ ] Reduce latency in database operations
- [ ] Improve WebSocket connection scaling
- [ ] Establish performance benchmarks and monitoring

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- React Vite client — deferred to v2.0 milestone
- Authentication system — not required for v1.0
- Testing framework — load testing only for now
- Breaking API changes — must maintain backward compatibility

## Context

**Existing Codebase State:**
- Monolithic REST API + WebSocket server in `server/src/`
- Single Express.js 5.2.1 instance handling HTTP and WebSocket
- PostgreSQL via Neon with Drizzle ORM
- Native ES modules throughout (`"type": "module"`)
- Real-time pub/sub via WebSocket with match-specific subscriptions
- Arcjet security middleware for rate limiting and bot detection

**Current Performance Baseline** (from load-tests/):
- Read performance: ~36,889 req/sec on health endpoint
- Write performance: ~40-50 req/sec (database bottleneck)
- WebSocket: scales to 1000+ concurrent connections
- Bottleneck: Database write operations and connection pooling

**Technical Environment:**
- Node.js 18+ runtime required
- Zod 4.3.6 for request validation (existing type safety layer)
- No testing framework configured
- Load testing with autocannon

**Conversion Approach:**
- Big bang conversion: rewrite entire server in TypeScript at once
- More disruptive than incremental but faster overall
- Allows for comprehensive type system design

## Constraints

- **Type System**: Must use strict TypeScript with no `any` types — ensures type safety goals
- **Performance**: Must achieve measurable improvements in quantifiable metrics — req/sec, latency, database throughput
- **Compatibility**: No breaking changes to existing API — maintains backward compatibility
- **Timeline**: React client (v2.0) blocked until server TypeScript conversion and performance improvements complete

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript conversion approach | Big bang conversion faster than incremental despite disruption | — Pending |
| v1.0 scope | Server-side only, defer client to v2.0 | — Pending |
| Performance requirement | User wants quantifiable metrics, not just "feels faster" | — Pending |
| No breaking changes | API consumers depend on existing endpoints | — Pending |

---
*Last updated: 2025-02-15 after initialization*
