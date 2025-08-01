# Instagram Humanization Engine

## Overview

The Instagram Humanization Engine is a sophisticated anti-detection system that makes bot behavior completely indistinguishable from human patterns. It implements advanced algorithms to simulate natural human behavior on Instagram, preventing detection by Instagram's automated systems.

## 🚀 Key Features

### 1. Natural Timing Patterns
- **Gaussian Distribution**: Uses Box-Muller transform for realistic delay calculations
- **Human-like Variance**: ±50% variance around base delays
- **Dynamic Delays**: 5-60 minute range with intelligent adjustments
- **Emergency Mode**: Doubles delays when risk is high

### 2. Content Variation Engine
- **Template Rotation**: 10+ prefixes, connectors, and call-to-actions
- **Anti-Pattern System**: Avoids repetitive content structures  
- **Natural Language**: Varies sentence construction and flow
- **Emoji Integration**: 10% probability for natural emoji usage

### 3. Intelligent Hashtag Rotation
- **Multi-Pool System**: Base, municipal, problem-specific, community hashtags
- **Cooldown Mechanism**: 30-minute minimum between hashtag reuse
- **Category-Aware**: Adapts hashtags based on content category
- **Limit Compliance**: Maximum 15 hashtags per post

### 4. Human Activity Schedule
- **Peak Hours**: 8-12 AM and 6-10 PM preference
- **Day Weighting**: Higher activity Tuesday-Thursday
- **Weekend Patterns**: Different behavior on weekends
- **Sleep Schedule**: Reduced activity 11 PM - 7 AM

### 5. Real-time Risk Assessment
- **Multi-Factor Analysis**: Post frequency, timing, content similarity, hashtag patterns
- **Risk Score**: 0.0-1.0 scale with weighted calculations
- **Emergency Mode**: Activates at 0.7+ risk score
- **Adaptive Behavior**: Adjusts all patterns based on risk level

### 6. Header Randomization
- **User-Agent Pool**: 7 realistic mobile user agents
- **Dynamic Headers**: Realistic browser headers with variation
- **DNT Randomization**: 30% probability for Do Not Track
- **Mobile-First**: Focused on mobile device simulation

### 7. Engagement Simulation
- **Occasional Interaction**: 20% probability of engagement simulation
- **Natural Delays**: 10-40 second delays before engagement
- **Emergency Skip**: No engagement during high-risk periods
- **View Simulation**: Realistic post viewing patterns

## 🛡️ Anti-Detection Strategies

### Risk Management
```javascript
// Risk factors and weights
const riskFactors = {
    postFrequency: 0.25,    // Posts per hour analysis
    timingPattern: 0.20,    // Timing variance analysis
    contentSimilarity: 0.20, // Content repetition check
    hashtagRepetition: 0.20, // Hashtag reuse patterns
    sessionBehavior: 0.15    // Session duration analysis
};

// Emergency thresholds
const riskThresholds = {
    normal: 0.0 - 0.3,      // Continue current behavior
    low: 0.3 - 0.5,         // Minor adjustments
    medium: 0.5 - 0.7,      // Increase delays
    high: 0.7 - 0.8,        // Emergency mode
    critical: 0.8 - 1.0     // Stop all activity
};
```

### Behavior Patterns
```javascript
// Human activity distribution (hourly)
const hourlyActivity = {
    "08:00": 0.12,  // Morning peak
    "09:00": 0.10,  // Work hours
    "12:00": 0.09,  // Lunch break
    "19:00": 0.12,  // Evening activity
    "20:00": 0.15,  // Peak evening
    "21:00": 0.13,  // Wind down
    // ... complete 24-hour cycle
};

// Content variation templates
const contentTemplates = {
    prefixes: [
        "Denúncia cidadã:",
        "Problema identificado:",
        "Situação preocupante:",
        // ... 10 total variations
    ],
    connectors: [
        "foi identificado na região",
        "necessita atenção urgente",
        "requer intervenção imediata",
        // ... 10 total variations
    ]
};
```

## 📊 Usage Examples

### Basic Integration
```javascript
const InstagramService = require('./services/instagramService');
const instagramService = new InstagramService();

// The humanization engine is automatically initialized
// All posts will be humanized by default

const result = await instagramService.publicar({
    texto: "Problema na Rua das Flores",
    imagem: "/path/to/image.jpg",
    vereadores: [
        { nome: "João Silva", instagram: "@joao.silva" }
    ]
});

console.log('Humanization data:', result.humanization);
// Output:
// {
//   riskScore: 0.234,
//   emergencyMode: false,
//   contentVaried: true,
//   hashtagsRotated: true,
//   behaviorTracked: true
// }
```

