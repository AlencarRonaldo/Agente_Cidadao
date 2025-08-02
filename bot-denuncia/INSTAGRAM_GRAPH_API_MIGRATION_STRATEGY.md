# Instagram Graph API Migration Strategy
## Advanced Humanization Engine Migration Plan

### Executive Summary

This migration strategy bridges the gap between the current sophisticated Instagram Private API humanization system and Instagram Graph API compliance. The approach maintains all anti-detection patterns while adapting to official API constraints.

**Current System Capabilities Preserved:**
- ✅ Natural timing patterns with Gaussian distribution
- ✅ Content variation engine with sophisticated templates
- ✅ Intelligent hashtag rotation system
- ✅ Risk assessment monitoring (0.0-1.0 scale)
- ✅ Queue-based architecture with BullMQ
- ✅ Redis-backed rate limiting
- ✅ Comprehensive error handling and recovery

**New Graph API Enhancements:**
- ✅ Official API compliance (200 requests/hour, 25 posts/day)
- ✅ Automatic token management with refresh
- ✅ Public image hosting service
- ✅ Enhanced error handling for Graph API
- ✅ Improved security with token encryption

## Migration Architecture

### Core Components Created

1. **InstagramGraphApiHumanizationService** (`instagramGraphApiHumanizationService.js`)
   - Maintains all current humanization sophistication
   - Adapts timing patterns for Graph API rate limits
   - Enhanced risk assessment with Graph API factors
   - Natural posting patterns within official constraints

2. **InstagramTokenManager** (`instagramTokenManager.js`)
   - Automatic long-lived token refresh
   - Encrypted token storage
   - Health monitoring and validation
   - Comprehensive error recovery

3. **ImageHostingService** (`imageHostingService.js`)
   - Local Express server for public URLs
   - Temporary image hosting with auto-cleanup
   - Security measures and rate limiting
   - CDN-ready architecture

4. **InstagramGraphApiService** (`instagramGraphApiService.js`)
   - Main service compatible with existing `publicar()` interface
   - Two-step Graph API publishing process
   - Complete integration of all humanization features
   - Error handling for all Graph API scenarios

## Phase-by-Phase Migration Plan

### Phase 1: Preparation & Setup (Week 1-2)

#### 1.1 Instagram Business Account Setup
```bash
# Required steps:
1. Convert Instagram account to Business Account
2. Create/link Facebook Page
3. Create Facebook App at https://developers.facebook.com/
4. Add Instagram Graph API to the app
5. Request permissions: instagram_basic, instagram_content_publish
6. Generate User Access Token
7. Exchange for Long-Lived Token (60 days)
```

#### 1.2 Environment Configuration
```bash
# Add to .env file:
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_business_account_id
INSTAGRAM_API_VERSION=v18.0
ENCRYPTION_SECRET=your_strong_encryption_secret

# Image hosting configuration
IMAGE_HOST_PORT=3351
IMAGE_HOST_URL=https://your-domain.com
IMAGE_PUBLIC_PATH=./uploads/public
```

#### 1.3 Dependencies Update
```bash
# Remove instagram-private-api
npm uninstall instagram-private-api

# Add required dependencies
npm install axios express express-rate-limit
```

### Phase 2: Service Integration (Week 2-3)

#### 2.1 Update Package Dependencies
Update `package.json` to remove `instagram-private-api` and add Graph API dependencies:

```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "express": "^4.18.0",
    "express-rate-limit": "^7.0.0"
  }
}
```

#### 2.2 Service Initialization
Add initialization to `src/app.js` or main application file:

```javascript
const InstagramGraphApiService = require('./services/instagramGraphApiService');

// Initialize Graph API service
const instagramGraphApiService = new InstagramGraphApiService();

// Initialize on startup
instagramGraphApiService.initialize().then(success => {
  if (success) {
    console.log('✅ Instagram Graph API Service initialized');
  } else {
    console.error('❌ Failed to initialize Instagram Graph API Service');
  }
});
```

### Phase 3: Gradual Migration (Week 3-4)

#### 3.1 Feature Flag Implementation
Create a feature flag system for gradual rollout:

```javascript
// src/config/featureFlags.js
const featureFlags = {
  useGraphApi: process.env.USE_GRAPH_API === 'true',
  graphApiRolloutPercentage: parseInt(process.env.GRAPH_API_ROLLOUT) || 0
};

module.exports = featureFlags;
```

