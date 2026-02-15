# Coding Conventions

**Analysis Date:** 2025-02-15

## Naming Patterns

**Files:**
- kebab-case.js for all JavaScript files (e.g., `match-status.js`, `arcjet.js`)
- No TypeScript files (.js extension only)

**Functions:**
- camelCase for all functions (e.g., `getMatchStatus`, `subscribe`, `broadcastToMatch`)
- No special prefix for async functions
- Verb-first naming for actions (`subscribe`, `unsubscribe`, `broadcastToMatch`)
- Noun-first naming for data objects (`matchSubscribers`, `httpArcjet`)

**Variables:**
- camelCase for variables (e.g., `matchId`, `queryResult`, `db`)
- UPPER_SNAKE_CASE for constants (e.g., `MAX_MATCH_QUERY_LIMIT`, `HTTP_ARCJECT_RULES`)
- No underscore prefix for private members

**Types:**
- No TypeScript - all JavaScript with native ES modules

## Code Style

**Formatting:**
- No Prettier configuration
- No ESLint configuration
- 2-space indentation observed across all files
- Single quotes for strings
- No semicolons (automatic semicolon insertion)
- Consistent formatting across codebase despite lack of tooling

**Linting:**
- No linting tools configured

## Import Organization

**Order:**
1. External packages (express, drizzle-orm, ws, zod)
2. Internal modules (relative imports with ./)
3. No type imports (not using TypeScript)

**Grouping:**
- No blank lines between import groups
- Alphabetical ordering within groups
- Named imports only (no default imports)

**Path Aliases:**
- No path aliases configured
- All imports use relative paths

## Error Handling

**Patterns:**
- try/catch in all async route handlers
- Errors logged with console.error
- Consistent error response format: `{ error: string, details?: any }`

**Error Types:**
- Validation errors: 400 status with Zod error details
- Database errors: 500 status with generic message
- Security errors: WebSocket connection closed with specific codes

## Logging

**Framework:**
- console.log for normal output
- console.error for errors

**Patterns:**
- Log errors in catch blocks
- No structured logging
- No log levels (info, warn, debug)

## Comments

**When to Comment:**
- Minimal inline comments
- Comments explain complex logic where not obvious
- No JSDoc or TSDoc

**TODO Comments:**
- Not detected in codebase

## Function Design

**Size:**
- Functions generally under 50 lines
- Route handlers may be longer due to error handling

**Parameters:**
- Destructuring used for objects
- No specific limit on parameter count

**Return Values:**
- Explicit return statements
- Early returns for validation failures
- Async functions return promises

## Module Design

**Exports:**
- Named exports preferred
- Default exports not used

**Barrel Files:**
- No barrel files (index.js files for re-exports)

---

*Convention analysis: 2025-02-15*
*Update when patterns change*
