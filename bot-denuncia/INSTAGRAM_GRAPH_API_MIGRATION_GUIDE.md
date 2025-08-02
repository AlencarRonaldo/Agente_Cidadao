# Instagram Graph API Migration Guide

Complete implementation guide for migrating from instagram-private-api to Instagram Graph API for the government citizen complaint system.

## Overview

This migration provides a complete transition from the unofficial instagram-private-api to the official Instagram Graph API, offering:

- **Government-grade security** with OAuth 2.0 and encrypted token storage
- **Reliable service** with official API support and rate limiting
- **Phased migration** with safe rollback capabilities
- **Image hosting** with public URLs required by Graph API
- **Comprehensive monitoring** and audit logging

## Architecture Components

### 1. Configuration System
- **File**: `src/config/graphApiConfig.js`
- **Purpose**: Centralized configuration with environment validation
- **Features**: Rate limiting, security settings, compliance options

### 2. Token Management
- **File**: `src/services/instagramTokenManager.js`
- **Purpose**: Secure token storage with automatic refresh
- **Features**: AES-256-GCM encryption, Redis caching, audit logging

### 3. Image Hosting Service
- **File**: `src/services/imageHostingService.js`
- **Purpose**: Serve images with public URLs for Graph API
- **Features**: Image processing, security validation, automatic cleanup

### 4. Graph API Service
- **File**: `src/services/instagramGraphApiService.js`
- **Purpose**: Main service for Instagram content publishing
- **Features**: Rate limiting, error handling, audit logging

### 5. Migration Manager
- **File**: `src/services/instagramMigrationManager.js`
- **Purpose**: Orchestrate phased migration with rollback capabilities
- **Features**: Testing phase, gradual rollout, health monitoring

### 6. Queue Worker
- **File**: `src/queues/publishWorkerGraphApi.js`
- **Purpose**: Background publishing with Graph API integration
- **Features**: Enhanced error handling, retry logic, monitoring

### 7. Admin Interface
- **File**: `src/routes/admin/instagram.js`
- **Purpose**: Administrative controls for migration and monitoring
- **Features**: OAuth management, health checks, migration controls

## Environment Variables

Add these environment variables to your system:

```bash
# Instagram Graph API Configuration
INSTAGRAM_APP_ID=your_facebook_app_id
INSTAGRAM_APP_SECRET=your_facebook_app_secret
INSTAGRAM_REDIRECT_URI=https://your-domain.com/admin/instagram/oauth/callback
GRAPH_API_VERSION=v21.0

# Security
INSTAGRAM_TOKEN_ENCRYPTION_KEY=64_character_hex_key
INSTAGRAM_WEBHOOK_SECRET=your_webhook_secret
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=your_verify_token

# Image Hosting
PUBLIC_BASE_URL=https://your-domain.com
CDN_BASE_URL=https://cdn.your-domain.com  # Optional

# Development/Testing
INSTAGRAM_DEBUG=false
INSTAGRAM_MOCK_MODE=false  # Set to true for testing
```

## Database Migrations

Run the included Prisma migrations:

```bash
# Apply token storage migration
npx prisma migrate deploy

# The migrations include:
# - instagram_tokens table for secure token storage
# - instagram_images table for hosted images
```

## Installation Steps

### Step 1: Facebook App Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing app
3. Add Instagram Basic Display product
4. Configure OAuth redirect URIs
5. Get App ID and App Secret

### Step 2: Environment Configuration

1. Copy environment variables above
2. Generate secure encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Set production URLs for PUBLIC_BASE_URL

### Step 3: Initialize Services

```javascript
// In your main app initialization
const imageHostingService = require('./src/services/imageHostingService');
const migrationManager = require('./src/services/instagramMigrationManager');

// Add image serving middleware
app.use('/instagram-media', imageHostingService.createImageServingMiddleware());

// Add admin routes
app.use('/admin/instagram', require('./src/routes/admin/instagram'));
```

### Step 4: Queue Configuration

Update your queue startup to include the new worker:

```javascript
// In src/startWorkers.js or similar
const publishWorkerGraphApi = require('./queues/publishWorkerGraphApi');

// Both workers can run simultaneously during migration
```

## Migration Process

### Phase 1: Testing Setup

1. **Initialize OAuth**:
   ```bash
   curl -X GET "http://localhost:3000/admin/instagram/oauth/init"
   ```

2. **Complete OAuth flow** using the returned authorization URL

3. **Verify token health**:
   ```bash
   curl -X GET "http://localhost:3000/admin/instagram/token/health"
   ```

4. **Test connection**:
   ```bash
   curl -X POST "http://localhost:3000/admin/instagram/test-connection"
   ```

### Phase 2: Start Testing

```bash
curl -X POST "http://localhost:3000/admin/instagram/migration/start-testing"
```

This enables Graph API for designated test users while maintaining private API for others.

### Phase 3: Gradual Rollout

```bash
curl -X POST "http://localhost:3000/admin/instagram/migration/start-rollout"
```

Automatically rolls out Graph API to 10%, 25%, 50%, 75%, then 100% of users over time.

### Phase 4: Complete Migration

```bash
curl -X POST "http://localhost:3000/admin/instagram/migration/complete"
```

