# Testing Patterns

**Analysis Date:** 2025-02-15

## Test Framework

**Runner:**
- No unit test framework configured
- No vitest.config or jest.config

**Assertion Library:**
- None (no testing framework)

**Run Commands:**
```bash
# No test commands in package.json
# Only load testing available:
cd server && node load-tests/run-load-tests.js
```

## Test File Organization

**Location:**
- No test files in codebase
- No .test.js or .spec.js files
- No __tests__/ directory

**Naming:**
- No unit tests
- No integration tests
- No E2E tests

**Structure:**
- Only load-test scripts in `server/load-tests/`

## Test Structure

**Suite Organization:**
- No test suites exist

**Patterns:**
- Not applicable

## Mocking

**Framework:**
- No mocking framework used

**Patterns:**
- Not applicable

## Fixtures and Factories

**Test Data:**
- Load test scripts create test data dynamically

**Location:**
- `server/load-tests/cleanup.js` - Test data cleanup

## Coverage

**Requirements:**
- No coverage requirements

**Configuration:**
- No coverage tools configured

**View Coverage:**
- Not available

## Test Types

**Unit Tests:**
- Not implemented

**Integration Tests:**
- Not implemented

**E2E Tests:**
- Not implemented

## Common Patterns

**Load Testing:**
```javascript
// Autocannon for HTTP load testing
// Files: server/load-tests/match-creation.js, commentary-creation.js
// Progressive load from light to extreme
```

**WebSocket Testing:**
```javascript
// WebSocket load testing via ws library
// File: server/load-tests/websocket-load.js
```

**Performance Testing:**
```bash
# Run all load tests
cd server && node load-tests/run-load-tests.js
```

---

*Testing analysis: 2025-02-15*
*Update when test patterns change*
