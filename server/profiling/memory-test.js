import WebSocket from 'ws';

const WS_URL = process.env.WS_URL || 'ws://localhost:8000/ws';
const CYCLES = 10;
const CONNECTIONS_PER_CYCLE = 100;
const MATCH_ID = 1;

function getMemoryUsage() {
  const used = process.memoryUsage();
  return {
    rss: Math.round(used.rss / 1024 / 1024),
    heapTotal: Math.round(used.heapTotal / 1024 / 1024),
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),
    external: Math.round(used.external / 1024 / 1024)
  };
}

function formatMemory(mem) {
  return `RSS:${mem.rss}MB Heap:${mem.heapUsed}MB/${mem.heapTotal}MB Ext:${mem.external}MB`;
}

async function runMemoryLeakTest() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('WebSocket Memory Leak Detection Test');
  console.log(`Target: ${WS_URL}`);
  console.log(`Cycles: ${CYCLES}`);
  console.log(`Connections per cycle: ${CONNECTIONS_PER_CYCLE}`);
  console.log(`${'='.repeat(70)}`);

  const initialMemory = getMemoryUsage();
  console.log(`\nInitial memory: ${formatMemory(initialMemory)}`);

  const history = [];

  for (let cycle = 0; cycle < CYCLES; cycle++) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Cycle ${cycle + 1}/${CYCLES}`);
    console.log(`${'='.repeat(70)}`);

    const beforeConnect = getMemoryUsage();
    console.log(`Before connections: ${formatMemory(beforeConnect)}`);

    // Create connections
    const connections = [];
    const connectPromises = [];

    console.log(`Creating ${CONNECTIONS_PER_CYCLE} connections...`);

    for (let i = 0; i < CONNECTIONS_PER_CYCLE; i++) {
      const promise = new Promise((resolve) => {
        const ws = new WebSocket(WS_URL);

        ws.on('open', () => {
          // Subscribe to match
          ws.send(JSON.stringify({ type: 'subscribe', matchId: MATCH_ID }));
          connections.push(ws);
          resolve();
        });

        ws.on('error', () => {
          resolve();
        });

        setTimeout(() => resolve(), 5000); // Timeout after 5s
      });

      connectPromises.push(promise);

      // Stagger connections
      if (i > 0 && i % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    await Promise.all(connectPromises);

    const afterConnect = getMemoryUsage();
    const connectedCount = connections.length;
    console.log(`Connected: ${connectedCount}/${CONNECTIONS_PER_CYCLE}`);
    console.log(`After connections: ${formatMemory(afterConnect)}`);
    console.log(`Memory delta: +${afterConnect.rss - beforeConnect.rss}MB RSS, +${afterConnect.heapUsed - beforeConnect.heapUsed}MB heap`);

    // Wait for stabilization
    console.log(`Waiting 3 seconds for stabilization...`);
    await new Promise(resolve => setTimeout(resolve, 3000));

    const beforeClose = getMemoryUsage();
    console.log(`Before close: ${formatMemory(beforeClose)}`);

    // Close all connections
    console.log(`Closing ${connections.length} connections...`);
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 3000));

    const afterClose = getMemoryUsage();
    console.log(`After close: ${formatMemory(afterClose)}`);
    console.log(`Memory delta: ${afterClose.rss - beforeClose.rss}MB RSS, ${afterClose.heapUsed - beforeClose.heapUsed}MB heap`);

    // Force garbage collection if available
    if (global.gc) {
      console.log(`Forcing garbage collection...`);
      global.gc();

      await new Promise(resolve => setTimeout(resolve, 1000));

      const afterGC = getMemoryUsage();
      console.log(`After GC: ${formatMemory(afterGC)}`);
      console.log(`Memory delta: ${afterGC.rss - afterClose.rss}MB RSS, ${afterGC.heapUsed - afterClose.heapUsed}MB heap`);

      history.push({
        cycle: cycle + 1,
        beforeConnect,
        afterConnect,
        beforeClose,
        afterClose,
        afterGC,
        connectedCount
      });
    } else {
      console.log(`GC not available (run with --expose-gc)`);

      history.push({
        cycle: cycle + 1,
        beforeConnect,
        afterConnect,
        beforeClose,
        afterClose,
        afterGC: afterClose,
        connectedCount
      });
    }

    // Cool down between cycles
    if (cycle < CYCLES - 1) {
      console.log(`\nCooling down for 3 seconds before next cycle...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Analyze results
  console.log(`\n${'='.repeat(70)}`);
  console.log('MEMORY LEAK ANALYSIS');
  console.log(`${'='.repeat(70)}`);

  console.log(`\n📊 Memory Usage Across Cycles:`);
  console.log(`\n┌───────┬────────────┬────────────┬────────────┬────────────┬────────────┐`);
  console.log(`│ Cycle │ Initial    │ After Conn │ Before     │ After      │ After GC   │`);
  console.log(`│       │ RSS (MB)   │ RSS (MB)   │ Close (MB) │ Close (MB) │ RSS (MB)   │`);
  console.log(`├───────┼────────────┼────────────┼────────────┼────────────┼────────────┤`);

  history.forEach(h => {
    const initial = h.beforeConnect.rss;
    const afterConnect = h.afterConnect.rss;
    const beforeClose = h.beforeClose.rss;
    const afterClose = h.afterClose.rss;
    const afterGC = h.afterGC.rss;

    console.log(
      `│ ${h.cycle.toString().padEnd(5)} │ ` +
      `${initial.toString().padEnd(10)} │ ` +
      `${afterConnect.toString().padEnd(10)} │ ` +
      `${beforeClose.toString().padEnd(10)} │ ` +
      `${afterClose.toString().padEnd(10)} │ ` +
      `${afterGC.toString().padEnd(10)} │`
    );
  });

  console.log(`└───────┴────────────┴────────────┴────────────┴────────────┴────────────┘`);

  // Calculate trends
  const gcMemories = history.map(h => h.afterGC.rss);
  const firstGC = gcMemories[0];
  const lastGC = gcMemories[gcMemories.length - 1];
  const growth = lastGC - firstGC;
  const growthPerCycle = growth / (CYCLES - 1);

  console.log(`\n📈 Memory Growth Analysis:`);
  console.log(`  First cycle (after GC): ${firstGC}MB`);
  console.log(`  Last cycle (after GC): ${lastGC}MB`);
  console.log(`  Total growth: ${growth > 0 ? '+' : ''}${growth}MB`);
  console.log(`  Growth per cycle: ${growthPerCycle > 0 ? '+' : ''}${growthPerCycle.toFixed(2)}MB`);

  // Detect leak
  console.log(`\n🔍 Leak Detection:`);

  if (growth < 5) {
    console.log(`  ✅ NO LEAK DETECTED`);
    console.log(`  Memory growth is minimal (< 5MB over ${CYCLES} cycles)`);
    console.log(`  Memory is being properly released and garbage collected`);
  } else if (growth < 20) {
    console.log(`  ⚠️  MINIMAL LEAK SUSPECTED`);
    console.log(`  Moderate memory growth (${growth}MB over ${CYCLES} cycles)`);
    console.log(`  May be normal Node.js heap retention behavior`);
    console.log(`  Recommendation: Monitor in production with longer test duration`);
  } else {
    console.log(`  ❌ LEAK DETECTED`);
    console.log(`  Significant memory growth (${growth}MB over ${CYCLES} cycles)`);
    console.log(`  Memory is not being properly released`);
    console.log(`  Recommendation: Investigate event listeners and closure references`);
  }

  // Heap analysis
  const heapGrowth = lastGC - firstGC;
  const heapUsagePercent = history.map(h => (h.afterGC.heapUsed / h.afterGC.heapTotal) * 100);
  const avgHeapUsage = heapUsagePercent.reduce((a, b) => a + b, 0) / heapUsagePercent.length;

  console.log(`\n💮 Heap Analysis:`);
  console.log(`  Average heap usage: ${avgHeapUsage.toFixed(2)}%`);
  console.log(`  Heap growth trend: ${heapGrowth > 0 ? '+' : ''}${heapGrowth}MB`);

  if (avgHeapUsage > 80) {
    console.log(`  ⚠️  High heap usage - may cause GC pressure`);
  } else if (avgHeapUsage > 60) {
    console.log(`  ℹ️  Moderate heap usage - acceptable`);
  } else {
    console.log(`  ✅ Low heap usage - healthy`);
  }

  // Connection cleanup analysis
  const allConnected = history.every(h => h.connectedCount === CONNECTIONS_PER_CYCLE);

  console.log(`\n🔌 Connection Cleanup Analysis:`);
  if (allConnected) {
    console.log(`  ✅ All connection cycles completed successfully`);
    console.log(`  No connection failures or errors`);
  } else {
    const failedCycles = history.filter(h => h.connectedCount < CONNECTIONS_PER_CYCLE);
    console.log(`  ⚠️  Some connection cycles failed to complete:`);
    failedCycles.forEach(h => {
      console.log(`    Cycle ${h.cycle}: ${h.connectedCount}/${CONNECTIONS_PER_CYCLE} connected`);
    });
  }

  return {
    history,
    leakDetected: growth >= 20,
    growth,
    growthPerCycle,
    avgHeapUsage
  };
}

// Run test
runMemoryLeakTest()
  .then(results => {
    console.log(`\n${'='.repeat(70)}`);
    console.log('✅ Memory leak test complete!');
    console.log(`${'='.repeat(70)}`);

    if (results.leakDetected) {
      console.log(`\n⚠️  Memory leak detected - review code for cleanup issues`);
      process.exit(1);
    } else {
      console.log(`\n✅ No significant memory leak detected`);
      process.exit(0);
    }
  })
  .catch(error => {
    console.error(`\n❌ Test failed:`, error);
    process.exit(1);
  });
