import WebSocket from 'ws';

const WS_URL = process.env.WS_URL || 'ws://localhost:8000/ws';
const concurrentLevels = [10, 50, 100, 500, 1000];

function getMemoryUsage() {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
    external: Math.round(used.external / 1024 / 1024) + 'MB'
  };
}

async function testConcurrencyLevel(concurrent) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${concurrent} concurrent connections...`);
  console.log(`${'='.repeat(60)}`);

  const connected = new Set();
  const errors = [];
  let messagesReceived = 0;
  const startTime = Date.now();
  const startMemory = getMemoryUsage();

  console.log(`Initial memory:`, startMemory);
  console.log(`\nConnecting ${concurrent} clients...`);

  // Create connections
  const connectPromises = [];
  for (let i = 0; i < concurrent; i++) {
    const promise = new Promise((resolve) => {
      const ws = new WebSocket(WS_URL);

      const timeout = setTimeout(() => {
        errors.push(`Connection ${i} timeout`);
        resolve();
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        connected.add(ws);
        ws.send(JSON.stringify({ type: 'subscribe', matchId: 1 }));
        resolve();
      });

      ws.on('message', (data) => {
        messagesReceived++;
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        errors.push(`Connection ${i} error: ${err.message}`);
        resolve();
      });

      ws.on('close', () => {
        connected.delete(ws);
      });
    });

    connectPromises.push(promise);

    // Stagger connections slightly to avoid overwhelming
    if (i > 0 && i % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  await Promise.all(connectPromises);

  const connectionTime = Date.now() - startTime;
  const afterConnectMemory = getMemoryUsage();

  console.log(`\n✅ Connection Results:`);
  console.log(`  Connected: ${connected.size}/${concurrent} (${((connected.size/concurrent)*100).toFixed(2)}%)`);
  console.log(`  Failed: ${errors.length}`);
  console.log(`  Connection time: ${connectionTime}ms`);
  console.log(`  Avg per connection: ${(connectionTime/concurrent).toFixed(2)}ms`);
  console.log(`\n  Memory after connect:`, afterConnectMemory);

  if (errors.length > 0 && errors.length <= 10) {
    console.log(`\n  Errors:`);
    errors.slice(0, 10).forEach(err => console.log(`    - ${err}`));
  } else if (errors.length > 10) {
    console.log(`\n  First 10 errors:`);
    errors.slice(0, 10).forEach(err => console.log(`    - ${err}`));
    console.log(`  ... and ${errors.length - 10} more errors`);
  }

  // Wait for connections to stabilize
  console.log(`\n⏱️  Stabilizing for 5 seconds...`);
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Monitor for 30 seconds
  console.log(`\n⏱️  Monitoring for 30 seconds...`);
  const startMessages = messagesReceived;
  await new Promise(resolve => setTimeout(resolve, 30000));
  const monitorMemory = getMemoryUsage();

  const messagesPerSec = (messagesReceived - startMessages) / 30;

  console.log(`\n📊 Monitoring Results:`);
  console.log(`  Messages received: ${messagesReceived - startMessages}`);
  console.log(`  Messages/sec: ${messagesPerSec.toFixed(2)}`);
  console.log(`  Memory during monitoring:`, monitorMemory);

  // Cleanup
  console.log(`\n🔌 Closing connections...`);
  connected.forEach(ws => ws.close());
  await new Promise(resolve => setTimeout(resolve, 2000));

  const afterCloseMemory = getMemoryUsage();
  console.log(`  Memory after close:`, afterCloseMemory);

  return {
    concurrent,
    connected: connected.size,
    failed: errors.length,
    connectionTime,
    avgConnectionTime: connectionTime / concurrent,
    messagesReceived: messagesReceived - startMessages,
    messagesPerSec,
    startMemory,
    afterConnectMemory,
    monitorMemory,
    afterCloseMemory
  };
}

async function runAllTests() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('WebSocket Concurrent Connection Performance Test');
  console.log(`Target: ${WS_URL}`);
  console.log(`${'='.repeat(60)}`);

  const results = [];

  for (const concurrent of concurrentLevels) {
    const result = await testConcurrencyLevel(concurrent);
    results.push(result);

    // Cool down between tests
    console.log(`\n⏱️  Cooling down for 10 seconds before next test...`);
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY OF ALL TESTS');
  console.log(`${'='.repeat(60)}`);

  console.log(`\n┌──────────────┬──────────┬────────┬─────────────┬──────────────┬─────────────┐`);
  console.log(`│ Concurrency  │ Connected│ Failed │ Conn Time   │ Avg Conn    │ Msg/sec     │`);
  console.log(`├──────────────┼──────────┼────────┼─────────────┼──────────────┼─────────────┤`);

  results.forEach(r => {
    console.log(
      `│ ${r.concurrent.toString().padEnd(12)} │ ` +
      `${r.connected.toString().padEnd(8)} │ ` +
      `${r.failed.toString().padEnd(6)} │ ` +
      `${r.connectionTime.toString().padEnd(11)} │ ` +
      `${r.avgConnectionTime.toFixed(2).padEnd(12)} │ ` +
      `${r.messagesPerSec.toFixed(2).padEnd(11)} │`
    );
  });

  console.log(`└──────────────┴──────────┴────────┴─────────────┴──────────────┴─────────────┘`);

  console.log(`\n📊 Memory Usage (RSS):`);
  results.forEach(r => {
    console.log(
      `  ${r.concurrent} concurrent: ${r.startMemory.rss} → ${r.afterConnectMemory.rss} → ${r.afterCloseMemory.rss}`
    );
  });

  return results;
}

// Run tests
runAllTests()
  .then(results => {
    console.log(`\n✅ All tests complete!`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n❌ Test failed:`, error);
    process.exit(1);
  });
