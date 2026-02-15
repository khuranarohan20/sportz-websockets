import { WebSocket } from "ws";

const WS_URL = process.env.WS_URL || "ws://localhost:8000/ws";

export async function runWebSocketLoadTest(numClients = 100, matchId = 1, duration = 10) {
  console.log(`\n🔌 Testing WebSocket Connections`);
  console.log(`Number of clients: ${numClients}`);
  console.log(`Match ID to subscribe: ${matchId}`);
  console.log(`Duration: ${duration}s`);

  const clients = [];
  const stats = {
    connected: 0,
    failed: 0,
    subscribed: 0,
    messagesReceived: 0,
    errors: 0,
  };

  // Connect clients incrementally
  console.log(`\nConnecting ${numClients} clients...`);

  const connectPromises = [];

  for (let i = 0; i < numClients; i++) {
    const promise = new Promise((resolve) => {
      const ws = new WebSocket(WS_URL);

      ws.on("open", () => {
        stats.connected++;
        // Subscribe to match
        ws.send(JSON.stringify({ type: "subscribe", matchId }));

        ws.on("message", (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === "subscribed") {
              stats.subscribed++;
            } else if (message.type === "commentary") {
              stats.messagesReceived++;
            }
          } catch (err) {
            stats.errors++;
          }
        });

        ws.on("error", (error) => {
          stats.failed++;
          stats.errors++;
          console.error(`Client ${i} error:`, error.message);
        });

        ws.on("close", () => {
          // Client disconnected
        });

        clients.push(ws);
        resolve();
      });

      ws.on("error", () => {
        stats.failed++;
        resolve();
      });

      // Stagger connections to avoid overwhelming
      const delay = Math.floor(i / 10) * 100;
      setTimeout(() => {}, delay);
    });

    connectPromises.push(promise);
  }

  // Wait for all connections to establish
  await Promise.all(connectPromises);

  console.log(`✅ Connected: ${stats.connected}/${numClients}`);
  console.log(`📝 Subscribed: ${stats.subscribed}/${stats.connected}`);
  console.log(`❌ Failed: ${stats.failed}`);

  // Let connections run for the specified duration
  console.log(`\n⏱️  Running test for ${duration}s...`);

  await new Promise((resolve) => setTimeout(resolve, duration * 1000));

  // Close all connections
  console.log("\n🔌 Closing connections...");
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  const successRate = ((stats.connected / numClients) * 100).toFixed(2);
  const subscriptionRate = ((stats.subscribed / stats.connected) * 100).toFixed(2);

  console.log("\n📊 WebSocket Test Results:");
  console.log(`Total clients attempted: ${numClients}`);
  console.log(`Successfully connected: ${stats.connected} (${successRate}%)`);
  console.log(`Successfully subscribed: ${stats.subscribed} (${subscriptionRate}%)`);
  console.log(`Failed connections: ${stats.failed}`);
  console.log(`Messages received: ${stats.messagesReceived}`);
  console.log(`Errors: ${stats.errors}`);

  return {
    totalClients: numClients,
    connected: stats.connected,
    subscribed: stats.subscribed,
    failed: stats.failed,
    messagesReceived: stats.messagesReceived,
    errors: stats.errors,
    successRate: parseFloat(successRate),
    subscriptionRate: parseFloat(subscriptionRate),
  };
}

// Allow running this file directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const numClients = parseInt(process.argv[2]) || 100;
  const matchId = parseInt(process.argv[3]) || 1;
  const duration = parseInt(process.argv[4]) || 10;

  const result = await runWebSocketLoadTest(numClients, matchId, duration);

  console.log("\n✅ Test complete!");
}
