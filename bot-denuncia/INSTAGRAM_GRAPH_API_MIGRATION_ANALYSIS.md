# Instagram Graph API Migration Analysis

## Executive Summary

This document provides a comprehensive analysis of the current Instagram integration architecture using `instagram-private-api` and outlines the complete migration strategy to Instagram Graph API for the government citizen complaint system.

**Current Status**: System uses `instagram-private-api` v1.46.1 with sophisticated humanization engine
**Target**: Migrate to Instagram Graph API (official Facebook/Meta API)
**System Type**: Government citizen complaint bot with single institutional Instagram account

## Current System Architecture Analysis

### 1. Instagram Integration Components

#### Core Instagram Service
- **Primary File**: `src/services/instagramService.js` (880 lines)
- **Alternative**: `src/services/instagramService-improved.js` (backup implementation)
- **Dependencies**: 
  - `instagram-private-api` v1.46.1 (unofficial API)
  - `sharp` v0.34.3 (image processing)
  - Custom humanization engine

#### Instagram Humanization Engine
- **File**: `src/services/instagramHumanizationEngine.js`
- **Configuration**: `src/config/humanizationConfig.js`
- **Purpose**: Anti-detection system with human-like behavior patterns
- **Features**:
  - Natural timing patterns with Gaussian distribution
  - Content variation engine with sophisticated templates
  - Intelligent hashtag rotation system
  - Risk assessment monitoring (0.0-1.0 scale)
  - User-agent rotation and header randomization

### 2. Service Boundaries and Dependencies

#### Direct Dependencies
```
instagramService.js
├── instagram-private-api (IgApiClient, Error classes)
├── instagramHumanizationEngine.js
├── sharp (image processing)
├── fs.promises (session management)
├── crypto (content hashing)
└── logger utility
```

#### System Integration Points
1. **Queue System**: BullMQ-based publishing queue
2. **Database**: Prisma ORM with PostgreSQL
3. **Admin Controller**: Direct service calls for immediate publishing
4. **Worker System**: Background processing via `publishWorker.js`
5. **Configuration**: Environment variables + JSON config files

### 3. Authentication Flow Structure

#### Current Session Management
- **Session Storage**: Local JSON file (`instagram-session.json`)
- **Authentication**: Username/password login
- **Session Validation**: Periodic token refresh
- **Error Handling**: Checkpoint challenges, 2FA support
- **Persistence**: 24-hour session TTL with auto-renewal

#### Authentication Components
```javascript
// Current flow
login() → generateDevice() → account.login() → saveSession()
validateSession() → user.info() → refreshIfNeeded()
handleLoginError() → checkpoint/2FA handling
```

### 4. API Call Patterns and Rate Limiting

#### Current Rate Limiting Strategy
- **Base Delay**: 15-60 minutes between posts (configurable)
- **Humanization**: Gaussian distribution with ±50% variance
- **Emergency Mode**: Double delays when risk score > 0.7
- **Minimum Delay**: 5 minutes absolute minimum
- **Maximum Delay**: 60 minutes absolute maximum

#### Rate Limiting Implementation
- **File**: `src/middleware/rateLimiter.js`
- **Redis-backed**: Distributed rate limiting
- **Multiple Tiers**:
  - Dashboard: 100 requests/15min
  - Operations: 50 requests/15min
  - Batch operations: 10 requests/15min
  - External APIs: 20 requests/hour

#### Risk Assessment System
```javascript
riskScore = (
  postFrequency * 0.25 +
  timingPattern * 0.20 +
  contentSimilarity * 0.20 +
  hashtagRepetition * 0.20 +
  sessionBehavior * 0.15
)
```

### 5. Error Handling Mechanisms

#### Error Categories
1. **Authentication Errors**: IgCheckpointError, IgLoginTwoFactorRequiredError
2. **Rate Limit Errors**: Automatic backoff with exponential delay
3. **Network Errors**: Retry with circuit breaker pattern
4. **Content Errors**: Image processing failures, validation errors

#### Error Recovery Patterns
- **Checkpoint Handling**: Automatic challenge resolution
- **Session Recovery**: Auto-relogin on authentication failure
- **Queue Resilience**: Failed jobs retry with exponential backoff
- **Emergency Mode**: Automatic activation on high risk scores

### 6. Queue System Integration Points

#### Queue Architecture
- **Queue Manager**: `src/queues/queueManager.js` (unified system)
- **Publish Queue**: `publishInstagram` queue with BullMQ
- **Publish Worker**: `src/queues/publishWorker.js` (background processing)
- **Redis Backend**: Shared Redis instance with connection pooling

#### Queue Job Flow
```
AdminController.approveAndPost()
├── publishQueue.add('publishInstagram', jobData)
├── publishWorker processes job
├── instagramService.publicar()
├── Update database status
└── WebSocket notification
```

