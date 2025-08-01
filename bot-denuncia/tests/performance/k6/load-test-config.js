/**
 * K6 Load Testing Configuration
 * Performance testing configuration meeting roadmap requirements
 */

export const config = {
  // Test scenarios for different load patterns
  scenarios: {
    // Baseline load test
    baseline_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      tags: { test_type: 'baseline' }
    },
    
    // Stress test - gradual ramp up
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'stress' }
    },
    
    // Spike test - sudden load increases
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 10 },   // Normal load
        { duration: '30s', target: 200 }, // Sudden spike
        { duration: '1m', target: 10 },   // Back to normal
        { duration: '30s', target: 200 }, // Another spike
        { duration: '1m', target: 10 },   // Back to normal
      ],
      tags: { test_type: 'spike' }
    },
    
    // Peak load simulation
    peak_load: {
      executor: 'constant-vus',
      vus: 200,
      duration: '10m',
      tags: { test_type: 'peak' }
    }
  },
  
  // Performance thresholds (from roadmap requirements)
  thresholds: {
    // HTTP request duration - 95th percentile should be under 200ms
    'http_req_duration{p(95)}': ['p(95)<200'],
    
    // Average response time should be under 100ms
    'http_req_duration{avg}': ['avg<100'],
    
    // 99% of requests should complete successfully
    'http_req_failed': ['rate<0.01'],
    
    // Specific API endpoints performance
    'http_req_duration{name:dashboard}': ['p(95)<200', 'avg<100'],
    'http_req_duration{name:denuncias_list}': ['p(95)<200', 'avg<100'],
    'http_req_duration{name:health_check}': ['p(95)<50', 'avg<25'],
    
    // WebSocket connection stability
    'ws_connecting': ['avg<1000'],
    'ws_msgs_received': ['count>0'],
    
    // Database operations
    'db_query_duration': ['p(95)<50'],
    
    // Memory and resource usage
    'memory_usage': ['max<500'], // Max 500MB
    'cpu_usage': ['avg<80'],     // Average CPU < 80%
  },
  
  // Test options
  options: {
    // Graceful stop
    gracefulStop: '30s',
    
    // DNS resolution cache
    dns: {
      ttl: '1m',
      select: 'first',
      policy: 'any'
    },
    
    // HTTP settings
    http: {
      responseCallback: 'status',
      responseTimeout: '10s',
      keepalive: true
    },
    
    // Batch settings for data collection
    batch: 1000,
    batchPerHost: 10,
    
    // Custom metrics collection
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
    
    // Cloud output (optional)
    // ext: {
    //   loadimpact: {
    //     projectID: process.env.K6_PROJECT_ID,
    //     name: 'Bot Denúncia Load Test'
    //   }
    // }
  }
};

// Environment configuration
export const environment = {
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  
  // Test data configuration
  TEST_DATA: {
    PROTOCOLS: ['DEN-LOAD-001', 'DEN-LOAD-002', 'DEN-LOAD-003'],
    BAIRROS: ['Centro', 'Jardim', 'Vila Nova', 'Planalto', 'Assunção'],
    STATUSES: ['PENDENTE_MODERACAO', 'APROVADA', 'PUBLICADA', 'REJEITADA']
  }
};

// Custom metrics
export const customMetrics = {
  // Response time metrics
  dashboard_load_time: new Trend('dashboard_load_time'),
  api_response_time: new Trend('api_response_time'),
  
  // Business metrics
  denuncias_processed: new Counter('denuncias_processed'),
  approvals_performed: new Counter('approvals_performed'),
  
  // Error metrics
  authentication_failures: new Counter('authentication_failures'),
  database_errors: new Counter('database_errors'),
  
  // Resource metrics
  memory_usage: new Gauge('memory_usage'),
  cpu_usage: new Gauge('cpu_usage'),
  
  // WebSocket metrics
  ws_connections: new Gauge('ws_connections'),
  ws_messages: new Counter('ws_messages')
};