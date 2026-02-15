import autocannon from "autocannon";

const BASE_URL = process.env.API_URL || "http://localhost:8000";

// Commentary event types similar to ESPN
const COMMENTARY_EVENTS = [
  { type: "goal", messages: ["GOAL!", "What a strike!", "Into the back of the net!", "Sensational goal!"] },
  { type: "shot", messages: ["Shot saved!", "Close call!", "Just wide!", "Hits the post!"] },
  { type: "foul", messages: ["Foul called", "Free kick awarded", "Yellow card shown", "Booked for a foul"] },
  { type: "substitution", messages: ["Substitution made", "Tactical change", "Fresh legs coming on"] },
  { type: "injury", messages: ["Treatment on the field", "Injury concern", "Play paused"] },
  { type: "possession", messages: ["Possession won", "Building up play", "Quick counter attack"] },
  { type: "corner", messages: ["Corner kick", "Dangerous ball into the box", "Cleared!"] },
  { type: "offside", messages: ["Offside called", "Close offside decision", "Flag up"] },
];

// Generate realistic commentary data
function generateCommentaryData(matchId, minute) {
  const event = COMMENTARY_EVENTS[Math.floor(Math.random() * COMMENTARY_EVENTS.length)];
  const message = event.messages[Math.floor(Math.random() * event.messages.length)];

  return {
    minute: minute,
    sequence: Math.floor(Math.random() * 100),
    period: minute <= 45 ? "H1" : minute <= 90 ? "H2" : "ET",
    eventType: event.type,
    actor: Math.random() > 0.5 ? "Player " + Math.floor(Math.random() * 11) : undefined,
    team: Math.random() > 0.5 ? "home" : "away",
    message: `${minute}' ${message}`,
    metadata: {
      speed: Math.random() * 100,
      position: ["left", "center", "right"][Math.floor(Math.random() * 3)],
    },
    tags: ["live", "action", event.type],
  };
}

export async function runCommentaryCreationTest(
  matchId,
  concurrency = 10,
  duration = 10,
) {
  console.log(`\n💬 Testing Commentary Creation for Match ${matchId}`);
  console.log(`Concurrent connections: ${concurrency}`);
  console.log(`Duration: ${duration}s`);

  const result = await autocannon({
    url: `${BASE_URL}/matches/${matchId}/commentary`,
    connections: concurrency,
    duration: duration,
    amount: concurrency * duration * 5, // Target 5 requests per second per connection (like live match)
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    requests: [
      {
        method: "POST",
        path: `/matches/${matchId}/commentary`,
        headers: {
          "Content-Type": "application/json",
        },
        setupRequest: (req, context) => {
          // Simulate progressing match time
          const minute = Math.floor((context.curr !== undefined ? context.curr : 0) / 10) % 90 + 1;
          req.body = JSON.stringify(generateCommentaryData(matchId, minute));
          return req;
        },
      },
    ],
  });

  return result;
}

// Allow running this file directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const matchId = parseInt(process.argv[2]) || 1;
  const concurrency = parseInt(process.argv[3]) || 10;
  const duration = parseInt(process.argv[4]) || 10;

  const result = await runCommentaryCreationTest(matchId, concurrency, duration);

  console.log("\n📊 Commentary Creation Test Results:");
  console.log(`Requests sent: ${result.requests.sent}`);
  console.log(`Requests completed: ${result.requests.completed}`);
  console.log(`Errors: ${result.errors}`);
  console.log(`Timeouts: ${result.timeouts}`);
  console.log(`Throughput (req/sec): ${result.requests.mean}`);
  console.log(`Latency (mean): ${result.latency.mean}ms`);
  console.log(`Latency (p95): ${result.latency.p95}ms`);
  console.log(`Latency (p99): ${result.latency.p99}ms`);
}