### Risk Monitoring
```javascript
// Get current risk assessment
const risk = instagramService.getRiskAssessment();
console.log(`Current risk: ${risk.totalRisk.toFixed(3)}`);
console.log(`Emergency mode: ${risk.emergencyMode}`);
console.log(`Recommendation: ${risk.recommendation}`);

// Check optimal posting time
const timing = instagramService.isOptimalPostingTime();
if (timing.shouldDelay) {
    console.log(`Wait ${timing.delayMinutes} minutes for optimal time`);
}
```

### Behavior Analysis
```javascript
// Get comprehensive behavior report
const report = instagramService.getHumanizationReport();
console.log('Daily posts:', report.stats.dailyPostCount);
console.log('Session duration:', report.stats.sessionDuration);
console.log('Risk factors:', report.riskAssessment.factors);
console.log('Recommendations:', report.recommendations);
```

### Emergency Mode Control
```javascript
// Force emergency mode (for testing or crisis situations)
instagramService.setEmergencyMode(true);

// This will double all delays and increase caution
const emergencyResult = await instagramService.publicar({
    texto: "Urgent post",
    imagem: "/path/to/image.jpg"
});
```

## ⚙️ Configuration

### Environment Variables
```bash
# Basic Instagram credentials
INSTAGRAM_USERNAME=your_username
INSTAGRAM_PASSWORD=your_password

# Humanization settings
HUMANIZATION_TEST_MODE=false
NODE_ENV=production

# Auto-enable humanization
WHATSAPP_AUTO_INIT=true
```

### Custom Configuration
```javascript
// Modify humanizationConfig.js for custom settings
const humanizationConfig = {
    risk: {
        threshold: 0.7,           // Emergency mode trigger
        maxPostsPerHour: {
            normal: 3,
            emergency: 1
        }
    },
    timing: {
        baseDelay: {
            normal: 15,           // 15 minutes
            emergency: 30         // 30 minutes
        },
        variance: 0.5             // ±50% variance
    },
    content: {
        emojiProbability: 0.1,    // 10% emoji usage
        templateCooldown: 60      // 60 minute cooldown
    }
};
```

## 🧪 Testing

### Run Comprehensive Tests
```bash
cd bot-denuncia
node src/tests/instagramHumanizationEngine.test.js
```

### Test Coverage
- ✅ Natural delay generation (Gaussian distribution)
- ✅ Human activity schedule detection
- ✅ Content variation and template rotation
- ✅ Hashtag rotation and avoidance patterns
- ✅ Risk score calculation and emergency mode
- ✅ Behavior tracking and analysis
- ✅ User agent randomization
- ✅ Header generation and engagement simulation

### Expected Results
```
📊 TEST SUMMARY
Total Tests: 15
✅ Passed: 15
❌ Failed: 0
Success Rate: 100.0%

🎉 Instagram Humanization Engine is ready for production!
```

## 📈 Performance Metrics

### Risk Score Distribution
- **0.0-0.3**: Optimal behavior (continue current patterns)
- **0.3-0.5**: Low risk (minor adjustments)
- **0.5-0.7**: Medium risk (increase delays, vary content)
- **0.7-0.8**: High risk (emergency mode, double delays)
- **0.8-1.0**: Critical risk (stop all activity)

### Timing Characteristics
- **Base Delay**: 15 minutes (normal), 30 minutes (emergency)
- **Variance**: ±50% using Gaussian distribution
- **Range**: 5-60 minutes with emergency mode doubling
- **Activity Hours**: 7 AM - 10 PM with peak periods

### Content Variation
- **Template Pools**: 10 prefixes, 10 connectors, 10 call-to-actions
- **Uniqueness**: 90%+ unique content variations
- **Rotation**: 60-minute cooldown between template reuse
- **Emoji Usage**: 10% probability for natural enhancement

### Hashtag Strategy
- **Pool Size**: 50+ hashtags across 5 categories
- **Rotation Ratio**: 30-40% unique hashtags per batch
- **Maximum Count**: 15 hashtags per post
- **Cooldown**: 30 minutes between hashtag reuse

## 🔧 Troubleshooting

### Common Issues

#### High Risk Score
```javascript
// Check current factors
const risk = instagramService.getRiskAssessment();
console.log('Risk factors:', risk.factors);

// Most common causes:
// - Too many posts in short time (postFrequency: 1.0)
// - Repetitive content (contentSimilarity: 0.8+)
// - Same hashtags repeatedly (hashtagRepetition: 0.8+)
```

#### Emergency Mode Stuck
```javascript
// Manual reset
instagramService.setEmergencyMode(false);

// Wait for natural cooldown (risk factors decrease over time)
// Or restart the service to reset behavior history
```

