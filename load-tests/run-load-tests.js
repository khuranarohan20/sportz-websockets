#!/usr/bin/env node

import { runMatchCreationTest } from "./match-creation.js";
import { runCommentaryCreationTest } from "./commentary-creation.js";
import { runWebSocketLoadTest } from "./websocket-load.js";

const BASE_URL = process.env.API_URL || "http://localhost:8000";

// Test configurations - will progressively increase load
const TEST_SCENARIOS = [
  {
    name: "Light Load",
    matchCreation: { concurrency: 5, duration: 5 },
    commentary: { concurrency: 5, duration: 5 },
    websocket: { clients: 10, duration: 5 },
  },
  {
    name: "Moderate Load",
    matchCreation: { concurrency: 10, duration: 10 },
    commentary: { concurrency: 20, duration: 10 },
    websocket: { clients: 50, duration: 10 },
  },
  {
    name: "High Load",
    matchCreation: { concurrency: 25, duration: 15 },
    commentary: { concurrency: 50, duration: 15 },
    websocket: { clients: 100, duration: 15 },
  },
  {
    name: "Very High Load",
    matchCreation: { concurrency: 50, duration: 20 },
    commentary: { concurrency: 100, duration: 20 },
    websocket: { clients: 200, duration: 20 },
  },
  {
    name: "Extreme Load",
    matchCreation: { concurrency: 100, duration: 30 },
    commentary: { concurrency: 200, duration: 30 },
    websocket: { clients: 500, duration: 30 },
  },
  {
    name: "Stress Test",
    matchCreation: { concurrency: 200, duration: 30 },
    commentary: { concurrency: 400, duration: 30 },
    websocket: { clients: 1000, duration: 30 },
  },
];

function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

function printHeader(text) {
  console.log("\n" + "=".repeat(80));
  console.log(`  ${text}`);
  console.log("=".repeat(80));
}

function printSubheader(text) {
  console.log("\n" + "-".repeat(80));
  console.log(`  ${text}`);
  console.log("-".repeat(80));
}

