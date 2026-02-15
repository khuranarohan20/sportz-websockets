# External Integrations

**Analysis Date:** 2025-02-15

## APIs & External Services

**Security & Protection:**
- Arcjet - Rate limiting, bot detection, and shielding
  - SDK/Client: @arcjet/node 1.0.0-beta.11
  - Auth: API key in ARCJET_KEY env var
  - Configuration: `server/src/config/arcjet.js`
  - Rate limits: 50 req/10s (HTTP), 5 req/2s (WebSocket) in `server/src/constants/arcjet.js`

## Data Storage

**Databases:**
- Neon PostgreSQL - Primary database for matches and commentary
  - Connection: via DATABASE_URL env var
  - Client: Drizzle ORM 0.45.1 with pg driver 8.18.0
  - Migrations: drizzle-kit migrate in `server/drizzle/` directory
  - Schema: `server/src/db/schema.js` (matches, commentary tables)

**File Storage:**
- None currently (no file upload features)

**Caching:**
- None currently (no caching layer implemented)

## Authentication & Identity

**Auth Provider:**
- None (no user authentication system)
- Public API with rate limiting via Arcjet

**OAuth Integrations:**
- None

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry or similar service)

**Analytics:**
- None

**Logs:**
- stdout/stderr only
- No structured logging service

## CI/CD & Deployment

**Hosting:**
- Not specified (likely standard Node.js deployment)

**CI Pipeline:**
- None configured

## Environment Configuration

**Development:**
- Required env vars: DATABASE_URL, ARCJET_KEY (optional)
- Secrets location: `server/.env` (gitignored)
- Mock/stub services: Arcjet DRY_RUN mode for testing

**Staging:**
- Not configured

**Production:**
- Secrets management: Environment variables
- Failover/redundancy: Dependent on Neon PostgreSQL

## Webhooks & Callbacks

**Incoming:**
- None (no webhook endpoints)

**Outgoing:**
- None (no external webhook calls)

---

*Integration audit: 2025-02-15*
*Update when adding/removing external services*
