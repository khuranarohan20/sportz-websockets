#!/usr/bin/env node

// This script bypasses Arcjet to test actual server performance
import autocannon from "autocannon";

const BASE_URL = process.env.API_URL || "http://localhost:8000";

// Test scenarios without rate limiting interference
const TEST_SCENARIOS = [
  { name: "Baseline", concurrency: 10, duration: 10 },
  { name: "Moderate", concurrency: 50, duration: 10 },
  { name: "High", concurrency: 100, duration: 10 },
  { name: "Very High", concurrency: 200, duration: 10 },
  { name: "Extreme", concurrency: 500, duration: 10 },
  { name: "Stress", concurrency: 1000, duration: 10 },
];

function printHeader(text) {
  console.log("\n" + "=".repeat(80));
  console.log(`  ${text}`);
  console.log("=".repeat(80));
}

async function testHealthEndpoint(concurrency, duration) {
  const result = await autocannon({
    url: `${BASE_URL}/`,
    connections: concurrency,
    duration: duration,
  });
  return result;
}

async function testMatchCreation(concurrency, duration) {
  const sports = ["football", "basketball", "soccer"];
  const teams = ["Lakers", "Celtics", "Warriors", "Bulls", "Heat", "Nets"];

  const sport = sports[Math.floor(Math.random() * sports.length)];
  const homeTeam = teams[Math.floor(Math.random() * teams.length)];
  const awayTeam = teams[Math.floor(Math.random() * teams.length)];

  const now = new Date();
  const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000);

  const result = await autocannon({
    url: `${BASE_URL}/matches`,
    connections: concurrency,
    duration: duration,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sport,
      homeTeam,
      awayTeam,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    }),
    requests: [
      {
        method: "POST",
        path: "/matches",
        headers: {
          "Content-Type": "application/json",
        },
        setupRequest: (req) => {
          const s = sports[Math.floor(Math.random() * sports.length)];
          const ht = teams[Math.floor(Math.random() * teams.length)];
          let at = teams[Math.floor(Math.random() * teams.length)];
          while (at === ht) {
            at = teams[Math.floor(Math.random() * teams.length)];
          }
          const st = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const et = new Date(st.getTime() + 2 * 60 * 60 * 1000);
          req.body = JSON.stringify({
            sport: s,
            homeTeam: ht,
            awayTeam: at,
            startTime: st.toISOString(),
            endTime: et.toISOString(),
          });
          return req;
        },
      },
    ],
  });
  return result;
}

async function runTestScenario(scenario, matchId) {
  console.log(`\n📊 Running: ${scenario.name} (${scenario.concurrency} concurrent, ${scenario.duration}s)`);

  const results = {
    scenario: scenario.name,
    concurrency: scenario.concurrency,
    duration: scenario.duration,
  };

  try {
    // Test health endpoint
    console.log("  Testing health endpoint...");
    const healthResult = await testHealthEndpoint(scenario.concurrency, scenario.duration);
    results.health = {
      throughput: healthResult.requests.mean?.toFixed(2) || 0,
      latency: {
        mean: healthResult.latency.mean?.toFixed(2) || 0,
        p95: healthResult.latency.p95?.toFixed(2) || 0,
        p99: healthResult.latency.p99?.toFixed(2) || 0,
      },
      errors: healthResult.errors || 0,
      timeouts: healthResult.timeouts || 0,
      successRate: ((healthResult.requests.completed / healthResult.requests.sent) * 100).toFixed(2),
    };
    console.log(`    ✓ ${healthResult.requests.mean?.toFixed(2)} req/sec, ${results.health.latency.mean}ms mean latency`);

    // Test match creation
    console.log("  Testing match creation...");
    const matchResult = await testMatchCreation(scenario.concurrency, scenario.duration);
    results.matchCreation = {
      throughput: matchResult.requests.mean?.toFixed(2) || 0,
      latency: {
        mean: matchResult.latency.mean?.toFixed(2) || 0,
        p95: matchResult.latency.p95?.toFixed(2) || 0,
        p99: matchResult.latency.p99?.toFixed(2) || 0,
      },
      errors: matchResult.errors || 0,
      timeouts: matchResult.timeouts || 0,
      successRate: ((matchResult.requests.completed / matchResult.requests.sent) * 100).toFixed(2),
    };
    console.log(`    ✓ ${matchResult.requests.mean?.toFixed(2)} req/sec, ${results.matchCreation.latency.mean}ms mean latency`);

    // Determine status
    const errorRate = (results.health.errors + results.matchCreation.errors) / (scenario.concurrency * scenario.duration * 2);
    results.status = errorRate < 0.01 ? "✅ PASS" : errorRate < 0.05 ? "⚠️  WARN" : "❌ FAIL";
    results.errorRate = (errorRate * 100).toFixed(2);

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    results.status = "💥 ERROR";
    results.error = error.message;
  }

  return results;
}

