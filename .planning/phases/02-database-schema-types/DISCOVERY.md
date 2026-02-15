# Phase 2 Discovery: Drizzle ORM TypeScript Integration

**Date:** 2026-02-16
**Research Depth:** Level 2 - Standard Research
**Research Topics:** Drizzle ORM TypeScript best practices, type-safe query patterns, schema inference

---

## Summary

Drizzle ORM is designed from the ground up as a TypeScript-first ORM with automatic type inference. Converting our database layer to TypeScript requires minimal effort—simply renaming `.js` files to `.ts` and adding type annotations for the Drizzle client. Drizzle's type system automatically infers schema types, query result types, and insert/update types.

## Key Findings

### 1. Drizzle is TypeScript-Native

Drizzle ORM describes itself as a "next gen TypeScript ORM" with type safety as a core feature:
- Automatic type synchronization between schema and queries
- Full TypeScript support without hiding SQL
- Schema-first design with explicit, maintainable code

**Sources:**
- [Drizzle ORM Official Documentation](https://orm.drizzle.team/)
- [Drizzle ORM Guide: A TypeScript ORM 90% Lighter Than Prisma](https://eastondev.com/blog/en/posts/media/20251220-drizzle-orm-guide/)
- [The 2025 TypeScript ORM Battle: Prisma vs Drizzle vs Kysely](https://levelup.gitconnected.com/the-2025-typescript-orm-battle-prisma-vs-drizzle-vs-kysely-007ffdfded67)

### 2. Automatic Type Inference from Schemas

Once database schemas are defined in TypeScript, Drizzle automatically provides:
- Table types (e.g., `typeof matches.$inferSelect`)
- Insert types (e.g., `typeof matches.$inferInsert`)
- Query result types based on select statements
- Type-safe enum values from `pgEnum` definitions

**Sources:**
- [Best practices for inferring types in queries with DrizzleORM? - Reddit](https://www.reddit.com/r/typescript/comments/1iolgag/best_practices_for_inferring_types_in_queries/)
- [Drizzle ORM: Infer type of schema including the relations - Stack Overflow](https://stackoverflow.com/questions/76840558/drizzle-orm-infer-type-of-schema-including-the-relations)
- [Select - Drizzle ORM Documentation](https://orm.drizzle.team/docs/select)

### 3. pg-Core Integration for PostgreSQL

Drizzle's `pg-core` provides PostgreSQL-specific features with full type safety:
- Native enum support with `pgEnum`
- JSON/JSONB columns with typed schemas
- Array types (e.g., `text().array()`)
- Index definitions
- Foreign key references with cascade options

All of these are already used in our `schema.js` and will work identically in TypeScript.

**Sources:**
- [Drizzle ORM PostgreSQL Best Practices Guide (2025)](https://gist.github.com/productdevbook/7c9ce3bbeb96b3fabc3c7c2aa2abc717)
- [Custom types - Drizzle ORM Documentation](https://orm.drizzle.team/docs/custom-types)
- [How to Use Drizzle ORM with PostgreSQL in a Next.js 15 Project](https://strapi.io/blog/how-to-use-drizzle-orm-with-postgresql-in-a-next-js-15-project)

### 4. Type-Safe Query Patterns

Drizzle provides type-safe queries through its query builder:
```typescript
// Type inference from select
const matches = await db.select().from(matchesTable);

// Typed insert
const newMatch: typeof matches.$inferInsert = {
  sport: "basketball",
  homeTeam: "Lakers",
  awayTeam: "Warriors",
  // ... required fields
};
await db.insert(matchesTable).values(newMatch);
```

**Sources:**
- [The Ultimate Guide to Drizzle ORM + PostgreSQL (2025 Edition)](https://dev.to/sameer_saleem/the-ultimate-guide-to-drizzle-orm-postgresql-2025-edition-22b)
- [Drizzle ORM Setup Skill - MCP Market](https://mcpmarket.com/tools/skills/drizzle-orm-setup-patterns)

### 5. Common Mistakes to Avoid

Based on community feedback:
1. **Don't hand-roll type definitions** - Use Drizzle's built-in type inference
2. **Don't use Zod for runtime validation of Drizzle types** - Drizzle already provides type safety
3. **Do use `drizzle-zod`** if you need Zod schemas for API validation (but that's Phase 4)

**Sources:**
- [3 Biggest Mistakes with Drizzle ORM - Medium](https://medium.com/@lior-amsalem/3-biggest-mistakes-with-drizzle-orm-1327e2531aff)
- [Implement infering table model with relations - GitHub Issue #695](https://github.com/drizzle-team/drizzle-orm/issues/695)

## Implementation Strategy

### Phase 2-01: Convert Database Schema Definitions
- Rename `src/db/schema.js` → `src/db/schema.ts`
- No code changes needed - Drizzle schemas are already valid TypeScript
- Type inference will be automatic

### Phase 2-02: Type Database Queries and ORM Operations
- Rename `src/db/db.js` → `src/db/db.ts`
- Add explicit type annotation for `db` client: `drizzle<Pool>()`
- Export inferred types for use in routes: `Match`, `NewMatch`, `Commentary`, `NewCommentary`

### Phase 2-03: Add Type-Safe Migrations and Utilities
- Drizzle Kit already generates TypeScript migrations
- Export query builder types from `src/db/schema.ts`
- Create type-safe query helpers if needed

## Tech Stack

**Already installed:**
- `drizzle-orm@^0.45.1` - Includes full TypeScript support
- `drizzle-kit@^0.31.9` - TypeScript-aware migration tool

**No new dependencies needed** - Drizzle ORM is TypeScript-native

## Architecture Patterns

### Pattern 1: Schema Type Export
```typescript
// src/db/schema.ts
export const matches = pgTable("matches", { ... });

// Export inferred types
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
```

### Pattern 2: Typed Database Client
```typescript
// src/db/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

export const db = drizzle<Pool>(pool);
```

### Pattern 3: Type-Safe Queries in Routes
```typescript
// src/routes/matches.ts (Phase 4)
import type { Match, NewMatch } from '../db/schema.js';

const allMatches: Match[] = await db.select().from(matches);
```

## Risks and Considerations

### Low Risk
- Drizzle ORM is designed for TypeScript
- Simple file renames with minimal code changes
- Automatic type inference prevents manual type errors

### Medium Risk
- Need to verify Drizzle Kit generates valid TypeScript migrations
- Should test type inference works with our existing query patterns

### Mitigation
- Phase 2-02 will explicitly test type inference with sample queries
- Phase 2-03 will verify Drizzle Kit migration output

## Open Questions

None - Drizzle ORM's TypeScript integration is well-documented and straightforward.

## Recommendations

1. **Proceed with Phase 2 as planned** - No blocking issues discovered
2. **Use Drizzle's type inference** - Don't create manual type definitions
3. **Export inferred types from schema** - Reuse across application for consistency
4. **Verify migration output** - Ensure Drizzle Kit generates valid TypeScript

---

**Research completed:** 2026-02-16
**Next step:** Create 02-01-PLAN.md (Schema Conversion)
