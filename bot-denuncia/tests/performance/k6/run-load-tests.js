/**
 * K6 Load Test Runner
 * Orchestrates different types of performance tests
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

class LoadTestRunner {
  constructor() {
    this.baseDir = process.cwd();
    this.resultsDir = join(this.baseDir, 'test-results', 'k6');
    this.testDir = join(this.baseDir, 'tests', 'performance', 'k6');
    
    // Ensure results directory exists
    if (!existsSync(this.resultsDir)) {
      mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive K6 load testing suite...\n');
    
    const testSuites = [
      {
        name: 'Baseline Load Test',
        scenario: 'baseline_load',
        description: 'Standard load with 10 concurrent users for 5 minutes'
      },
      {
        name: 'Stress Test',
        scenario: 'stress_test',
        description: 'Gradual ramp-up to 100 concurrent users'
      },
      {
        name: 'Spike Test',
        scenario: 'spike_test',
        description: 'Sudden load spikes to test resilience'
      },
      {
        name: 'Peak Load Test',
        scenario: 'peak_load',
        description: 'Peak hour simulation with 200 concurrent users'
      }
    ];
    
    const results = [];
    
    for (const suite of testSuites) {
      console.log(`📊 Running ${suite.name}...`);
      console.log(`   ${suite.description}\n`);
      
      try {
        const result = await this.runTest(suite.scenario);
        results.push({
          ...suite,
          result,
          status: 'PASSED',
          timestamp: new Date().toISOString()
        });
        
        console.log(`✅ ${suite.name} completed successfully\n`);
      } catch (error) {
        console.error(`❌ ${suite.name} failed:`, error.message);
        results.push({
          ...suite,
          error: error.message,
          status: 'FAILED',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Generate comprehensive report
    await this.generateComprehensiveReport(results);
    
    console.log('🏁 All load tests completed!');
    console.log(`📊 Results saved to: ${this.resultsDir}`);
    
    return results;
  }

  async runTest(scenario) {
    const testFile = join(this.testDir, 'admin-api-load-test.js');
    const outputFile = join(this.resultsDir, `${scenario}-results.json`);
    
    // Build K6 command
    const k6Command = [
      'k6 run',
      `--env K6_SCENARIO=${scenario}`,
      `--out json=${outputFile}`,
      '--quiet',
      testFile
    ].join(' ');
    
    console.log(`   Executing: ${k6Command}`);
    
    try {
      const output = execSync(k6Command, {
        encoding: 'utf8',
        timeout: 1800000, // 30 minutes timeout
        env: {
          ...process.env,
          BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
          ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
          ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123'
        }
      });
      
      // Parse results
      const resultData = this.parseTestResults(outputFile);
      
      return {
        output,
        metrics: resultData,
        success: true
      };
    } catch (error) {
      throw new Error(`K6 test failed: ${error.message}`);
    }
  }

  parseTestResults(outputFile) {
    if (!existsSync(outputFile)) {
      return null;
    }
    
    try {
      const rawData = readFileSync(outputFile, 'utf8');
      const lines = rawData.trim().split('\n');
      const metrics = {};
      
      lines.forEach(line => {
        try {
          const data = JSON.parse(line);
          if (data.type === 'Point' && data.metric) {
            if (!metrics[data.metric]) {
              metrics[data.metric] = [];
            }
            metrics[data.metric].push(data.data);
          }
        } catch (e) {
          // Ignore malformed lines
        }
      });
      
      return this.calculateMetricsSummary(metrics);
    } catch (error) {
      console.warn(`Could not parse results from ${outputFile}:`, error.message);
      return null;
    }
  }

  calculateMetricsSummary(metrics) {
    const summary = {};
    
    Object.keys(metrics).forEach(metricName => {
      const values = metrics[metricName]
        .map(point => point.value)
        .filter(val => typeof val === 'number' && !isNaN(val));
      
      if (values.length > 0) {
        values.sort((a, b) => a - b);
        
        summary[metricName] = {
          count: values.length,
          min: values[0],
          max: values[values.length - 1],
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          median: values[Math.floor(values.length / 2)],
          p90: values[Math.floor(values.length * 0.9)],
          p95: values[Math.floor(values.length * 0.95)],
          p99: values[Math.floor(values.length * 0.99)]
        };
      }
    });
    
    return summary;
  }

  async generateComprehensiveReport(results) {
    const timestamp = new Date().toISOString();
    
    // Calculate overall statistics
    const passedTests = results.filter(r => r.status === 'PASSED');
    const failedTests = results.filter(r => r.status === 'FAILED');
    
    // Aggregate performance metrics
    const performanceMetrics = this.aggregatePerformanceMetrics(results);
    
    // Check roadmap compliance
    const compliance = this.checkRoadmapCompliance(performanceMetrics);
    
    const report = {
      timestamp,
      summary: {
        totalTests: results.length,
        passed: passedTests.length,
        failed: failedTests.length,
        successRate: (passedTests.length / results.length) * 100
      },
      performanceMetrics,
      compliance,
      results,
      recommendations: this.generateRecommendations(performanceMetrics, compliance)
    };
    
    // Save comprehensive report
    const reportFile = join(this.resultsDir, 'comprehensive-report.json');
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    await this.generateHTMLReport(report);
    
    // Generate markdown summary
    await this.generateMarkdownSummary(report);
    
    console.log('\n📋 Performance Test Summary:');
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Success Rate: ${report.summary.successRate.toFixed(1)}%`);
    
    if (performanceMetrics.responseTime) {
      console.log(`\n⚡ Response Time Metrics:`);
      console.log(`   Average: ${performanceMetrics.responseTime.avg?.toFixed(2) || 'N/A'}ms`);
      console.log(`   P95: ${performanceMetrics.responseTime.p95?.toFixed(2) || 'N/A'}ms`);
      console.log(`   P99: ${performanceMetrics.responseTime.p99?.toFixed(2) || 'N/A'}ms`);
    }
    
    console.log(`\n🎯 Roadmap Compliance:`);
    console.log(`   ${compliance.responseTimeP95 ? '✅' : '❌'} P95 < 200ms`);
    console.log(`   ${compliance.averageResponseTime ? '✅' : '❌'} Average < 100ms`);
    console.log(`   ${compliance.errorRate ? '✅' : '❌'} Error Rate < 1%`);
    console.log(`   ${compliance.uptime ? '✅' : '❌'} Uptime > 99.9%`);
    
    return report;
  }

  aggregatePerformanceMetrics(results) {
    const allMetrics = {
      responseTime: [],
      errorRate: [],
      throughput: []
    };
    
    results.forEach(result => {
      if (result.result && result.result.metrics) {
        const metrics = result.result.metrics;
        
        // Aggregate response times
        if (metrics.http_req_duration) {
          allMetrics.responseTime.push(metrics.http_req_duration);
        }
        
        // Aggregate error rates
        if (metrics.http_req_failed) {
          allMetrics.errorRate.push(metrics.http_req_failed);
        }
        
        // Aggregate throughput
        if (metrics.http_reqs) {
          allMetrics.throughput.push(metrics.http_reqs);
        }
      }
    });
    
    // Calculate aggregated statistics
    const aggregated = {};
    
    Object.keys(allMetrics).forEach(metricType => {
      if (allMetrics[metricType].length > 0) {
        const values = allMetrics[metricType].flatMap(metric => 
          Object.values(metric).filter(val => typeof val === 'number')
        );
        
        if (values.length > 0) {
          values.sort((a, b) => a - b);
          
          aggregated[metricType] = {
            avg: values.reduce((sum, val) => sum + val, 0) / values.length,
            min: values[0],
            max: values[values.length - 1],
            p95: values[Math.floor(values.length * 0.95)],
            p99: values[Math.floor(values.length * 0.99)]
          };
        }
      }
    });
    
    return aggregated;
  }

  checkRoadmapCompliance(metrics) {
    return {
      responseTimeP95: (metrics.responseTime?.p95 || 0) < 200,
      averageResponseTime: (metrics.responseTime?.avg || 0) < 100,
      errorRate: (metrics.errorRate?.avg || 0) < 0.01, // < 1%
      uptime: (1 - (metrics.errorRate?.avg || 0)) > 0.999 // > 99.9%
    };
  }

  generateRecommendations(metrics, compliance) {
    const recommendations = [];
    
    if (!compliance.responseTimeP95) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        issue: 'P95 response time exceeds 200ms threshold',
        suggestion: 'Consider optimizing database queries, implementing caching, or scaling infrastructure'
      });
    }
    
    if (!compliance.averageResponseTime) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        issue: 'Average response time exceeds 100ms threshold',
        suggestion: 'Review slow endpoints and optimize critical paths'
      });
    }
    
    if (!compliance.errorRate) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        issue: 'Error rate exceeds 1% threshold',
        suggestion: 'Investigate error causes and implement better error handling'
      });
    }
    
    if (!compliance.uptime) {
      recommendations.push({
        type: 'reliability',
        priority: 'critical',
        issue: 'Uptime below 99.9% requirement',
        suggestion: 'Implement redundancy, health checks, and automatic failover'
      });
    }
    
    return recommendations;
  }

  async generateHTMLReport(report) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bot Denúncia - Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric-card.success { border-left-color: #28a745; }
        .metric-card.warning { border-left-color: #ffc107; }
        .metric-card.danger { border-left-color: #dc3545; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; }
        .compliance-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; }
        .compliance-pass { background: #d4edda; color: #155724; }
        .compliance-fail { background: #f8d7da; color: #721c24; }
        .test-results { margin-top: 30px; }
        .test-item { background: #f8f9fa; margin-bottom: 15px; padding: 15px; border-radius: 8px; }
        .recommendations { background: #fff3cd; padding: 20px; border-radius: 8px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Bot Denúncia Load Test Report</h1>
            <p>Generated: ${report.timestamp}</p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card ${report.summary.successRate === 100 ? 'success' : 'warning'}">
                <div class="metric-value">${report.summary.successRate.toFixed(1)}%</div>
                <div class="metric-label">Test Success Rate</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">${report.performanceMetrics.responseTime?.avg?.toFixed(2) || 'N/A'}ms</div>
                <div class="metric-label">Average Response Time</div>
            </div>
            
            <div class="metric-card ${report.compliance.responseTimeP95 ? 'success' : 'danger'}">
                <div class="metric-value">${report.performanceMetrics.responseTime?.p95?.toFixed(2) || 'N/A'}ms</div>
                <div class="metric-label">P95 Response Time</div>
            </div>
            
            <div class="metric-card ${report.compliance.errorRate ? 'success' : 'danger'}">
                <div class="metric-value">${((report.performanceMetrics.errorRate?.avg || 0) * 100).toFixed(3)}%</div>
                <div class="metric-label">Error Rate</div>
            </div>
        </div>
        
        <h2>📋 Roadmap Compliance</h2>
        <p>
            P95 < 200ms: <span class="compliance-status ${report.compliance.responseTimeP95 ? 'compliance-pass' : 'compliance-fail'}">${report.compliance.responseTimeP95 ? 'PASS' : 'FAIL'}</span><br>
            Average < 100ms: <span class="compliance-status ${report.compliance.averageResponseTime ? 'compliance-pass' : 'compliance-fail'}">${report.compliance.averageResponseTime ? 'PASS' : 'FAIL'}</span><br>
            Error Rate < 1%: <span class="compliance-status ${report.compliance.errorRate ? 'compliance-pass' : 'compliance-fail'}">${report.compliance.errorRate ? 'PASS' : 'FAIL'}</span><br>
            Uptime > 99.9%: <span class="compliance-status ${report.compliance.uptime ? 'compliance-pass' : 'compliance-fail'}">${report.compliance.uptime ? 'PASS' : 'FAIL'}</span>
        </p>
        
        <div class="test-results">
            <h2>🧪 Test Results</h2>
            ${report.results.map(result => `
                <div class="test-item">
                    <h3>${result.name} - <span style="color: ${result.status === 'PASSED' ? '#28a745' : '#dc3545'}">${result.status}</span></h3>
                    <p>${result.description}</p>
                    ${result.error ? `<p style="color: #dc3545;">Error: ${result.error}</p>` : ''}
                </div>
            `).join('')}
        </div>
        
        ${report.recommendations.length > 0 ? `
            <div class="recommendations">
                <h2>💡 Recommendations</h2>
                ${report.recommendations.map(rec => `
                    <div style="margin-bottom: 15px;">
                        <strong>${rec.priority.toUpperCase()}: ${rec.issue}</strong><br>
                        <em>Suggestion: ${rec.suggestion}</em>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    </div>
</body>
</html>
    `;
    
    const htmlFile = join(this.resultsDir, 'load-test-report.html');
    writeFileSync(htmlFile, htmlContent);
  }

  async generateMarkdownSummary(report) {
    const mdContent = `# Load Test Results Summary

**Generated:** ${report.timestamp}

## 📊 Overview

- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passed}
- **Failed:** ${report.summary.failed}
- **Success Rate:** ${report.summary.successRate.toFixed(1)}%

## ⚡ Performance Metrics

| Metric | Value |
|--------|-------|
| Average Response Time | ${report.performanceMetrics.responseTime?.avg?.toFixed(2) || 'N/A'}ms |
| P95 Response Time | ${report.performanceMetrics.responseTime?.p95?.toFixed(2) || 'N/A'}ms |
| P99 Response Time | ${report.performanceMetrics.responseTime?.p99?.toFixed(2) || 'N/A'}ms |
| Error Rate | ${((report.performanceMetrics.errorRate?.avg || 0) * 100).toFixed(3)}% |

## 🎯 Roadmap Compliance

| Requirement | Status | Current Value |
|-------------|--------|---------------|
| P95 < 200ms | ${report.compliance.responseTimeP95 ? '✅ PASS' : '❌ FAIL'} | ${report.performanceMetrics.responseTime?.p95?.toFixed(2) || 'N/A'}ms |
| Average < 100ms | ${report.compliance.averageResponseTime ? '✅ PASS' : '❌ FAIL'} | ${report.performanceMetrics.responseTime?.avg?.toFixed(2) || 'N/A'}ms |
| Error Rate < 1% | ${report.compliance.errorRate ? '✅ PASS' : '❌ FAIL'} | ${((report.performanceMetrics.errorRate?.avg || 0) * 100).toFixed(3)}% |
| Uptime > 99.9% | ${report.compliance.uptime ? '✅ PASS' : '❌ FAIL'} | ${((1 - (report.performanceMetrics.errorRate?.avg || 0)) * 100).toFixed(3)}% |

## 🧪 Test Details

${report.results.map(result => `
### ${result.name}
- **Status:** ${result.status}
- **Description:** ${result.description}
${result.error ? `- **Error:** ${result.error}` : ''}
`).join('\n')}

${report.recommendations.length > 0 ? `
## 💡 Recommendations

${report.recommendations.map(rec => `
### ${rec.priority.toUpperCase()}: ${rec.issue}
${rec.suggestion}
`).join('\n')}
` : ''}

---
*Generated by Bot Denúncia Load Testing Suite*
`;
    
    const mdFile = join(this.resultsDir, 'load-test-summary.md');
    writeFileSync(mdFile, mdContent);
  }
}

// Export for use in package.json scripts
if (require.main === module) {
  const runner = new LoadTestRunner();
  runner.runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Load test runner failed:', error);
      process.exit(1);
    });
}

export default LoadTestRunner;