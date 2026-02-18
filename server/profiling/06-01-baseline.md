
================================================================================
  🚀 SPORTS API PERFORMANCE TEST (No Rate Limiting)
================================================================================
Target: http://localhost:8000
Scenarios: 6
⚠️  Note: This bypasses Arcjet to test raw server performance

🔍 Checking server health...
✅ Server is healthy

🏟️  Creating test match...
✅ Test match created with ID: 13691

📊 Running: Baseline (10 concurrent, 10s)
  Testing health endpoint...
    ✓ 63873.46 req/sec, 0.01ms mean latency
  Testing match creation...
    ✓ 26.20 req/sec, 376.51ms mean latency

📊 Running: Moderate (50 concurrent, 10s)
  Testing health endpoint...
    ✓ 62858.19 req/sec, 0.10ms mean latency
  Testing match creation...
    ✓ 25.60 req/sec, 1828.43ms mean latency

📊 Running: High (100 concurrent, 10s)
  Testing health endpoint...
    ✓ 63885.10 req/sec, 1.06ms mean latency
  Testing match creation...
(node:45056) TimeoutNegativeWarning: -1 is a negative number.
Timeout duration was set to 1.
(Use `node --trace-warnings ...` to show where the warning was created)
    ✓ 24.50 req/sec, 3450.80ms mean latency

📊 Running: Very High (200 concurrent, 10s)
  Testing health endpoint...
    ✓ 63509.82 req/sec, 2.79ms mean latency
  Testing match creation...
    ✓ 32.30 req/sec, 4374.73ms mean latency

📊 Running: Extreme (500 concurrent, 10s)
  Testing health endpoint...
    ✓ 60949.82 req/sec, 7.74ms mean latency
  Testing match creation...
    ✓ 32.00 req/sec, 5411.62ms mean latency

📊 Running: Stress (1000 concurrent, 10s)
  Testing health endpoint...
    ✓ 59626.19 req/sec, 16.39ms mean latency
  Testing match creation...
    ✓ 26.40 req/sec, 6076.81ms mean latency

================================================================================
  📊 PERFORMANCE TEST RESULTS
================================================================================
┌─────────┬─────────────┬─────────────┬───────────┬────────────────┬─────────────────────┬───────────────┬────────────────────┬────────────┐
│ (index) │ Scenario    │ Concurrency │ Status    │ Health (req/s) │ Health Latency (ms) │ Match (req/s) │ Match Latency (ms) │ Error Rate │
├─────────┼─────────────┼─────────────┼───────────┼────────────────┼─────────────────────┼───────────────┼────────────────────┼────────────┤
│ 0       │ 'Baseline'  │ 10          │ '✅ PASS' │ '63873.46'     │ '0.01'              │ '26.20'       │ '376.51'           │ '0.00'     │
│ 1       │ 'Moderate'  │ 50          │ '✅ PASS' │ '62858.19'     │ '0.10'              │ '25.60'       │ '1828.43'          │ '0.00'     │
│ 2       │ 'High'      │ 100         │ '✅ PASS' │ '63885.10'     │ '1.06'              │ '24.50'       │ '3450.80'          │ '0.05'     │
│ 3       │ 'Very High' │ 200         │ '✅ PASS' │ '63509.82'     │ '2.79'              │ '32.30'       │ '4374.73'          │ '0.00'     │
│ 4       │ 'Extreme'   │ 500         │ '⚠️  WARN' │ '60949.82'     │ '7.74'              │ '32.00'       │ '5411.62'          │ '1.80'     │
│ 5       │ 'Stress'    │ 1000        │ '⚠️  WARN' │ '59626.19'     │ '16.39'             │ '26.40'       │ '6076.81'          │ '3.79'     │
└─────────┴─────────────┴─────────────┴───────────┴────────────────┴─────────────────────┴───────────────┴────────────────────┴────────────┘

✅ Server handled all scenarios successfully!
💡 Max throughput tested: 26.40 req/sec

================================================================================
  📈 PERFORMANCE ANALYSIS
================================================================================

🏆 Best Performance (Health Endpoint):
   • Scenario: High
   • Throughput: 63885.10 req/sec
   • Mean latency: 1.06ms
   • P95 latency: 0ms
   • P99 latency: 3.00ms

🏆 Best Performance (Match Creation):
   • Scenario: Very High
   • Throughput: 32.30 req/sec
   • Mean latency: 4374.73ms
   • P95 latency: 0ms
   • P99 latency: 6414.00ms

================================================================================
✅ Performance testing complete!
================================================================================