Switches all traffic to Graph API exclusively.

### Emergency Rollback

```bash
curl -X POST "http://localhost:3000/admin/instagram/emergency/stop" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Emergency rollback reason"}'
```

## Monitoring and Health Checks

### Service Health
```bash
curl -X GET "http://localhost:3000/admin/instagram/health"
```

### Migration Status
```bash
curl -X GET "http://localhost:3000/admin/instagram/migration/status"
```

### Token Status
```bash
curl -X GET "http://localhost:3000/admin/instagram/token/health"
```

### Image Hosting Stats
```bash
curl -X GET "http://localhost:3000/admin/instagram/images/stats"
```

### Audit Statistics
```bash
curl -X GET "http://localhost:3000/admin/instagram/audit/stats"
```

## Security Features

### Token Security
- **AES-256-GCM encryption** for token storage
- **Automatic token refresh** before expiration
- **Secure key generation** and rotation support
- **Audit logging** for all token operations

### Image Security
- **File validation** with Sharp image processing
- **UUID-based filenames** to prevent enumeration
- **Rate limiting** on image serving endpoints
- **Automatic cleanup** of expired images

### API Security
- **Rate limiting** according to Instagram limits
- **Request auditing** for government compliance
- **CSRF protection** with state parameters
- **Error handling** without information disclosure

## Rate Limiting

Instagram Graph API has specific limits:

- **Posts per day**: 25
- **Posts per hour**: 5
- **API calls per hour**: 200 (per user)
- **Minimum interval between posts**: 12 minutes

The system automatically enforces these limits and provides graceful handling.

## Error Handling

### Automatic Retries
- **Rate limit errors**: Exponential backoff with retry
- **Network errors**: 3 automatic retries
- **Token expiry**: Automatic refresh and retry

### Fallback Strategies
- **Graph API failure**: Option to fall back to private API during migration
- **Image hosting failure**: Detailed error reporting
- **Token issues**: Clear instructions for re-authentication

## Testing

### Mock Mode
Set `INSTAGRAM_MOCK_MODE=true` for testing without actual API calls:

```javascript
// Returns mock responses for testing
const result = await instagramGraphApiService.publicar({
  texto: "Test post",
  imagem: "/path/to/image.jpg",
  vereadores: ["@vereador1"],
  bairro: "Centro"
});
```

### Test Users
Add test users during testing phase:

```bash
curl -X POST "http://localhost:3000/admin/instagram/migration/test-users/add" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-id"}'
```

## Troubleshooting

### Common Issues

1. **OAuth failures**:
   - Check redirect URI configuration
   - Verify app permissions in Facebook Developer Console
   - Ensure HTTPS in production

2. **Token refresh failures**:
   - Check token encryption key
   - Verify database connectivity
   - Check token expiration dates

3. **Image hosting issues**:
   - Verify public URL accessibility
   - Check image processing permissions
   - Ensure sufficient disk space

4. **Rate limiting**:
   - Monitor daily/hourly limits
   - Implement proper delays between posts
   - Use migration manager for gradual rollout

### Logs and Debugging

Enable debug logging:
```bash
INSTAGRAM_DEBUG=true
```

Check audit logs:
```bash
# Redis logs
redis-cli LRANGE audit:instagram 0 99

# Application logs
tail -f logs/app.log | grep INSTAGRAM
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Facebook app approved for production
- [ ] Public URLs accessible
- [ ] SSL certificates valid
- [ ] Monitoring systems ready

### Deployment Strategy

1. **Deploy new code** with migration in private_api phase
2. **Verify all systems** working with existing functionality
3. **Configure OAuth** and obtain initial token
4. **Start testing phase** with limited users
5. **Monitor metrics** and health checks
6. **Begin gradual rollout** when testing successful
7. **Complete migration** when rollout successful

### Rollback Plan

The system includes automatic rollback triggers:
- **Error rate > 5%**: Automatic rollback to private API
- **Success rate < 95%**: Rollback after investigation
- **Manual emergency stop**: Immediate rollback capability

## Compliance and Audit

### Government Requirements
- **Full audit logging** of all operations
- **Encrypted data storage** with key rotation
- **Request tracing** with unique IDs
- **Performance monitoring** with SLAs
- **Security compliance** with government standards

### Data Retention
- **Token history**: 90 days
- **API logs**: 1 year
- **Error logs**: 2 years
- **Image hosting**: 7 days (configurable)

## Support and Maintenance

### Regular Maintenance
- **Token refresh**: Automatic every 30 days
- **Image cleanup**: Hourly automatic cleanup
- **Log rotation**: Daily rotation with compression
- **Health checks**: 5-minute intervals

### Monitoring Alerts
- **Token expiry warnings**: 7 days before expiration
- **API error rate**: > 5% error rate
- **Service unavailability**: Health check failures
- **Migration issues**: Rollout failures or rollbacks

## Conclusion

This Instagram Graph API migration provides a robust, secure, and compliant solution for government systems. The phased approach ensures minimal disruption while the comprehensive monitoring and rollback capabilities provide safety and reliability.

For questions or issues, refer to the troubleshooting section or check the audit logs for detailed operation history.