#### 3.2 Service Selector Pattern
Update the publish worker to support both services:

```javascript
// src/queues/publishWorker.js - Update the publishing logic
const featureFlags = require('../config/featureFlags');
const instagramService = require('../services/instagramService'); // Old service
const instagramGraphApiService = require('../services/instagramGraphApiService'); // New service

// Service selection logic
function getInstagramService(userId = null) {
  if (!featureFlags.useGraphApi) {
    return instagramService;
  }
  
  // Gradual rollout based on percentage
  if (featureFlags.graphApiRolloutPercentage < 100) {
    const userHash = userId ? 
      parseInt(crypto.createHash('md5').update(userId.toString()).digest('hex').substring(0, 8), 16) : 
      Math.random() * 100;
    
    const rolloutBucket = userHash % 100;
    
    if (rolloutBucket < featureFlags.graphApiRolloutPercentage) {
      return instagramGraphApiService;
    }
  } else {
    return instagramGraphApiService;
  }
  
  return instagramService;
}

// Use in worker:
const selectedService = getInstagramService(userId);
const { success, postId, postUrl, error: instagramError } = await selectedService.publicar({
  texto: texto,
  imagem: imagem,
  vereadores: vereadores,
  bairro: bairro,
});
```

#### 3.3 Migration Schedule
```bash
# Week 3, Day 1-2: 10% traffic to Graph API
GRAPH_API_ROLLOUT=10

# Week 3, Day 3-4: 25% traffic to Graph API  
GRAPH_API_ROLLOUT=25

# Week 3, Day 5-7: 50% traffic to Graph API
GRAPH_API_ROLLOUT=50

# Week 4, Day 1-3: 75% traffic to Graph API
GRAPH_API_ROLLOUT=75

# Week 4, Day 4-7: 100% traffic to Graph API
GRAPH_API_ROLLOUT=100
```

### Phase 4: Monitoring & Validation (Week 4-5)

#### 4.1 Enhanced Monitoring
Add monitoring endpoints to track both services:

```javascript
// src/routes/monitoring.js - Add Graph API monitoring
app.get('/api/monitoring/instagram/graph-api', async (req, res) => {
  try {
    const status = instagramGraphApiService.getServiceStatus();
    const humanization = instagramGraphApiService.getHumanizationReport();
    
    res.json({
      status: 'healthy',
      graphApi: status,
      humanization: humanization,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});
```

#### 4.2 Success Metrics Tracking
Monitor key metrics during migration:

```javascript
// Key metrics to track:
const migrationMetrics = {
  // Success rates
  privateApiSuccessRate: 0.95, // Target: maintain >95%
  graphApiSuccessRate: 0.95,   // Target: achieve >95%
  
  // Performance
  privateApiAvgTime: 5000,     // Current baseline
  graphApiAvgTime: 4000,       // Target: improve by 20%
  
  // Humanization effectiveness
  riskScoreStability: 0.3,     // Target: maintain <0.3 average
  emergencyModeFrequency: 0.05, // Target: <5% of time
  
  // API compliance
  rateLimitHits: 0,            // Target: 0 rate limit violations
  tokenRefreshSuccess: 1.0,    // Target: 100% success rate
};
```

### Phase 5: Complete Migration (Week 5-6)

#### 5.1 Remove Legacy Service
Once Graph API service proves stable:

```bash
# Remove old service files
rm src/services/instagramService.js
rm src/services/instagramService-improved.js

# Update imports across codebase
find src/ -name "*.js" -exec sed -i 's/instagramService/instagramGraphApiService/g' {} \;
```

#### 5.2 Cleanup Configuration
Remove old configuration and update documentation:

```javascript
// Remove from humanizationConfig.js:
- Instagram Private API specific settings
- User-agent rotation (not needed for Graph API)
- Session management settings

// Keep all timing and content variation settings
```

## Integration Points & Compatibility

### 1. Queue System Integration
The new Graph API service maintains full compatibility with the existing BullMQ queue system:

```javascript
// publishWorker.js - No changes needed to job processing logic
const { success, postId, postUrl, error: instagramError } = await instagramGraphApiService.publicar({
  texto: texto,
  imagem: imagem, 
  vereadores: vereadores,
  bairro: bairro,
});
```

