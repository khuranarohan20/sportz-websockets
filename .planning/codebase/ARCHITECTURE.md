# Architecture

**Analysis Date:** 2025-02-15

## Pattern Overview

**Overall:** Monolithic REST API with WebSocket integration

**Key Characteristics:**
- Single Express.js server handling HTTP and WebSocket
- Database-backed with PostgreSQL via Drizzle ORM
- Event-driven real-time updates via WebSocket pub/sub
- Security middleware integrated throughout
- Native ES modules throughout

## Layers

**API Layer:**
- Purpose: Handle HTTP requests and WebSocket connections
- Contains: Route handlers in `server/src/routes/`
- Depends on: Validation layer, Data layer, WebSocket layer
- Used by: HTTP clients and WebSocket clients

**Validation Layer:**
- Purpose: Request validation and type safety
- Contains: Zod schemas in `server/src/validation/`
- Depends on: Zod library
- Used by: API layer

**Data Layer:**
- Purpose: Database operations and data persistence
- Contains: Database connection, schema definitions in `server/src/db/`
- Depends on: PostgreSQL via pg driver, Drizzle ORM
- Used by: API layer

**Real-time Layer:**
- Purpose: WebSocket connections and live event broadcasting
- Contains: WebSocket server implementation in `server/src/ws/`
- Depends on: ws library, Arcjet for security
- Used by: WebSocket clients

**Security Layer:**
- Purpose: Rate limiting and bot detection
- Contains: Arcjet middleware configuration in `server/src/config/`
- Depends on: Arcjet SDK
- Used by: API layer, WebSocket layer

**Utility Layer:**
- Purpose: Helper functions and business logic
- Contains: Utility functions in `server/src/utils/`
- Depends on: Validation layer
- Used by: API layer

## Data Flow

**HTTP Request:**

1. Request received by Express server (`server/src/index.js`)
2. JSON parsing middleware
3. Arcjet security middleware (rate limiting, bot detection)
4. Route handler matches path (`server/src/routes/`)
5. Request validated against Zod schema
6. Database operation via Drizzle ORM
7. Response sent to client
8. If real-time event: WebSocket broadcast triggered

**WebSocket Connection:**

1. Client connects to `/ws` endpoint
2. Arcjet security check applied
3. WebSocket connection established
4. Client sends subscribe message with matchId
5. Added to match subscriber list
6. Receives broadcasts for subscribed matches
7. Heartbeat ping/pong for connection health

**Real-time Event Broadcast:**

1. API route creates/updates data
2. After database operation, broadcast function called
3. Message sent to all match subscribers
4. WebSocket server delivers to connected clients

**State Management:**
- Stateless HTTP requests
- In-memory WebSocket subscriber tracking (Map in `server/src/ws/server.js`)
- Database as single source of truth

## Key Abstractions

**Route Handler:**
- Purpose: Encapsulate HTTP endpoint logic
- Examples: `server/src/routes/matches.js`, `server/src/routes/commentary.js`
- Pattern: Express Router with async handlers

**Validation Schema:**
- Purpose: Type-safe request validation
- Examples: `server/src/validation/matches.js`, `server/src/validation/commentary.js`
- Pattern: Zod schema with safeParse() in handlers

**Database Table:**
- Purpose: Data persistence and relationships
- Examples: matches table, commentary table in `server/src/db/schema.js`
- Pattern: Drizzle ORM pgTable with indexes

**WebSocket Subscription:**
- Purpose: Real-time event delivery
- Location: `server/src/ws/server.js`
- Pattern: Map<matchId, Set<socket>> for subscriber tracking

**Broadcast Function:**
- Purpose: Send events to WebSocket clients
- Examples: broadcastMatchCreated, broadcastCommentary
- Pattern: Functions attached to app.locals, called by routes

## Entry Points

**Main Entry:**
- Location: `server/src/index.js`
- Triggers: HTTP requests, WebSocket connections
- Responsibilities: Server setup, middleware configuration, route registration, WebSocket attachment

**Database Initialization:**
- Location: `server/src/db/db.js`
- Triggers: First import when routes load
- Responsibilities: Connection pool creation, Drizzle client export

**WebSocket Server:**
- Location: `server/src/ws/server.js`
- Triggers: HTTP server upgrade to WebSocket
- Responsibilities: Connection handling, subscription management, message broadcasting

## Error Handling

**Strategy:** Try/catch in route handlers, consistent error response format

**Patterns:**
- Routes use try/catch for async operations
- Validation errors return 400 with details
- Database errors return 500 with generic message
- WebSocket errors logged and connections closed

## Cross-Cutting Concerns

**Logging:**
- console.log for normal output
- console.error for errors
- No structured logging framework

**Validation:**
- Zod schemas at route handler entry
- Centralized in `server/src/validation/` directory

**Authentication:**
- None currently (public API)

**Security:**
- Arcjet middleware applied globally after JSON parser
- Rate limiting: 50 req/10s HTTP, 5 req/2s WebSocket
- Bot detection enabled

---

*Architecture analysis: 2025-02-15*
*Update when major patterns change*
