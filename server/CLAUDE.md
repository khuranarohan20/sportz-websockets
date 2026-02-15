# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time sports API built with Express.js that provides WebSocket-based live match updates and commentary. The project uses Neon Postgres with Drizzle ORM and implements security middleware via Arcjet.

## Development Commands

- **Start development server**: `npm run dev` - Runs with `--watch` flag for auto-reload on file changes
- **Start production server**: `npm start` - Runs the server without watch mode
- **Generate database migrations**: `npm run db:generate` - Generates migration files from schema changes
- **Apply database migrations**: `npm run db:migrate` - Applies pending migrations to the database

## Architecture

### Project Structure

The application follows a modular pattern with clear separation of concerns:

- **Entry point**: `src/index.js` - Express app setup with HTTP and WebSocket servers
- **Database layer**:
  - `src/db/schema.js` - Drizzle ORM schema definitions (matches, commentary tables)
  - `src/db/db.js` - Database connection pool and Drizzle client
- **Routes**:
  - `src/routes/matches.js` - Match CRUD operations and score updates
  - `src/routes/commentary.js` - Commentary endpoints nested under matches
- **WebSocket**: `src/ws/server.js` - Real-time pub/sub system for match events
- **Validation**: `src/validation/` - Zod schemas for request validation
- **Security**: `src/config/arcjet.js` - Arcjet security middleware for HTTP and WebSocket

### Technology Stack

- **Runtime**: Node.js (>=18 required for Express 5.x dependencies)
- **Framework**: Express.js 5.2.1
- **Module system**: Native ES modules (`"type": "module"`)
- **Database**: Neon Postgres with node-postgres driver
- **ORM**: Drizzle ORM
- **Real-time**: WebSocket (ws) server for live updates
- **Security**: Arcjet (shield, bot detection, rate limiting)
- **Validation**: Zod schemas

### Core Features

1. **Match Management**:
   - Create/list matches with automatic status determination (scheduled/live/finished)
   - Update scores via PATCH endpoint at `/matches/:id/score`
   - Match status derived from startTime/endTime in `src/utils/match-status.js`

2. **Real-time Commentary**:
   - Nested routes: `/matches/:id/commentary`
   - Commentary broadcasts to WebSocket subscribers
   - Indexed by matchId, minute, and sequence

3. **WebSocket Pub/Sub**:
   - Path: `/ws`
   - Clients subscribe to specific matches via `{"type": "subscribe", "matchId": N}`
   - Broadcasts: `match_created` (all clients) and `commentary` (match subscribers only)
   - Heartbeat ping/pong for connection health monitoring

### Security Implementation

- **Arcjet middleware** applied to all routes after JSON parser
- **Rate limiting**:
  - HTTP: 50 requests per 10 seconds (`src/constants/arcjet.js`)
  - WebSocket: 5 requests per 2 seconds (on connection)
- **Bot detection**: Allows search engines and preview bots
- **Modes**: Controlled by `ARCJET_MODE` env var (`LIVE` or `DRY_RUN`)

### Database Schema

**TypeScript Implementation:**
- Schema definitions in `src/db/schema.ts` (TypeScript)
- Database client in `src/db/db.ts` (TypeScript with typed exports)
- Type exports: `Match`, `NewMatch`, `Commentary`, `NewCommentary`
- Drizzle ORM automatically infers types from schemas - no manual type definitions needed

**Matches table** (`src/db/schema.ts:19`):
- Fields: id, sport, homeTeam, awayTeam, status, startTime, endTime, homeScore, awayScore, timestamps
- Status enum: scheduled, live, finished
- Type-safe queries: `import type { Match, NewMatch } from '../db/db.js'`

**Commentary table** (`src/db/schema.ts:38`):
- Foreign key to matches with cascade delete
- Indexed on matchId and composite (matchId, minute, sequence)
- Supports metadata (JSONB) and tags (array)
- Type-safe queries: `import type { Commentary, NewCommentary } from '../db/db.js'`

**Migration Workflow:**
- Generate migrations: `npm run db:generate` - Drizzle Kit reads TypeScript schemas
- Apply migrations: `npm run db:migrate` - Executes SQL migrations against database
- Migration files use standard SQL (runtime, not compiled) in `drizzle/` directory

### Configuration

- **Port**: `PORT` env var (default 8000)
- **Host**: `HOST` env var (default "0.0.0.0")
- **Database**: `DATABASE_URL` env var (required)
- **Arcjet**: `ARCJET_KEY` and `ARCJET_MODE` (optional - security disabled if missing)

### Important Implementation Details

1. **Environment loading**: `src/config/env.js` must be imported before any other config (imported first in `src/index.js:4`)
2. **WebSocket integration**: Broadcast functions attached to `app.locals` in main file, used by routes
3. **Match status**: Automatically calculated based on startTime/endTime by `getMatchStatus()` utility
4. **Error handling**: Database errors caught and logged, WebSocket broadcast failures don't block HTTP responses
5. **Connection health**: WebSocket server uses ping/pong with interval defined in `src/constants/ws.js`

### Development Notes

- No testing framework currently configured
- No linting or code formatting tools set up
- Routes use `mergeParams: true` for nested routing in commentary router
- All timestamps use timezone-aware timestamps
- Database migrations managed by Drizzle Kit (config in `drizzle.config.js`)