#### Content Not Varying
```javascript
// Check template history
const report = instagramService.getHumanizationReport();
console.log('Content variation history:', report.stats);

// Clear history if needed (restart service)
// Or increase template cooldown in config
```

### Debug Mode
```javascript
// Enable debug logging
process.env.NODE_ENV = 'development';

// Restart service to see detailed humanization logs
// [HUMANIZATION] Debug mode enabled
// [HUMANIZATION] Natural pacing: aguardando 847s (14 min)
// [HUMANIZATION] Content varied generated
// [HUMANIZATION] Hashtags rotated: DenunciaCidada, SaoBernardo...
```

## 🛡️ Security Considerations

### Account Safety
- **Rate Limiting**: Respects Instagram's unofficial limits
- **Pattern Avoidance**: Sophisticated anti-detection algorithms
- **Emergency Protocols**: Automatic activity reduction under high risk
- **Session Management**: Realistic session patterns and durations

### Data Privacy
- **No Data Storage**: No personal data stored permanently
- **Behavior Tracking**: Only anonymous pattern analysis
- **Local Processing**: All humanization happens locally
- **Session Cleanup**: Automatic history cleanup after 7 days

### Best Practices
1. **Monitor Risk Scores**: Keep below 0.7 for optimal safety
2. **Respect Daily Limits**: Maximum 10-15 posts per day
3. **Use Peak Hours**: Post during 8-12 AM and 6-10 PM
4. **Vary Content**: Ensure diverse content and hashtags
5. **Regular Breaks**: Allow natural gaps in posting activity

## 📚 API Reference

### InstagramService Methods

#### `publicar(options)`
Main posting method with full humanization
```javascript
const result = await instagramService.publicar({
    texto: "Content text",
    imagem: "/path/to/image.jpg",
    vereadores: [{ nome: "Name", instagram: "@handle" }]
});
```

#### `getRiskAssessment()`
Get current risk analysis
```javascript
const risk = instagramService.getRiskAssessment();
// Returns: { totalRisk, factors, emergencyMode, recommendation }
```

#### `getHumanizationReport()`
Comprehensive behavior analysis
```javascript
const report = instagramService.getHumanizationReport();
// Returns: { timestamp, riskAssessment, schedule, stats, recommendations }
```

#### `isOptimalPostingTime()`
Check current posting conditions
```javascript
const timing = instagramService.isOptimalPostingTime();
// Returns: { isOptimal, isPeakHour, shouldDelay, timeProb }
```

#### `setEmergencyMode(enabled)`
Manual emergency mode control
```javascript
instagramService.setEmergencyMode(true);  // Enable
instagramService.setEmergencyMode(false); // Disable
```

### HumanizationEngine Methods

#### `calculateNaturalDelay(baseMinutes)`
Generate human-like delays
```javascript
const delay = engine.calculateNaturalDelay(15); // Returns milliseconds
```

#### `generateContentVariation(content, metadata)`
Create content variations
```javascript
const varied = engine.generateContentVariation(
    "Original content",
    { vereadores: [...], categoria: "infraestrutura" }
);
```

#### `generateHashtagRotation(vereadores, categoria)`
Generate rotating hashtags
```javascript
const hashtags = engine.generateHashtagRotation(
    [{ nome: "Name", instagram: "@handle" }],
    "infraestrutura"
);
```

## 🚀 Production Deployment

### Setup Checklist
- [ ] Configure Instagram credentials
- [ ] Set environment variables
- [ ] Run comprehensive tests
- [ ] Monitor initial risk scores
- [ ] Set up logging and monitoring
- [ ] Configure rate limiting
- [ ] Test emergency mode activation

### Monitoring
```javascript
// Set up periodic risk monitoring
setInterval(() => {
    const risk = instagramService.getRiskAssessment();
    if (risk.totalRisk > 0.6) {
        console.warn('High risk detected:', risk.recommendation);
    }
}, 300000); // Every 5 minutes
```

### Scaling Considerations
- **Single Account**: Optimized for one Instagram account
- **Rate Limits**: Automatic compliance with Instagram limits
- **Resource Usage**: Minimal CPU/memory footprint
- **Concurrent Posts**: Sequential processing recommended

---

## 📞 Support

For issues or questions about the Instagram Humanization Engine:

1. **Check Logs**: Enable debug mode for detailed information
2. **Run Tests**: Verify all components are working correctly
3. **Monitor Risk**: Keep risk scores below 0.7
4. **Review Config**: Ensure proper configuration settings

The Instagram Humanization Engine provides production-ready anti-detection capabilities, ensuring your Instagram automation remains completely undetectable while maintaining natural human behavior patterns.