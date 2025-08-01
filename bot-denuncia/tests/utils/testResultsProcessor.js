/**
 * Custom Test Results Processor
 * Generates performance metrics and KPI validation reports
 */

const fs = require('fs');
const path = require('path');

module.exports = (results) => {
  const testResults = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      skippedTests: results.numPendingTests,
      testSuites: results.numTotalTestSuites,
      coverage: results.coverageMap ? {
        lines: Math.round((results.coverageMap.getCoverageSummary().lines.pct || 0) * 100) / 100,
        functions: Math.round((results.coverageMap.getCoverageSummary().functions.pct || 0) * 100) / 100,
        branches: Math.round((results.coverageMap.getCoverageSummary().branches.pct || 0) * 100) / 100,
        statements: Math.round((results.coverageMap.getCoverageSummary().statements.pct || 0) * 100) / 100
      } : null
    },
    performance: {
      totalTime: results.testResults.reduce((acc, suite) => acc + (suite.perfStats?.end - suite.perfStats?.start || 0), 0),
      averageTestTime: results.numTotalTests > 0 ? 
        results.testResults.reduce((acc, suite) => acc + (suite.perfStats?.end - suite.perfStats?.start || 0), 0) / results.numTotalTests : 0,
      slowestTest: findSlowestTest(results.testResults),
      performanceKPIs: {
        under200ms: countTestsUnderThreshold(results.testResults, 200),
        under500ms: countTestsUnderThreshold(results.testResults, 500),
        under1000ms: countTestsUnderThreshold(results.testResults, 1000)
      }
    },
    roadmapCompliance: {
      coverageTarget: results.coverageMap ? {
        achieved: results.coverageMap.getCoverageSummary().lines.pct >= 80,
        current: Math.round(results.coverageMap.getCoverageSummary().lines.pct * 100) / 100,
        target: 80
      } : null,
      performanceTarget: {
        achieved: countTestsUnderThreshold(results.testResults, 200) / results.numTotalTests >= 0.95,
        current: Math.round((countTestsUnderThreshold(results.testResults, 200) / results.numTotalTests) * 100),
        target: 95
      },
      reliabilityTarget: {
        achieved: (results.numPassedTests / results.numTotalTests) >= 0.999,
        current: Math.round((results.numPassedTests / results.numTotalTests) * 100 * 100) / 100,
        target: 99.9
      }
    },
    testSuites: results.testResults.map(suite => ({
      name: suite.testFilePath.replace(process.cwd(), ''),
      tests: suite.numPassingTests + suite.numFailingTests,
      passed: suite.numPassingTests,
      failed: suite.numFailingTests,
      duration: suite.perfStats ? suite.perfStats.end - suite.perfStats.start : 0,
      coverage: suite.coverage ? {
        lines: suite.coverage.lines?.pct || 0,
        functions: suite.coverage.functions?.pct || 0,
        branches: suite.coverage.branches?.pct || 0,
        statements: suite.coverage.statements?.pct || 0
      } : null
    }))
  };

  // Generate reports
  generateReports(testResults);
  
  return results;
};

function findSlowestTest(testResults) {
  let slowest = { name: 'N/A', duration: 0 };
  
  testResults.forEach(suite => {
    if (suite.testResults) {
      suite.testResults.forEach(test => {
        if (test.duration && test.duration > slowest.duration) {
          slowest = {
            name: `${suite.testFilePath.split('/').pop()} → ${test.title}`,
            duration: test.duration
          };
        }
      });
    }
  });
  
  return slowest;
}

function countTestsUnderThreshold(testResults, threshold) {
  let count = 0;
  
  testResults.forEach(suite => {
    if (suite.testResults) {
      suite.testResults.forEach(test => {
        if (test.duration && test.duration < threshold) {
          count++;
        }
      });
    }
  });
  
  return count;
}

function generateReports(testResults) {
  const reportsDir = path.join(process.cwd(), 'test-reports');
  
  // Ensure reports directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Generate JSON report
  fs.writeFileSync(
    path.join(reportsDir, 'test-results.json'),
    JSON.stringify(testResults, null, 2)
  );
  
  // Generate HTML report
  const htmlReport = generateHTMLReport(testResults);
  fs.writeFileSync(
    path.join(reportsDir, 'test-results.html'),
    htmlReport
  );
  
  // Generate KPI compliance report
  const kpiReport = generateKPIReport(testResults);
  fs.writeFileSync(
    path.join(reportsDir, 'kpi-compliance.md'),
    kpiReport
  );
  
  console.log('\n📊 Test Reports Generated:');
  console.log(`   📄 JSON: ${path.join(reportsDir, 'test-results.json')}`);
  console.log(`   🌐 HTML: ${path.join(reportsDir, 'test-results.html')}`);
  console.log(`   📈 KPI: ${path.join(reportsDir, 'kpi-compliance.md')}`);
}