async function checkServerHealth() {
  try {
    const response = await fetch(`${BASE_URL}/`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function createTestMatch() {
  try {
    const response = await fetch(`${BASE_URL}/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sport: "test",
        homeTeam: "Test Home",
        awayTeam: "Test Away",
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.data.id;
    }
    return null;
  } catch (error) {
    console.error("Failed to create test match:", error.message);
    return null;
  }
}

function analyzeResult(result, testType) {
  const errors = result.errors || 0;
  const timeouts = result.timeouts || 0;
  const total = result.requests.sent || 0;
  const completed = result.requests.completed || 0;
  const successRate = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;
  const errorRate = total > 0 ? (((errors + timeouts) / total) * 100).toFixed(2) : 0;

  let status = "✅ PASS";
  if (errorRate > 5) status = "⚠️  WARN";
  if (errorRate > 10 || successRate < 90) status = "❌ FAIL";

  return {
    status,
    successRate: parseFloat(successRate),
    errorRate: parseFloat(errorRate),
    throughput: result.requests.mean?.toFixed(2) || 0,
    latency: {
      mean: result.latency.mean?.toFixed(2) || 0,
      p95: result.latency.p95?.toFixed(2) || 0,
      p99: result.latency.p99?.toFixed(2) || 0,
    },
  };
}

async function runScenario(scenario, matchId) {
  printSubheader(`Running: ${scenario.name}`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Test Match ID: ${matchId}`);

  const results = {
    scenario: scenario.name,
    tests: {},
    overallStatus: "✅ PASS",
  };

  try {
    // Test 1: Match Creation
    console.log("\n🏟️  Test 1: Match Creation Load");
    console.log(`Concurrency: ${scenario.matchCreation.concurrency}, Duration: ${scenario.matchCreation.duration}s`);
    const matchResult = await runMatchCreationTest(
      scenario.matchCreation.concurrency,
      scenario.matchCreation.duration,
    );
    const matchAnalysis = analyzeResult(matchResult, "matchCreation");
    results.tests.matchCreation = matchAnalysis;

    console.log(`\nStatus: ${matchAnalysis.status}`);
    console.log(`Throughput: ${matchAnalysis.throughput} req/sec`);
    console.log(`Success Rate: ${matchAnalysis.successRate}%`);
    console.log(`Error Rate: ${matchAnalysis.errorRate}%`);
    console.log(`Latency - Mean: ${matchAnalysis.latency.mean}ms, P95: ${matchAnalysis.latency.p95}ms, P99: ${matchAnalysis.latency.p99}ms`);

    // Check server health between tests
    const healthAfterMatch = await checkServerHealth();
    if (!healthAfterMatch) {
      console.error("⚠️  Server health check failed after match creation test!");
      results.overallStatus = "❌ CRITICAL";
      return results;
    }

    // Test 2: Commentary Creation
    console.log("\n💬 Test 2: Commentary Creation Load");
    console.log(`Concurrency: ${scenario.commentary.concurrency}, Duration: ${scenario.commentary.duration}s`);
    const commentaryResult = await runCommentaryCreationTest(
      matchId,
      scenario.commentary.concurrency,
      scenario.commentary.duration,
    );
    const commentaryAnalysis = analyzeResult(commentaryResult, "commentary");
    results.tests.commentary = commentaryAnalysis;

    console.log(`\nStatus: ${commentaryAnalysis.status}`);
    console.log(`Throughput: ${commentaryAnalysis.throughput} req/sec`);
    console.log(`Success Rate: ${commentaryAnalysis.successRate}%`);
    console.log(`Error Rate: ${commentaryAnalysis.errorRate}%`);
    console.log(`Latency - Mean: ${commentaryAnalysis.latency.mean}ms, P95: ${commentaryAnalysis.latency.p95}ms, P99: ${commentaryAnalysis.latency.p99}ms`);

    // Check server health
    const healthAfterCommentary = await checkServerHealth();
    if (!healthAfterCommentary) {
      console.error("⚠️  Server health check failed after commentary test!");
      results.overallStatus = "❌ CRITICAL";
      return results;
    }

    // Test 3: WebSocket Load
    console.log("\n🔌 Test 3: WebSocket Load");
    console.log(`Clients: ${scenario.websocket.clients}, Duration: ${scenario.websocket.duration}s`);
    const wsResult = await runWebSocketLoadTest(
      scenario.websocket.clients,
      matchId,
      scenario.websocket.duration,
    );
    results.tests.websocket = wsResult;

    const wsStatus = wsResult.successRate >= 90 ? "✅ PASS" : wsResult.successRate >= 70 ? "⚠️  WARN" : "❌ FAIL";
    console.log(`\nStatus: ${wsStatus}`);
    console.log(`Connection Success Rate: ${wsResult.successRate}%`);
    console.log(`Subscription Success Rate: ${wsResult.subscriptionRate}%`);
    console.log(`Messages Received: ${wsResult.messagesReceived}`);
    console.log(`Errors: ${wsResult.errors}`);

    // Check server health
    const healthAfterWs = await checkServerHealth();
    if (!healthAfterWs) {
      console.error("⚠️  Server health check failed after WebSocket test!");
      results.overallStatus = "❌ CRITICAL";
      return results;
    }

    // Determine overall status
    const hasFailures = Object.values(results.tests).some((test) => {
      if (test.status) {
        return test.status.includes("FAIL") || test.status.includes("CRITICAL");
      }
      if (test.successRate !== undefined) {
        return test.successRate < 90;
      }
      return false;
    });

    const hasWarnings = Object.values(results.tests).some((test) => {
      if (test.status) {
        return test.status.includes("WARN");
      }
      if (test.successRate !== undefined) {
        return test.successRate < 95 && test.successRate >= 90;
      }
      return false;
    });

    if (hasFailures) {
      results.overallStatus = "❌ FAIL";
    } else if (hasWarnings) {
      results.overallStatus = "⚠️  WARN";
    }

  } catch (error) {
    console.error(`\n❌ Error running scenario: ${error.message}`);
    results.overallStatus = "💥 CRASH";
    results.error = error.message;
  }

  return results;
}

async function main() {
  printHeader("🚀 SPORTS API LOAD TEST SUITE");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Scenarios: ${TEST_SCENARIOS.length}`);
  console.log(`Time estimate: ${TEST_SCENARIOS.reduce((acc, s) => acc + s.matchCreation.duration + s.commentary.duration + s.websocket.duration, 0) / 60} minutes`);

  // Check initial server health
  console.log("\n🔍 Checking server health...");
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    console.error("❌ Server is not responding! Please ensure the server is running.");
    process.exit(1);
  }
  console.log("✅ Server is healthy");

  // Create a test match for commentary tests
  console.log("\n🏟️  Creating test match...");
  const testMatchId = await createTestMatch();
  if (!testMatchId) {
    console.error("❌ Failed to create test match!");
    process.exit(1);
  }
  console.log(`✅ Test match created with ID: ${testMatchId}`);

  const allResults = [];
  let breakingPoint = null;

  // Run each scenario
  for (const scenario of TEST_SCENARIOS) {
    const result = await runScenario(scenario, testMatchId);
    allResults.push(result);

    // Check if we found the breaking point
    if (result.overallStatus.includes("CRASH") || result.overallStatus.includes("CRITICAL")) {
      breakingPoint = scenario.name;
      console.log(`\n🚨 BREAKING POINT REACHED: ${scenario.name}`);
      console.log("Server failed or became unresponsive. Stopping tests.");
      break;
    }

    // Small delay between scenarios
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Print summary
  printHeader("📊 LOAD TEST SUMMARY");
  console.log(`\nServer: ${BASE_URL}`);
  console.log(`Test Match ID: ${testMatchId}\n`);

  const summaryTable = allResults.map((result) => {
    const match = result.tests.matchCreation || {};
    const commentary = result.tests.commentary || {};
    const ws = result.tests.websocket || {};

    return {
      Scenario: result.scenario,
      Status: result.overallStatus,
      "Match (req/s)": match.throughput || "N/A",
      "Match Success": match.successRate ? `${match.successRate}%` : "N/A",
      "Commentary (req/s)": commentary.throughput || "N/A",
      "Commentary Success": commentary.successRate ? `${commentary.successRate}%` : "N/A",
      "WS Clients": ws.totalClients || "N/A",
      "WS Success": ws.successRate !== undefined ? `${ws.successRate}%` : "N/A",
    };
  });

  console.table(summaryTable);

  if (breakingPoint) {
    console.log(`\n🚨 BREAKING POINT: ${breakingPoint}`);
  } else {
    console.log(`\n✅ Server handled all load scenarios successfully!`);
    console.log(`💡 Consider increasing test loads to find the actual breaking point.`);
  }

  // Performance analysis
  printHeader("📈 PERFORMANCE ANALYSIS");

  const lastSuccessful = allResults.filter((r) =>
    !r.overallStatus.includes("CRASH") &&
    !r.overallStatus.includes("CRITICAL") &&
    !r.overallStatus.includes("FAIL")
  ).pop();

  if (lastSuccessful) {
    const match = lastSuccessful.tests.matchCreation || {};
    const commentary = lastSuccessful.tests.commentary || {};

    console.log(`\n✅ Last Successful Scenario: ${lastSuccessful.scenario}`);
    console.log(`\n🏟️  Match Creation:`);
    console.log(`   • Max throughput: ${match.throughput || 0} req/sec`);
    console.log(`   • Success rate: ${match.successRate || 0}%`);
    console.log(`   • P95 latency: ${match.latency?.p95 || 0}ms`);
    console.log(`   • P99 latency: ${match.latency?.p99 || 0}ms`);

    console.log(`\n💬 Commentary Creation:`);
    console.log(`   • Max throughput: ${commentary.throughput || 0} req/sec`);
    console.log(`   • Success rate: ${commentary.successRate || 0}%`);
    console.log(`   • P95 latency: ${commentary.latency?.p95 || 0}ms`);
    console.log(`   • P99 latency: ${commentary.latency?.p99 || 0}ms`);

    const ws = lastSuccessful.tests.websocket || {};
    console.log(`\n🔌 WebSocket:`);
    console.log(`   • Max concurrent clients: ${ws.totalClients || 0}`);
    console.log(`   • Connection success rate: ${ws.successRate || 0}%`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("✅ Load testing complete!");
  console.log("=".repeat(80) + "\n");
}

main().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