### 2. Admin Controller Integration
The admin controller requires no changes - same interface:

```javascript
// adminController.js - Existing code works unchanged
const result = await instagramService.publicar({
  texto: denunciaData.texto,
  imagem: denunciaData.imagem,
  vereadores: denunciaData.vereadores
});
```

### 3. Database Schema Compatibility
No database changes required - all existing fields remain compatible:

```sql
-- Existing schema works perfectly
- status: 'PUBLICADA'
- postId: Graph API Media ID
- postUrl: Instagram permalink
- publishedAt: timestamp
```

## Humanization Pattern Preservation

### Risk Assessment System
The new system enhances the existing risk assessment:

```javascript
// Enhanced risk factors for Graph API
const riskFactors = {
  // Existing factors (preserved)
  postFrequency: 0.20,      // Same sophisticated calculation
  timingPattern: 0.15,      // Same variance analysis
  contentSimilarity: 0.15,  // Same content hashing
  hashtagRepetition: 0.15,  // Same rotation tracking
  
  // New Graph API factors
  apiCallFrequency: 0.20,   // API call rate monitoring
  tokenHealth: 0.10,        // Token validation status
  dailyLimitApproach: 0.05  // Proximity to daily limits
};
```

### Content Variation Engine
All content variation sophistication is preserved and enhanced:

```javascript
// Same sophisticated template rotation
- 10 varied prefixes with cooldown tracking
- 10 connector phrases with pattern avoidance  
- 10 call-to-action variations with usage history
- Enhanced similarity detection with Levenshtein distance
- Gaussian distribution timing patterns
```

### Hashtag Rotation System
The hashtag system maintains all sophistication:

```javascript
// Same intelligent hashtag pools
- Base hashtags (2-3 selected)
- Municipal hashtags (1-2 selected) 
- Problem-specific hashtags (1-2 selected)
- Community hashtags (0-1, 25% probability)
- Category-specific hashtags
- Vereador hashtags with validation
- 45-minute cooldown periods
- Usage tracking and rotation
```

## Error Handling & Recovery

### Graph API Specific Errors
Comprehensive error handling for all Graph API scenarios:

```javascript
const graphApiErrors = {
  190: 'Access token expired or invalid → Auto-refresh token',
  100: 'Invalid parameter → Validate inputs',
  200: 'Insufficient permissions → Check app permissions', 
  368: 'Image URL not accessible → Re-upload image',
  341: 'Duplicate media detected → Vary content more',
  36000: 'Rate limit exceeded → Emergency mode activation'
};
```

### Recovery Mechanisms
Multi-layer error recovery system:

1. **Token Issues**: Automatic refresh with exponential backoff
2. **Image Issues**: Re-upload with different processing parameters  
3. **Rate Limits**: Emergency mode with extended delays
4. **Network Issues**: Retry with circuit breaker pattern
5. **Content Issues**: Enhanced variation and similarity detection

## Security Enhancements

### Token Security
- AES-256-GCM encryption for stored tokens
- PBKDF2 key derivation with 100,000 rounds
- Automatic token rotation before expiry
- Secure cleanup on service shutdown

### Image Hosting Security
- Rate limiting on image endpoints
- Secure filename generation
- Automatic cleanup of temporary files
- Access control and validation

### API Security
- Request timeout protection
- Input validation and sanitization
- Error message sanitization
- Audit logging for all API calls

## Testing Strategy

### Unit Tests
```javascript
// Test all humanization algorithms
describe('GraphApiHumanizationService', () => {
  test('maintains sophisticated timing patterns', async () => {
    const delay = service.calculateGraphApiDelay();
    expect(delay).toBeGreaterThan(30 * 60 * 1000); // 30 min minimum
    expect(delay).toBeLessThan(4 * 60 * 60 * 1000); // 4 hour maximum
  });
  
  test('content variation avoids patterns', async () => {
    const original = "Test content";
    const variation1 = service.generateGraphApiContentVariation(original);
    const variation2 = service.generateGraphApiContentVariation(original);
    expect(variation1).not.toBe(variation2);
  });
});
```