#### Job Configuration
- **Concurrency**: 3 simultaneous publications max
- **Retry Policy**: 3 attempts with exponential backoff
- **Cleanup**: Keep 50 completed, 100 failed jobs
- **Rate Limiting**: 3 jobs per minute maximum

### 7. Configuration Management

#### Environment Variables
```bash
# Instagram credentials
INSTAGRAM_USERNAME=seu_usuario_instagram
INSTAGRAM_PASSWORD=sua_senha_instagram

# System configuration
NODE_ENV=development
PORT=3350
REDIS_HOST=localhost
REDIS_PORT=6379
DATABASE_URL="postgresql://admin:secret@localhost:5432/botdenuncia"

# Rate limiting
DISABLE_RATE_LIMIT=false
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

#### Configuration Files
- **APIs**: `src/config/apis.js` (API keys and endpoints)
- **Constants**: `src/config/constants.js` (system constants)
- **Humanization**: `src/config/humanizationConfig.js` (behavior patterns)
- **WhatsApp**: `src/config/whatsappRobustConfig.js` (messaging config)

## Migration Strategy to Instagram Graph API

### Phase 1: Planning and Preparation (Week 1-2)

#### 1.1 Instagram Business Account Setup
- **Required**: Convert personal Instagram to Business Account
- **Facebook Page**: Create or link existing Facebook Page
- **App Registration**: Create Facebook App with Instagram Graph API access
- **Permissions**: Request `instagram_basic`, `instagram_content_publish` permissions

#### 1.2 Access Token Management
- **App Access Token**: For basic app operations
- **User Access Token**: For content publishing (60-day expiry)
- **Long-lived Token**: Exchange for long-lived tokens (60 days)
- **Token Refresh**: Implement automatic token refresh system

#### 1.3 API Limitations Analysis
- **Rate Limits**: 4800 API calls per hour per app
- **Publishing Limits**: 25 posts per user per day
- **Content Requirements**: Images must be publicly accessible URLs
- **Supported Formats**: JPEG, PNG (max 8MB)

### Phase 2: New Service Implementation (Week 2-4)

#### 2.1 New Instagram Graph API Service
Create `src/services/instagramGraphApiService.js`:

```javascript
class InstagramGraphApiService {
  constructor() {
    this.baseUrl = 'https://graph.instagram.com';
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    this.instagramBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    this.rateLimiter = new GraphApiRateLimiter();
  }

  async publishPost({ imageUrl, caption }) {
    // Implementation with Graph API
  }

  async refreshAccessToken() {
    // Token refresh implementation
  }
}
```

#### 2.2 Token Management Service
Create `src/services/instagramTokenManager.js`:

```javascript
class InstagramTokenManager {
  async refreshLongLivedToken() {
    // Exchange short-lived for long-lived token
  }

  async scheduleTokenRefresh() {
    // Automatic token refresh scheduling
  }

  async validateToken() {
    // Token validation and health check
  }
}
```

#### 2.3 Image Hosting Service
Create `src/services/imageHostingService.js`:

```javascript
class ImageHostingService {
  async uploadToPublicUrl(localImagePath) {
    // Upload to publicly accessible URL
    // Options: AWS S3, Cloudinary, local server with public endpoint
  }

  async cleanupTempUrls() {
    // Cleanup temporary hosted images
  }
}
```

### Phase 3: Service Adaptation (Week 4-6)

#### 3.1 Rate Limiting Adaptation
Modify rate limiting for Graph API constraints:

```javascript
// New rate limiting configuration
const GRAPH_API_LIMITS = {
  apiCallsPerHour: 4800,
  postsPerDay: 25,
  postsPerHour: 2, // Conservative limit
  minDelayBetweenPosts: 30 * 60 * 1000 // 30 minutes
};
```

#### 3.2 Humanization Engine Adaptation
Update `instagramHumanizationEngine.js`:
- Remove private API specific features
- Adapt content variation for Graph API
- Maintain hashtag rotation and timing patterns
- Update risk assessment for new API patterns

#### 3.3 Error Handling Updates
New error patterns for Graph API:
- OAuth token expiry (401 errors)
- Rate limit exceeded (429 errors)
- Content policy violations (400 errors)
- Image accessibility issues (400 errors)

### Phase 4: Queue System Updates (Week 6-7)

#### 4.1 Job Processing Updates
Modify `src/queues/publishWorker.js`:

```javascript
// Updated job processor
const publishResult = await instagramGraphApiService.publishPost({
  imageUrl: await imageHostingService.uploadToPublicUrl(imagem),
  caption: texto,
  accessToken: await tokenManager.getValidToken()
});
```

#### 4.2 Enhanced Error Recovery
- Token refresh on authentication failures
- Image re-upload on accessibility failures
- Automatic retry with exponential backoff
- Alert system for token expiry warnings

### Phase 5: Configuration and Security (Week 7-8)

#### 5.1 Environment Variables Update
```bash
# New Instagram Graph API configuration
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_business_account_id
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
INSTAGRAM_API_VERSION=v18.0