async function main() {
  printHeader("🚀 SPORTS API PERFORMANCE TEST (No Rate Limiting)");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Scenarios: ${TEST_SCENARIOS.length}`);
  console.log(`⚠️  Note: This bypasses Arcjet to test raw server performance`);

  // Check server health
  console.log("\n🔍 Checking server health...");
  try {
    const response = await fetch(`${BASE_URL}/`);
    if (!response.ok) throw new Error("Server not responding");
    console.log("✅ Server is healthy");
  } catch (error) {
    console.error("❌ Server is not responding!");
    process.exit(1);
  }

  // Create a test match
  console.log("\n🏟️  Creating test match...");
  let testMatchId;
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
    if (!response.ok) throw new Error("Failed to create test match");
    const data = await response.json();
    testMatchId = data.data.id;
    console.log(`✅ Test match created with ID: ${testMatchId}`);
  } catch (error) {
    console.error("❌ Failed to create test match:", error.message);
    process.exit(1);
  }

  const allResults = [];
  let breakingPoint = null;

  // Run each scenario
  for (const scenario of TEST_SCENARIOS) {
    const result = await runTestScenario(scenario, testMatchId);
    allResults.push(result);

    if (result.status === "💥 ERROR") {
      breakingPoint = scenario.name;
      console.log(`\n🚨 BREAKING POINT: ${scenario.name}`);
      break;
    }

    // Small delay between scenarios
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Print summary
  printHeader("📊 PERFORMANCE TEST RESULTS");

  const summary = allResults.map((r) => ({
    Scenario: r.scenario,
    Concurrency: r.concurrency,
    Status: r.status,
    "Health (req/s)": r.health?.throughput || "N/A",
    "Health Latency (ms)": r.health?.latency.mean || "N/A",
    "Match (req/s)": r.matchCreation?.throughput || "N/A",
    "Match Latency (ms)": r.matchCreation?.latency.mean || "N/A",
    "Error Rate": r.errorRate || "N/A",
  }));

  console.table(summary);

  // Find breaking point
  const failedScenarios = allResults.filter((r) => r.status.includes("FAIL") || r.status.includes("ERROR"));
  if (failedScenarios.length > 0) {
    console.log(`\n🚨 BREAKING POINT: ${failedScenarios[0].scenario} (${failedScenarios[0].concurrency} concurrent connections)`);
  } else {
    console.log(`\n✅ Server handled all scenarios successfully!`);
    const lastResult = allResults[allResults.length - 1];
    console.log(`💡 Max throughput tested: ${lastResult.matchCreation?.throughput || 0} req/sec`);
  }

  // Performance analysis
  printHeader("📈 PERFORMANCE ANALYSIS");

  const bestHealth = [...allResults].sort((a, b) => parseFloat(b.health?.throughput || 0) - parseFloat(a.health?.throughput || 0))[0];
  const bestMatch = [...allResults].sort((a, b) => parseFloat(b.matchCreation?.throughput || 0) - parseFloat(a.matchCreation?.throughput || 0))[0];

  console.log(`\n🏆 Best Performance (Health Endpoint):`);
  console.log(`   • Scenario: ${bestHealth.scenario}`);
  console.log(`   • Throughput: ${bestHealth.health?.throughput || 0} req/sec`);
  console.log(`   • Mean latency: ${bestHealth.health?.latency.mean || 0}ms`);
  console.log(`   • P95 latency: ${bestHealth.health?.latency.p95 || 0}ms`);
  console.log(`   • P99 latency: ${bestHealth.health?.latency.p99 || 0}ms`);

  console.log(`\n🏆 Best Performance (Match Creation):`);
  console.log(`   • Scenario: ${bestMatch.scenario}`);
  console.log(`   • Throughput: ${bestMatch.matchCreation?.throughput || 0} req/sec`);
  console.log(`   • Mean latency: ${bestMatch.matchCreation?.latency.mean || 0}ms`);
  console.log(`   • P95 latency: ${bestMatch.matchCreation?.latency.p95 || 0}ms`);
  console.log(`   • P99 latency: ${bestMatch.matchCreation?.latency.p99 || 0}ms`);

  console.log("\n" + "=".repeat(80));
  console.log("✅ Performance testing complete!");
  console.log("=".repeat(80) + "\n");
}

main().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
