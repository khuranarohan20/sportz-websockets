import autocannon from "autocannon";

const BASE_URL = process.env.API_URL || "http://localhost:8000";

// Generate realistic match data
function generateMatchData() {
  const sports = ["football", "basketball", "soccer", "tennis", "hockey"];
  const teams = {
    football: [
      "Lions", "Tigers", "Bears", "Eagles", "Hawks", "Sharks", "Wolves", "Panthers"
    ],
    basketball: [
      "Lakers", "Celtics", "Warriors", "Bulls", "Heat", "Nets", "Suns", "Bucks"
    ],
    soccer: [
      "United", "City", "Arsenal", "Chelsea", "Liverpool", "Barcelona", "Madrid", "Bayern"
    ],
    tennis: ["Nadal", "Federer", "Djokovic", "Murray", "Thiem", "Tsitsipas", "Zverev", "Medvedev"],
    hockey: ["Bruins", "Rangers", "Penguins", "Blackhawks", "Kings", "Canadiens", "Oilers", "Capitals"],
  };

  const sport = sports[Math.floor(Math.random() * sports.length)];
  const sportTeams = teams[sport];
  const homeTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)];
  let awayTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)];

  // Ensure different teams
  while (awayTeam === homeTeam) {
    awayTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)];
  }

  const now = new Date();
  const startTime = new Date(now.getTime() + Math.random() * 24 * 60 * 60 * 1000); // Within 24 hours
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

  return {
    sport,
    homeTeam,
    awayTeam,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    homeScore: 0,
    awayScore: 0,
  };
}

export async function runMatchCreationTest(concurrency = 10, duration = 10) {
  console.log(`\n🏟️  Testing Match Creation`);
  console.log(`Concurrent connections: ${concurrency}`);
  console.log(`Duration: ${duration}s`);

  const result = await autocannon({
    url: `${BASE_URL}/matches`,
    connections: concurrency,
    duration: duration,
    amount: concurrency * duration * 2, // Target 2 requests per second per connection
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // Generate unique payload for each request
    body: JSON.stringify(generateMatchData()),
    // Use a function to regenerate body for each request
    requests: [
      {
        method: "POST",
        path: "/matches",
        headers: {
          "Content-Type": "application/json",
        },
        setupRequest: (req, context) => {
          req.body = JSON.stringify(generateMatchData());
          return req;
        },
      },
    ],
  });

  return result;
}

// Allow running this file directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const concurrency = parseInt(process.argv[2]) || 10;
  const duration = parseInt(process.argv[3]) || 10;

  const result = await runMatchCreationTest(concurrency, duration);

  console.log("\n📊 Match Creation Test Results:");
  console.log(`Requests sent: ${result.requests.sent}`);
  console.log(`Requests completed: ${result.requests.completed}`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Timeouts: ${result.timeouts}`);
  console.log(`Throughput (req/sec): ${result.requests.mean}`);
  console.log(`Latency (mean): ${result.latency.mean}ms`);
  console.log(`Latency (p95): ${result.latency.p95}ms`);
  console.log(`Latency (p99): ${result.latency.p99}ms`);
}
