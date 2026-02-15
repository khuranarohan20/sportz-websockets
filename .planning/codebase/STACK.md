# Technology Stack

**Analysis Date:** 2025-02-15

## Languages

**Primary:**
- JavaScript - All application code in `server/src/`

**Secondary:**
- JSON - Configuration files (package.json, drizzle.config.js)

## Runtime

**Environment:**
- Node.js 18+ (required for Express 5.x dependencies)
- ES modules (`"type": "module"` in `server/package.json`)

**Package Manager:**
- npm
- Lockfile: `server/package-lock.json` present

## Frameworks

**Core:**
- Express.js 5.2.1 - Web server framework
- ws 8.19.0 - WebSocket implementation for real-time features

**Testing:**
- No testing framework configured
- autocannon - Load testing only

**Build/Dev:**
- Drizzle Kit - Database migration tool
- No bundler (native ES modules)

## Key Dependencies

**Critical:**
- drizzle-orm 0.45.1 - Database ORM and schema management
- pg 8.18.0 - PostgreSQL driver
- zod 4.3.6 - Request validation and type safety
- express 5.2.1 - HTTP routing and middleware
- ws 8.19.0 - WebSocket server implementation
- @arcjet/node 1.0.0-beta.11 - Security middleware (rate limiting, bot detection)

**Infrastructure:**
- dotenv 17.3.1 - Environment variable management
- drizzle-kit 0.31.9 - Database migration generation

## Configuration

**Environment:**
- `.env` files for environment variables
- Key configs: `DATABASE_URL` (PostgreSQL connection), `ARCJET_KEY` (security), `ARCJET_MODE` (LIVE/DRY_RUN)
- Location: `server/.env`

**Build:**
- `server/drizzle.config.js` - Drizzle ORM configuration
- `server/package.json` - Project dependencies and scripts

## Platform Requirements

**Development:**
- Any platform with Node.js 18+
- PostgreSQL database (Neon recommended)
- No additional tooling required

**Production:**
- Node.js 18+ runtime
- Neon Postgres for database
- Port 8000 (configurable via PORT env var)

---

*Stack analysis: 2025-02-15*
*Update after major dependency changes*