### Integration Tests
```javascript
// Test full publishing pipeline  
describe('Instagram Graph API Integration', () => {
  test('publishes with full humanization', async () => {
    const result = await service.publicar({
      texto: "Test denúncia",
      imagem: "./test-image.jpg",
      vereadores: ["vereador1"]
    });
    
    expect(result.success).toBe(true);
    expect(result.humanization.behaviorTracked).toBe(true);
    expect(result.humanization.graphApiCompliant).toBe(true);
  });
});
```

### Load Tests
```javascript
// Test rate limiting compliance
describe('Rate Limiting Compliance', () => {
  test('respects Graph API limits', async () => {
    // Simulate 25 posts in rapid succession
    const promises = Array(25).fill().map(() => service.publicar(testData));
    const results = await Promise.allSettled(promises);
    
    // Verify no rate limit violations
    const errors = results.filter(r => r.status === 'rejected');
    expect(errors.every(e => !e.reason.includes('rate limit'))).toBe(true);
  });
});
```

## Rollback Strategy

### Immediate Rollback Capability
```bash
# Emergency rollback to private API
export USE_GRAPH_API=false
export GRAPH_API_ROLLOUT=0

# Restart services
pm2 restart all
```

### Gradual Rollback
```bash
# Reduce traffic gradually if issues arise
export GRAPH_API_ROLLOUT=50
export GRAPH_API_ROLLOUT=25  
export GRAPH_API_ROLLOUT=10
export GRAPH_API_ROLLOUT=0
```

### Data Preservation
- All posts remain in database unchanged
- Queue system continues processing with old service
- No data loss during rollback process
- Monitoring continues with both services

## Success Criteria

### Technical Metrics
- ✅ **API Success Rate**: >99% for Graph API calls
- ✅ **Publishing Success Rate**: >95% (maintain current level)
- ✅ **Token Refresh Success**: 100% automated renewal
- ✅ **Rate Limit Compliance**: 0 violations
- ✅ **Response Time**: <5 seconds average (improved from current)

### Humanization Metrics  
- ✅ **Risk Score Stability**: <0.3 average (maintain current sophistication)
- ✅ **Emergency Mode**: <5% activation frequency
- ✅ **Content Variation**: >90% uniqueness score
- ✅ **Hashtag Rotation**: >80% diversity score
- ✅ **Timing Patterns**: Natural distribution maintained

### Business Metrics
- ✅ **System Uptime**: >99.5% overall availability  
- ✅ **User Experience**: No degradation in admin interface
- ✅ **Compliance**: 100% Instagram ToS compliance
- ✅ **Security**: 0 token compromise incidents

## Timeline Summary

| Phase | Duration | Key Deliverables | Success Criteria |
|-------|----------|------------------|------------------|
| **Preparation** | 2 weeks | Business account setup, API access | Account approved, tokens obtained |
| **Integration** | 1 week | Service integration, dependencies | Services initialized successfully |
| **Migration** | 1 week | Gradual rollout 10%→100% | No degradation in success rates |
| **Monitoring** | 1 week | Metrics validation, stability check | All metrics meet criteria |
| **Completion** | 1 week | Legacy cleanup, documentation | Full Graph API operation |

**Total Duration**: 6 weeks
**Critical Path**: Instagram Business Account approval + Facebook App review

## Conclusion

This migration strategy successfully bridges the sophisticated anti-detection capabilities of the current Instagram Private API system with the official compliance requirements of the Instagram Graph API. 

**Key Achievements:**
- ✅ **100% Functionality Preservation**: All humanization patterns maintained
- ✅ **Enhanced Compliance**: Official API eliminates ToS violations  
- ✅ **Improved Security**: Token encryption and automatic refresh
- ✅ **Better Reliability**: Reduced risk of API breakage
- ✅ **Government Standards**: Meets official integration requirements
- ✅ **Future-Proof**: Sustainable long-term solution

The phased approach ensures minimal disruption to the critical citizen complaint system while achieving full compliance with Instagram's official API requirements. The sophisticated humanization engine continues to provide natural, human-like behavior patterns while operating within official constraints.

**Files Created:**
1. `src/services/instagramGraphApiHumanizationService.js` - Advanced humanization for Graph API
2. `src/services/instagramTokenManager.js` - Automatic token management  
3. `src/services/imageHostingService.js` - Public URL hosting for images
4. `src/services/instagramGraphApiService.js` - Main Graph API service

**Ready for Implementation**: All core components are complete and ready for the phased migration approach outlined above.