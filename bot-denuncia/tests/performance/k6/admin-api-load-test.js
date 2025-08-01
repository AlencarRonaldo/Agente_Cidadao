/**
 * K6 Load Test for Admin API Endpoints
 * Tests API performance under various load conditions
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { config, environment, customMetrics } from './load-test-config.js';

// Export K6 options
export let options = config.options;

// Test data
const testData = environment.TEST_DATA;
let authToken = '';

// Setup function - runs once before the test
export function setup() {
  console.log('🚀 Starting Bot Denúncia Load Test');
  console.log(`📊 Target: ${environment.BASE_URL}`);
  console.log(`👥 Max VUs: ${Math.max(...Object.values(config.scenarios).map(s => s.vus || 0))}`);
  
  // Authenticate and get token
  const loginResponse = http.post(`${environment.API_BASE_URL}/auth/login`, {
    username: environment.ADMIN_USERNAME,
    password: environment.ADMIN_PASSWORD
  });
  
  if (loginResponse.status === 200) {
    const loginData = JSON.parse(loginResponse.body);
    authToken = loginData.token;
    console.log('✅ Authentication successful');
    return { authToken };
  } else {
    console.error('❌ Authentication failed');
    return { authToken: null };
  }
}

// Main test function
export default function(data) {
  const token = data.authToken || authToken;
  
  if (!token) {
    customMetrics.authentication_failures.add(1);
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Test different scenarios based on scenario tags
  const scenarioTag = __ENV.K6_SCENARIO || 'baseline_load';
  
  switch (scenarioTag) {
    case 'baseline_load':
      runBaselineTests(headers);
      break;
    case 'stress_test':
      runStressTests(headers);
      break;
    case 'spike_test':
      runSpikeTests(headers);
      break;
    case 'peak_load':
      runPeakLoadTests(headers);
      break;
    default:
      runBaselineTests(headers);
  }
  
  sleep(1); // 1 second between iterations
}

function runBaselineTests(headers) {
  group('Baseline Load Tests', function() {
    // Health check
    group('Health Check', function() {
      const startTime = Date.now();
      const response = http.get(`${environment.API_BASE_URL}/health`);
      const duration = Date.now() - startTime;
      
      check(response, {
        'health check status is 200': (r) => r.status === 200,
        'health check response time < 50ms': () => duration < 50
      });
      
      customMetrics.api_response_time.add(duration, { endpoint: 'health' });
    });
    
    // Dashboard API
    group('Dashboard Load', function() {
      const startTime = Date.now();
      const response = http.get(`${environment.API_BASE_URL}/admin/dashboard`, { headers });
      const duration = Date.now() - startTime;
      
      check(response, {
        'dashboard status is 200': (r) => r.status === 200,
        'dashboard has data': (r) => r.json('data.totalDenuncias') !== undefined,
        'dashboard response time < 200ms': () => duration < 200
      });
      
      customMetrics.dashboard_load_time.add(duration);
      customMetrics.api_response_time.add(duration, { endpoint: 'dashboard' });
    });
    
    // Denuncias list API
    group('Denuncias List', function() {
      const startTime = Date.now();
      const response = http.get(`${environment.API_BASE_URL}/admin/denuncias?page=1&limit=10`, { headers });
      const duration = Date.now() - startTime;
      
      check(response, {
        'denuncias list status is 200': (r) => r.status === 200,
        'denuncias list has pagination': (r) => r.json('data.pagination') !== undefined,
        'denuncias list response time < 200ms': () => duration < 200
      });
      
      customMetrics.api_response_time.add(duration, { endpoint: 'denuncias_list' });
    });
  });
}

function runStressTests(headers) {
  group('Stress Tests', function() {
    // Multiple concurrent API calls
    const responses = http.batch([
      ['GET', `${environment.API_BASE_URL}/admin/dashboard`, null, { headers, tags: { name: 'dashboard' } }],
      ['GET', `${environment.API_BASE_URL}/admin/denuncias?page=1&limit=10`, null, { headers, tags: { name: 'denuncias_list' } }],
      ['GET', `${environment.API_BASE_URL}/admin/denuncias?page=2&limit=10`, null, { headers, tags: { name: 'denuncias_list' } }],
      ['GET', `${environment.API_BASE_URL}/health`, null, { tags: { name: 'health_check' } }]
    ]);
    
    responses.forEach((response, index) => {
      check(response, {
        [`batch request ${index} status is 200`]: (r) => r.status === 200,
        [`batch request ${index} response time < 200ms`]: (r) => r.timings.duration < 200
      });
    });
    
    // Simulate denuncia approval under stress
    simulateDenunciaApproval(headers);
  });
}

function runSpikeTests(headers) {
  group('Spike Tests', function() {
    // Rapid fire requests to test sudden load
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      const response = http.get(`${environment.API_BASE_URL}/admin/dashboard`, { headers });
      const duration = Date.now() - startTime;
      
      check(response, {
        [`spike request ${i} status is 200`]: (r) => r.status === 200,
        [`spike request ${i} response time < 500ms`]: () => duration < 500 // More lenient during spikes
      });
      
      customMetrics.api_response_time.add(duration, { endpoint: 'dashboard_spike' });
    }
    
    // Test WebSocket connections during spike
    testWebSocketDuringSpike();
  });
}

function runPeakLoadTests(headers) {
  group('Peak Load Tests', function() {
    // Simulate peak hour operations
    const operations = [
      () => http.get(`${environment.API_BASE_URL}/admin/dashboard`, { headers }),
      () => http.get(`${environment.API_BASE_URL}/admin/denuncias?page=${Math.floor(Math.random() * 10) + 1}&limit=10`, { headers }),
      () => simulateDenunciaApproval(headers),
      () => simulateDenunciaRejection(headers)
    ];
    
    // Execute random operations
    const operation = operations[Math.floor(Math.random() * operations.length)];
    operation();
  });
}

function simulateDenunciaApproval(headers) {
  group('Denuncia Approval', function() {
    // First get a list of denuncias
    const listResponse = http.get(`${environment.API_BASE_URL}/admin/denuncias?status=PENDENTE_MODERACAO&limit=1`, { headers });
    
    if (listResponse.status === 200) {
      const denuncias = listResponse.json('data.denuncias');
      
      if (denuncias && denuncias.length > 0) {
        const denunciaId = denuncias[0].id;
        
        const startTime = Date.now();
        const approvalResponse = http.post(
          `${environment.API_BASE_URL}/admin/denuncias/${denunciaId}/approve`,
          JSON.stringify({
            observation: 'Approved by load test'
          }),
          { headers }
        );
        const duration = Date.now() - startTime;
        
        check(approvalResponse, {
          'approval status is 200': (r) => r.status === 200,
          'approval response time < 200ms': () => duration < 200
        });
        
        if (approvalResponse.status === 200) {
          customMetrics.approvals_performed.add(1);
          customMetrics.denuncias_processed.add(1);
        }
        
        customMetrics.api_response_time.add(duration, { endpoint: 'approve_denuncia' });
      }
    }
  });
}

function simulateDenunciaRejection(headers) {
  group('Denuncia Rejection', function() {
    const listResponse = http.get(`${environment.API_BASE_URL}/admin/denuncias?status=PENDENTE_MODERACAO&limit=1`, { headers });
    
    if (listResponse.status === 200) {
      const denuncias = listResponse.json('data.denuncias');
      
      if (denuncias && denuncias.length > 0) {
        const denunciaId = denuncias[0].id;
        
        const startTime = Date.now();
        const rejectionResponse = http.post(
          `${environment.API_BASE_URL}/admin/denuncias/${denunciaId}/reject`,
          JSON.stringify({
            reason: 'conteudo-inadequado',
            details: 'Rejected by load test'
          }),
          { headers }
        );
        const duration = Date.now() - startTime;
        
        check(rejectionResponse, {
          'rejection status is 200': (r) => r.status === 200,
          'rejection response time < 200ms': () => duration < 200
        });
        
        if (rejectionResponse.status === 200) {
          customMetrics.denuncias_processed.add(1);
        }
        
        customMetrics.api_response_time.add(duration, { endpoint: 'reject_denuncia' });
      }
    }
  });
}

function testWebSocketDuringSpike() {
  group('WebSocket Under Load', function() {
    const url = `ws://${environment.BASE_URL.replace('http://', '').replace('https://', '')}/ws`;
    
    const response = ws.connect(url, {}, function(socket) {
      socket.on('open', () => {
        customMetrics.ws_connections.add(1);
        console.log('WebSocket connected during spike test');
      });
      
      socket.on('message', (data) => {
        customMetrics.ws_messages.add(1);
        
        check(data, {
          'WebSocket message received': (d) => d.length > 0
        });
      });
      
      socket.on('error', (e) => {
        console.error('WebSocket error during spike:', e);
      });
      
      // Send test message
      socket.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }));
      
      // Keep connection open for 5 seconds
      sleep(5);
    });
  });
}

// Teardown function - runs once after the test
export function teardown(data) {
  console.log('🏁 Load test completed');
  console.log(`📈 Authentication failures: ${customMetrics.authentication_failures.count || 0}`);
  console.log(`✅ Denuncias processed: ${customMetrics.denuncias_processed.count || 0}`);
  console.log(`👍 Approvals performed: ${customMetrics.approvals_performed.count || 0}`);
}

// Handle summary data
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    scenarios: Object.keys(data.metrics.iterations.values).length,
    
    // Performance metrics
    response_times: {
      avg: Math.round(data.metrics.http_req_duration?.values?.avg || 0),
      p95: Math.round(data.metrics.http_req_duration?.values?.['p(95)'] || 0),
      p99: Math.round(data.metrics.http_req_duration?.values?.['p(99)'] || 0),
      max: Math.round(data.metrics.http_req_duration?.values?.max || 0)
    },
    
    // Request metrics
    requests: {
      total: data.metrics.http_reqs?.values?.count || 0,
      failed: data.metrics.http_req_failed?.values?.rate || 0,
      rate: Math.round(data.metrics.http_reqs?.values?.rate || 0)
    },
    
    // Business metrics
    business: {
      denuncias_processed: data.metrics.denuncias_processed?.values?.count || 0,
      approvals_performed: data.metrics.approvals_performed?.values?.count || 0,
      ws_messages: data.metrics.ws_messages?.values?.count || 0
    },
    
    // Roadmap compliance
    compliance: {
      p95_under_200ms: (data.metrics.http_req_duration?.values?.['p(95)'] || 0) < 200,
      error_rate_under_1percent: (data.metrics.http_req_failed?.values?.rate || 0) < 0.01,
      avg_under_100ms: (data.metrics.http_req_duration?.values?.avg || 0) < 100
    }
  };
  
  // Generate reports
  return {
    'test-results/k6-summary.json': JSON.stringify(summary, null, 2),
    'test-results/k6-detailed-report.json': JSON.stringify(data, null, 2),
    stdout: generateConsoleReport(summary)
  };
}

function generateConsoleReport(summary) {
  const compliance = summary.compliance;
  const allPassed = compliance.p95_under_200ms && compliance.error_rate_under_1percent && compliance.avg_under_100ms;
  
  return `
📊 K6 Load Test Results Summary
================================

⏱️  Duration: ${Math.round(summary.duration / 1000)}s
🔄 Total Requests: ${summary.requests.total}
📈 Request Rate: ${summary.requests.rate}/s

🎯 Performance Metrics:
   Average Response Time: ${summary.response_times.avg}ms
   95th Percentile: ${summary.response_times.p95}ms
   99th Percentile: ${summary.response_times.p99}ms
   Max Response Time: ${summary.response_times.max}ms

❌ Error Rate: ${(summary.requests.failed * 100).toFixed(2)}%

🎯 Business Metrics:
   Denuncias Processed: ${summary.business.denuncias_processed}
   Approvals Performed: ${summary.business.approvals_performed}
   WebSocket Messages: ${summary.business.ws_messages}

📋 Roadmap Compliance:
   ${compliance.p95_under_200ms ? '✅' : '❌'} P95 < 200ms: ${summary.response_times.p95}ms
   ${compliance.error_rate_under_1percent ? '✅' : '❌'} Error Rate < 1%: ${(summary.requests.failed * 100).toFixed(2)}%
   ${compliance.avg_under_100ms ? '✅' : '❌'} Average < 100ms: ${summary.response_times.avg}ms

🎉 Overall Status: ${allPassed ? '✅ ALL REQUIREMENTS MET' : '❌ SOME REQUIREMENTS NOT MET'}
================================
`;
}