# Image hosting configuration
IMAGE_HOST_URL=https://your-domain.com/api/images
IMAGE_UPLOAD_PATH=./uploads/public
IMAGE_CLEANUP_INTERVAL=86400000
```

#### 5.2 Security Enhancements
- Store access tokens in encrypted format
- Implement token rotation policies
- Add webhook validation for Instagram updates
- Enhance audit logging for API calls

### Phase 6: Testing and Validation (Week 8-9)

#### 6.1 Comprehensive Testing Strategy
- **Unit Tests**: New service classes
- **Integration Tests**: End-to-end publishing flow
- **Load Tests**: Rate limiting and performance
- **Security Tests**: Token management and validation

#### 6.2 Parallel Testing Environment
- Run both systems in parallel
- Compare publishing success rates
- Monitor performance metrics
- Validate humanization effectiveness

### Phase 7: Migration and Cutover (Week 9-10)

#### 7.1 Gradual Migration
1. **Week 9**: 25% traffic to Graph API
2. **Mid Week 9**: 50% traffic to Graph API
3. **End Week 9**: 75% traffic to Graph API
4. **Week 10**: 100% traffic to Graph API

#### 7.2 Rollback Strategy
- Feature flag system for instant rollback
- Database schema maintains compatibility
- Queue system supports both services
- Monitoring alerts for failure rates

## Files Requiring Modification

### Critical Files (Complete Rewrite)
1. `src/services/instagramService.js` - Core service replacement
2. `src/config/apis.js` - API endpoint configuration
3. `.env.example` - Environment variables template

### Major Updates Required
4. `src/services/instagramHumanizationEngine.js` - Adapt for Graph API
5. `src/queues/publishWorker.js` - Update job processing
6. `src/controllers/adminController.js` - Service integration updates
7. `src/middleware/rateLimiter.js` - New rate limiting patterns

### New Files Required
8. `src/services/instagramGraphApiService.js` - New Graph API service
9. `src/services/instagramTokenManager.js` - Token management
10. `src/services/imageHostingService.js` - Public image hosting
11. `src/config/graphApiConfig.js` - Graph API configuration

### Minor Updates Required
12. `package.json` - Remove instagram-private-api, add axios/fetch
13. `src/config/constants.js` - Update status constants
14. `src/utils/logger.js` - Add Graph API logging patterns
15. Database migrations - Add token storage tables

## Risk Assessment and Mitigation

### High Risk Areas
1. **Token Management**: Implement robust token refresh system
2. **Image Hosting**: Ensure reliable public URL access
3. **Rate Limiting**: Strict adherence to Graph API limits
4. **Content Policy**: Compliance with Instagram community guidelines

### Mitigation Strategies
1. **Redundant Token Storage**: Multiple backup access tokens
2. **Image CDN**: Use reliable CDN for image hosting
3. **Conservative Rate Limits**: Stay well below API limits
4. **Content Validation**: Enhanced content filtering

## Success Metrics

### Technical Metrics
- **API Success Rate**: >99% for Graph API calls
- **Publishing Success Rate**: >95% for posts
- **Token Refresh Success**: 100% automated renewal
- **Image Hosting Uptime**: >99.9% availability

### Business Metrics
- **System Uptime**: >99.5% overall availability
- **User Satisfaction**: No degradation in admin experience
- **Compliance**: Full adherence to Instagram ToS
- **Security**: Zero token compromise incidents

## Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Planning | 2 weeks | Business account setup, API access |
| Implementation | 2 weeks | Core services development |
| Adaptation | 2 weeks | Existing system updates |
| Queue Updates | 1 week | Worker and job modifications |
| Security | 1 week | Token management and security |
| Testing | 1 week | Comprehensive validation |
| Migration | 1 week | Gradual cutover |

**Total Duration**: 10 weeks
**Critical Path**: Instagram Business Account approval + API access approval

## Conclusion

The migration from `instagram-private-api` to Instagram Graph API is essential for:
- **Legal Compliance**: Official API eliminates ToS violations
- **System Reliability**: Reduced risk of API breakage
- **Government Standards**: Meets official integration requirements
- **Long-term Sustainability**: Future-proof solution

The sophisticated humanization engine and queue system architecture provide a strong foundation for the migration, requiring adaptation rather than complete replacement. The phased approach ensures minimal disruption to the citizen complaint system while achieving full compliance with Instagram's official API requirements.