function generateHTMLReport(testResults) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bot Denúncia - Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .kpi-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .kpi-card.success { border-left-color: #28a745; }
        .kpi-card.warning { border-left-color: #ffc107; }
        .kpi-card.danger { border-left-color: #dc3545; }
        .kpi-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .kpi-label { color: #666; font-size: 0.9em; }
        .test-suites { margin-top: 30px; }
        .suite { background: #f8f9fa; margin-bottom: 15px; border-radius: 8px; overflow: hidden; }
        .suite-header { background: #e9ecef; padding: 15px; font-weight: bold; }
        .suite-content { padding: 15px; }
        .status-passed { color: #28a745; }
        .status-failed { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Bot Denúncia Test Results</h1>
            <p>Generated: ${testResults.timestamp}</p>
        </div>
        
        <div class="kpi-grid">
            <div class="kpi-card ${testResults.summary.failedTests === 0 ? 'success' : 'danger'}">
                <div class="kpi-value">${testResults.summary.passedTests}/${testResults.summary.totalTests}</div>
                <div class="kpi-label">Tests Passed</div>
            </div>
            
            <div class="kpi-card ${testResults.roadmapCompliance.coverageTarget?.achieved ? 'success' : 'warning'}">
                <div class="kpi-value">${testResults.roadmapCompliance.coverageTarget?.current || 0}%</div>
                <div class="kpi-label">Code Coverage (Target: 80%)</div>
            </div>
            
            <div class="kpi-card ${testResults.roadmapCompliance.performanceTarget.achieved ? 'success' : 'warning'}">
                <div class="kpi-value">${testResults.roadmapCompliance.performanceTarget.current}%</div>
                <div class="kpi-label">Tests Under 200ms (Target: 95%)</div>
            </div>
            
            <div class="kpi-card ${testResults.roadmapCompliance.reliabilityTarget.achieved ? 'success' : 'danger'}">
                <div class="kpi-value">${testResults.roadmapCompliance.reliabilityTarget.current}%</div>
                <div class="kpi-label">Test Reliability (Target: 99.9%)</div>
            </div>
        </div>
        
        <div class="test-suites">
            <h2>Test Suites</h2>
            ${testResults.testSuites.map(suite => `
                <div class="suite">
                    <div class="suite-header">
                        ${suite.name}
                        <span class="status-${suite.failed === 0 ? 'passed' : 'failed'}">
                            (${suite.passed}/${suite.tests} passed)
                        </span>
                    </div>
                    <div class="suite-content">
                        <p><strong>Duration:</strong> ${suite.duration}ms</p>
                        ${suite.coverage ? `
                            <p><strong>Coverage:</strong> 
                                Lines: ${suite.coverage.lines}%, 
                                Functions: ${suite.coverage.functions}%, 
                                Branches: ${suite.coverage.branches}%
                            </p>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
  `.trim();
}

function generateKPIReport(testResults) {
  const compliance = testResults.roadmapCompliance;
  
  return `# KPI Compliance Report - Bot Denúncia

Generated: ${testResults.timestamp}

## Roadmap KPI Status

### ✅ Test Coverage
- **Target:** 80%
- **Current:** ${compliance.coverageTarget?.current || 0}%
- **Status:** ${compliance.coverageTarget?.achieved ? '✅ ACHIEVED' : '❌ NOT ACHIEVED'}

### ⚡ Performance (Response Time < 200ms P95)
- **Target:** 95% of tests under 200ms
- **Current:** ${compliance.performanceTarget.current}%
- **Status:** ${compliance.performanceTarget.achieved ? '✅ ACHIEVED' : '❌ NOT ACHIEVED'}

### 🛡️ Reliability (Uptime > 99.9%)
- **Target:** 99.9% test success rate
- **Current:** ${compliance.reliabilityTarget.current}%
- **Status:** ${compliance.reliabilityTarget.achieved ? '✅ ACHIEVED' : '❌ NOT ACHIEVED'}

## Performance Metrics

- **Total Tests:** ${testResults.summary.totalTests}
- **Average Test Time:** ${Math.round(testResults.performance.averageTestTime)}ms
- **Slowest Test:** ${testResults.performance.slowestTest.name} (${testResults.performance.slowestTest.duration}ms)

### Performance Distribution
- **Under 200ms:** ${testResults.performance.performanceKPIs.under200ms} tests
- **Under 500ms:** ${testResults.performance.performanceKPIs.under500ms} tests
- **Under 1000ms:** ${testResults.performance.performanceKPIs.under1000ms} tests

## Summary

${compliance.coverageTarget?.achieved && compliance.performanceTarget.achieved && compliance.reliabilityTarget.achieved 
  ? '🎉 **ALL ROADMAP KPIs ACHIEVED!**' 
  : '⚠️ **Some KPIs need attention**'
}

### Next Steps
${!compliance.coverageTarget?.achieved ? '- Increase test coverage to reach 80% minimum\n' : ''}${!compliance.performanceTarget.achieved ? '- Optimize slow tests to meet performance targets\n' : ''}${!compliance.reliabilityTarget.achieved ? '- Fix failing tests to improve reliability\n' : ''}${compliance.coverageTarget?.achieved && compliance.performanceTarget.achieved && compliance.reliabilityTarget.achieved ? '- Maintain current quality standards\n- Continue monitoring for regressions\n' : ''}
`;
}