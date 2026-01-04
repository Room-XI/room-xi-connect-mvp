#!/usr/bin/env tsx
/**
 * Room XI Connect - Load Testing Script
 * 
 * Tests the app's ability to handle 500+ concurrent users
 * 
 * Usage:
 *   npm run test:load
 *   # or directly:
 *   npx tsx scripts/load-test.ts
 * 
 * Configuration:
 *   BASE_URL - Target URL (default: http://localhost:5000)
 *   CONCURRENT_USERS - Number of concurrent virtual users (default: 100)
 *   TEST_DURATION_MS - How long to run the test (default: 30000ms)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '100');
const TEST_DURATION_MS = parseInt(process.env.TEST_DURATION_MS || '30000');
const RAMP_UP_TIME_MS = 5000;

interface RequestResult {
  endpoint: string;
  status: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

interface TestResults {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  endpointStats: Record<string, {
    count: number;
    avgTime: number;
    errors: number;
  }>;
}

const PUBLIC_ENDPOINTS = [
  '/api/events/today',
  '/api/events/programs-grouped', 
  '/health',
];

const results: RequestResult[] = [];
let isRunning = true;

async function makeRequest(endpoint: string): Promise<RequestResult> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RoomXI-LoadTest/1.0',
      },
    });
    
    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;
    
    return {
      endpoint,
      status: response.status,
      responseTime,
      success: response.status >= 200 && response.status < 400,
    };
  } catch (error: any) {
    return {
      endpoint,
      status: 0,
      responseTime: Date.now() - startTime,
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

async function virtualUser(userId: number): Promise<void> {
  const rampUpDelay = (userId / CONCURRENT_USERS) * RAMP_UP_TIME_MS;
  await new Promise(resolve => setTimeout(resolve, rampUpDelay));
  
  while (isRunning) {
    const endpoint = PUBLIC_ENDPOINTS[Math.floor(Math.random() * PUBLIC_ENDPOINTS.length)];
    const result = await makeRequest(endpoint);
    results.push(result);
    
    const thinkTime = 500 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, thinkTime));
  }
}

function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

function analyzeResults(): TestResults {
  const responseTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  
  const endpointStats: Record<string, { count: number; avgTime: number; errors: number }> = {};
  
  for (const result of results) {
    if (!endpointStats[result.endpoint]) {
      endpointStats[result.endpoint] = { count: 0, avgTime: 0, errors: 0 };
    }
    const stat = endpointStats[result.endpoint];
    stat.count++;
    stat.avgTime = ((stat.avgTime * (stat.count - 1)) + result.responseTime) / stat.count;
    if (!result.success) stat.errors++;
  }
  
  const durationSeconds = TEST_DURATION_MS / 1000;
  
  return {
    totalRequests: results.length,
    successfulRequests: successfulResults.length,
    failedRequests: failedResults.length,
    avgResponseTime: responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0,
    minResponseTime: responseTimes.length > 0 ? responseTimes[0] : 0,
    maxResponseTime: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
    p95ResponseTime: calculatePercentile(responseTimes, 95),
    p99ResponseTime: calculatePercentile(responseTimes, 99),
    requestsPerSecond: Math.round((results.length / durationSeconds) * 100) / 100,
    errorRate: results.length > 0 
      ? Math.round((failedResults.length / results.length) * 10000) / 100
      : 0,
    endpointStats,
  };
}

function printResults(stats: TestResults): void {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 ROOM XI CONNECT - LOAD TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n📊 CONFIGURATION');
  console.log(`   Target URL: ${BASE_URL}`);
  console.log(`   Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`   Test Duration: ${TEST_DURATION_MS / 1000}s`);
  
  console.log('\n📈 THROUGHPUT');
  console.log(`   Total Requests: ${stats.totalRequests}`);
  console.log(`   Requests/Second: ${stats.requestsPerSecond}`);
  console.log(`   Success Rate: ${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)}%`);
  console.log(`   Error Rate: ${stats.errorRate}%`);
  
  console.log('\n⏱️  RESPONSE TIMES (ms)');
  console.log(`   Average: ${stats.avgResponseTime}ms`);
  console.log(`   Min: ${stats.minResponseTime}ms`);
  console.log(`   Max: ${stats.maxResponseTime}ms`);
  console.log(`   P95: ${stats.p95ResponseTime}ms`);
  console.log(`   P99: ${stats.p99ResponseTime}ms`);
  
  console.log('\n📋 ENDPOINT BREAKDOWN');
  for (const [endpoint, stat] of Object.entries(stats.endpointStats)) {
    const errorPct = stat.count > 0 ? ((stat.errors / stat.count) * 100).toFixed(1) : '0';
    console.log(`   ${endpoint}`);
    console.log(`      Requests: ${stat.count} | Avg: ${Math.round(stat.avgTime)}ms | Errors: ${errorPct}%`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  const passed = stats.errorRate < 5 && stats.p95ResponseTime < 2000;
  if (passed) {
    console.log('✅ LOAD TEST PASSED');
    console.log('   App can handle the configured load with acceptable performance.');
  } else {
    console.log('⚠️  LOAD TEST CONCERNS');
    if (stats.errorRate >= 5) {
      console.log(`   - Error rate ${stats.errorRate}% exceeds 5% threshold`);
    }
    if (stats.p95ResponseTime >= 2000) {
      console.log(`   - P95 response time ${stats.p95ResponseTime}ms exceeds 2000ms threshold`);
    }
  }
  
  console.log('='.repeat(60) + '\n');
}

async function runLoadTest(): Promise<void> {
  console.log('🔄 Starting Room XI Connect Load Test...');
  console.log(`   Simulating ${CONCURRENT_USERS} concurrent users for ${TEST_DURATION_MS / 1000} seconds`);
  console.log(`   Target: ${BASE_URL}`);
  console.log('');
  
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/events/today`);
    if (!healthCheck.ok) {
      throw new Error(`Server returned ${healthCheck.status}`);
    }
    console.log('✅ Server is reachable');
  } catch (error: any) {
    console.error(`❌ Cannot reach server at ${BASE_URL}`);
    console.error(`   Error: ${error.message}`);
    console.error('   Make sure the server is running before running load tests.');
    process.exit(1);
  }
  
  console.log('🚀 Launching virtual users...');
  const userPromises: Promise<void>[] = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userPromises.push(virtualUser(i));
  }
  
  await new Promise(resolve => setTimeout(resolve, TEST_DURATION_MS));
  
  isRunning = false;
  console.log('⏹️  Stopping virtual users...');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const stats = analyzeResults();
  printResults(stats);
  
  const passed = stats.errorRate < 5 && stats.p95ResponseTime < 2000;
  process.exit(passed ? 0 : 1);
}

runLoadTest().catch(error => {
  console.error('Load test failed:', error);
  process.exit(1);
});
