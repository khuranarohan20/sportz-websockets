import WebSocket from 'ws';
import http from 'http';

const WS_URL = process.env.WS_URL || 'ws://localhost:8000/ws';
const HTTP_URL = process.env.HTTP_URL || 'http://localhost:8000';
const CONNECTIONS = 100;
const MATCH_ID = 999; // Use high ID to avoid conflicts
const TEST_MESSAGES = 50;

function getMemoryUsage() {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
    external: Math.round(used.external / 1024 / 1024) + 'MB'
  };
}

function formatTimestamp() {
  return new Date().toISOString().split('T')[1].slice(0, 12);
}

async function createMatchForTest() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      sport: 'football',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    });

    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/matches',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          const response = JSON.parse(data);
          resolve(response.data.id);
        } else {
          reject(new Error(`Failed to create match: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function connectWebSocketClients(numClients, matchId) {
  console.log(`\n[${formatTimestamp()}] Connecting ${numClients} WebSocket clients...`);

  const clients = [];
  const connectionPromises = [];

  for (let i = 0; i < numClients; i++) {
    const promise = new Promise((resolve) => {
      const ws = new WebSocket(WS_URL);

      ws.on('open', () => {
        // Subscribe to match
        ws.send(JSON.stringify({ type: 'subscribe', matchId }));
        clients.push({ ws, id: i, subscribed: false, messages: [] });
        resolve();
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          const client = clients.find(c => c.ws === ws);
          if (client) {
            client.messages.push({
              timestamp: Date.now(),
              message: message
            });

            if (message.type === 'subscribed' && message.matchId === matchId) {
              client.subscribed = true;
            }
          }
        } catch (err) {
          // Ignore parse errors
        }
      });

      ws.on('error', (err) => {
        console.error(`[${formatTimestamp()}] Client ${i} error:`, err.message);
        resolve();
      });

      setTimeout(() => resolve(), 5000); // Timeout after 5s
    });

    connectionPromises.push(promise);

    // Stagger connections
    if (i > 0 && i % 25 === 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  await Promise.all(connectionPromises);

  const subscribed = clients.filter(c => c.subscribed).length;
  console.log(`[${formatTimestamp()}] Connected: ${clients.length}/${numClients}, Subscribed: ${subscribed}/${numClients}`);

  return clients;
}

async function sendCommentary(matchId, text) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      minute: Math.floor(Math.random() * 90),
      message: text
    });

    const options = {
      hostname: 'localhost',
      port: 8000,
      path: `/matches/${matchId}/commentary`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to create commentary: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runBroadcastTest() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('WebSocket Broadcast Performance Test');
  console.log(`WebSocket: ${WS_URL}`);
  console.log(`HTTP: ${HTTP_URL}`);
  console.log(`${'='.repeat(60)}`);

  const startMemory = getMemoryUsage();
  console.log(`\n[${formatTimestamp()}] Initial memory:`, startMemory);

  // Create a match for testing
  console.log(`\n[${formatTimestamp()}] Creating test match...`);
  let matchId;
  try {
    matchId = await createMatchForTest();
    console.log(`[${formatTimestamp()}] Created match ${matchId}`);
  } catch (error) {
    console.error(`[${formatTimestamp()}] Failed to create match:`, error.message);
    console.log(`[${formatTimestamp()}] Using fallback match ID: ${MATCH_ID}`);
    matchId = MATCH_ID;
  }

  // Connect WebSocket clients
  const clients = await connectWebSocketClients(CONNECTIONS, matchId);

  const connectedMemory = getMemoryUsage();
  console.log(`[${formatTimestamp()}] Memory after connections:`, connectedMemory);

  // Wait for subscriptions to stabilize
  console.log(`\n[${formatTimestamp()}] Waiting 2 seconds for subscriptions to stabilize...`);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Clear any initial messages
  clients.forEach(c => c.messages = []);

  // Send test commentary messages
  console.log(`\n[${formatTimestamp()}] Sending ${TEST_MESSAGES} commentary messages...`);

  const broadcastStart = Date.now();
  const latencies = [];

  for (let i = 0; i < TEST_MESSAGES; i++) {
    const sendTime = Date.now();

    try {
      await sendCommentary(matchId, `Test commentary ${i + 1}`);
      console.log(`[${formatTimestamp()}] Sent message ${i + 1}/${TEST_MESSAGES}`);

      // Wait for clients to receive
      await new Promise(resolve => setTimeout(resolve, 200));

      // Collect latencies
      clients.forEach(client => {
        const commentaryMsg = client.messages.find(m =>
          m.message.type === 'commentary' &&
          m.message.data.message === `Test commentary ${i + 1}`
        );
        if (commentaryMsg) {
          latencies.push(commentaryMsg.timestamp - sendTime);
        }
      });
    } catch (error) {
      console.error(`[${formatTimestamp()}] Failed to send message ${i + 1}:`, error.message);
    }
  }

  const broadcastEnd = Date.now();
  const broadcastDuration = broadcastEnd - broadcastStart;

  // Wait a bit more for any delayed messages
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Collect metrics
  console.log(`\n${'='.repeat(60)}`);
  console.log('BROADCAST PERFORMANCE RESULTS');
  console.log(`${'='.repeat(60)}`);

  const totalMessagesReceived = clients.reduce((sum, c) => sum + c.messages.filter(m => m.message.type === 'commentary').length, 0);
  const messagesPerClient = totalMessagesReceived / clients.length;
  const expectedMessages = TEST_MESSAGES * clients.length;
  const deliveryRate = (totalMessagesReceived / expectedMessages) * 100;

  console.log(`\n📊 Message Delivery:`);
  console.log(`  Messages sent: ${TEST_MESSAGES}`);
  console.log(`  Expected total: ${expectedMessages} (${TEST_MESSAGES} × ${clients.length} clients)`);
  console.log(`  Actually received: ${totalMessagesReceived}`);
  console.log(`  Delivery rate: ${deliveryRate.toFixed(2)}%`);
  console.log(`  Per client: ${messagesPerClient.toFixed(2)}`);

  console.log(`\n⏱️  Broadcast Performance:`);
  console.log(`  Total duration: ${broadcastDuration}ms`);
  console.log(`  Avg per message: ${(broadcastDuration / TEST_MESSAGES).toFixed(2)}ms`);
  console.log(`  Messages/second: ${(TEST_MESSAGES / (broadcastDuration / 1000)).toFixed(2)}`);

  if (latencies.length > 0) {
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const sortedLatencies = latencies.sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];
    const min = sortedLatencies[0];
    const max = sortedLatencies[sortedLatencies.length - 1];

    console.log(`\n📈 Latency Statistics (${latencies.length} samples):`);
    console.log(`  Min: ${min}ms`);
    console.log(`  Max: ${max}ms`);
    console.log(`  Average: ${avgLatency.toFixed(2)}ms`);
    console.log(`  P50: ${p50}ms`);
    console.log(`  P95: ${p95}ms`);
    console.log(`  P99: ${p99}ms`);
  } else {
    console.log(`\n⚠️  No latency data collected - messages may not have been received`);
  }

  const endMemory = getMemoryUsage();
  console.log(`\n💾 Memory Usage:`);
  console.log(`  Start:`, startMemory);
  console.log(`  After connections:`, connectedMemory);
  console.log(`  After broadcasts:`, endMemory);

  // Check for clients that didn't receive all messages
  const clientMessageCounts = clients.map(c => ({
    id: c.id,
    count: c.messages.filter(m => m.message.type === 'commentary').length
  }));

  const clientsMissingMessages = clientMessageCounts.filter(c => c.count < TEST_MESSAGES);

  if (clientsMissingMessages.length > 0) {
    console.log(`\n⚠️  Clients missing messages: ${clientsMissingMessages.length}/${clients.length}`);
    console.log(`  Message counts range: ${Math.min(...clientMessageCounts.map(c => c.count))} - ${Math.max(...clientMessageCounts.map(c => c.count))}`);
  }

  // Close connections
  console.log(`\n🔌 Closing connections...`);
  clients.forEach(c => c.ws.close());
  await new Promise(resolve => setTimeout(resolve, 1000));

  const closeMemory = getMemoryUsage();
  console.log(`  After close:`, closeMemory);

  return {
    totalMessagesSent: TEST_MESSAGES,
    totalMessagesReceived,
    expectedMessages,
    deliveryRate,
    messagesPerClient,
    broadcastDuration,
    avgMessageTime: broadcastDuration / TEST_MESSAGES,
    messagesPerSecond: TEST_MESSAGES / (broadcastDuration / 1000),
    latencies: latencies.length > 0 ? {
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.5)],
      p95: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)],
      p99: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.99)]
    } : null,
    memory: { startMemory, connectedMemory, endMemory, closeMemory }
  };
}

// Run test
runBroadcastTest()
  .then(results => {
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Broadcast test complete!');
    console.log(`${'='.repeat(60)}`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n❌ Test failed:`, error);
    process.exit(1);
  });
