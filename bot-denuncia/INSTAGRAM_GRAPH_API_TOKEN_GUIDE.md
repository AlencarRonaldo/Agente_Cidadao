# Instagram Graph API Token Management Guide

## 📋 Overview

This guide provides step-by-step instructions for obtaining and managing Instagram Graph API tokens following Meta's official 2025 guidelines. The Instagram Basic Display API was deprecated on December 4, 2024, so we now use the Instagram Graph API exclusively.

## 🔧 Current System Configuration

### Environment Variables (Already Configured)
```env
# Instagram Graph API Configuration
INSTAGRAM_APP_ID=1326356306161550
INSTAGRAM_APP_SECRET=e9a232cd8e07c6223f1b793a401cf5fb
INSTAGRAM_BUSINESS_ACCOUNT_ID=4086465214956942
INSTAGRAM_REDIRECT_URI=https://localhost:3001/admin/instagram/oauth/callback
GRAPH_API_VERSION=v21.0

# System Configuration
INSTAGRAM_PRIMARY_API=GRAPH
INSTAGRAM_FALLBACK_ENABLED=true
INSTAGRAM_GRAPH_MOCK_MODE=false
```

### Current Token Status
- ❌ **Access Token**: EXPIRED - Needs renewal
- ✅ **App Configuration**: Valid and configured
- ✅ **Business Account**: Linked and accessible

## 📚 Prerequisites

### 1. Instagram Business Account Requirements
- Instagram Business or Creator account
- Account must be linked to a Facebook Page
- Facebook Business Manager access

### 2. Facebook App Configuration
- Facebook App ID: `1326356306161550`
- App configured with Instagram Graph API product
- Required permissions/scopes:
  - `instagram_basic`
  - `instagram_content_publish`
  - `pages_show_list`
  - `pages_read_engagement`

## 🚀 Token Renewal Process

### Method 1: Manual Token Generation (Recommended)

#### Step 1: Access Facebook Developer Console
1. Visit [Facebook Developers](https://developers.facebook.com/)
2. Navigate to App ID `1326356306161550`
3. Go to "Tools & Support" → "Graph API Explorer"

#### Step 2: Generate User Access Token
1. Select your App from dropdown
2. Choose "Instagram Graph API" as API
3. Add required permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
4. Click "Generate Access Token"
5. Complete Instagram login and permission grant

#### Step 3: Convert to Long-Lived Token
```bash
# Exchange short-lived token for long-lived token
curl -X GET "https://graph.facebook.com/v21.0/oauth/access_token" \
  -d "grant_type=fb_exchange_token" \
  -d "client_id=1326356306161550" \
  -d "client_secret=e9a232cd8e07c6223f1b793a401cf5fb" \
  -d "fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

#### Step 4: Get Instagram Business Account ID
```bash
# Get connected Instagram accounts
curl -X GET "https://graph.facebook.com/v21.0/me/accounts" \
  -d "access_token=YOUR_LONG_LIVED_TOKEN"

# Get Instagram Business Account from Page
curl -X GET "https://graph.facebook.com/v21.0/PAGE_ID" \
  -d "fields=instagram_business_account" \
  -d "access_token=YOUR_LONG_LIVED_TOKEN"
```

### Method 2: System User Token (Production Recommended)

#### Step 1: Create System User
1. Go to Facebook Business Manager
2. Navigate to "Business Settings" → "Users" → "System Users"
3. Create new System User with Admin role
4. Assign your Facebook App to the System User

#### Step 2: Generate System User Token
1. Select the System User
2. Click "Generate New Token"
3. Select your App and required permissions
4. Copy the generated token (permanent, no expiration)

## 🔄 Token Refresh Process

### Automatic Refresh (System Handles)
Long-lived tokens can be refreshed programmatically:

```bash
# Refresh long-lived token (60 days validity)
curl -X GET "https://graph.instagram.com/refresh_access_token" \
  -d "grant_type=ig_refresh_token" \
  -d "access_token=YOUR_CURRENT_TOKEN"
```

### Manual Refresh via Admin Panel
1. Access admin panel: `http://localhost:3007`
2. Go to Instagram Configuration
3. Click "Refresh Token" button
4. Follow OAuth flow if needed

## 🛠️ Implementation Steps

### Step 1: Update Token in Environment
```env
# Replace EXPIRED_TOKEN_NEEDS_RENEWAL with your new token
INSTAGRAM_ACCESS_TOKEN=YOUR_NEW_LONG_LIVED_TOKEN
INSTAGRAM_GRAPH_ACCESS_TOKEN=YOUR_NEW_LONG_LIVED_TOKEN
```

### Step 2: Restart System
```bash
# Restart all services to load new token
npm run dev
# or
node src/index.js
```

### Step 3: Verify Connection
```bash
# Test the new configuration
node test-env-loading.js
```

## ✅ Verification Checklist

### Environment Configuration
- [ ] `INSTAGRAM_APP_ID` is set and numeric
- [ ] `INSTAGRAM_APP_SECRET` is set (keep secret!)
- [ ] `INSTAGRAM_BUSINESS_ACCOUNT_ID` matches your Instagram Business Account
- [ ] `INSTAGRAM_REDIRECT_URI` uses HTTPS (or HTTP for development)
- [ ] `GRAPH_API_VERSION` is set to `v21.0` or latest

### Token Validation
- [ ] Token is long-lived (60-day expiration)
- [ ] Token has required scopes/permissions
- [ ] Token is associated with correct Instagram Business Account
- [ ] Connection test passes successfully

### System Configuration
- [ ] `INSTAGRAM_PRIMARY_API=GRAPH` (Graph API as primary)
- [ ] `INSTAGRAM_FALLBACK_ENABLED=true` (Private API as fallback)
- [ ] Database table `instagram_tokens` exists
- [ ] System health checks pass

## 🚨 Troubleshooting

### Common Issues

#### Issue: "No active token found"
**Solution**: Token expired or not properly configured
```bash
# Check current token status
node -e "
const tokenManager = require('./src/services/instagramTokenManager');
tokenManager.getCurrentToken().then(console.log).catch(console.error);
"
```

#### Issue: "Invalid permissions"
**Solution**: Regenerate token with correct scopes
- Ensure all required permissions are granted during OAuth
- Check Facebook App has Instagram Graph API product enabled

#### Issue: "Business account not found"
**Solution**: Verify Instagram Business Account linking
- Ensure Instagram account is Business/Creator type
- Check Facebook Page connection
- Verify Business Account ID in environment variables

### Debug Commands

```bash
# Test Graph API connectivity
node -e "
const service = require('./src/services/instagramGraphApiService');
service.testConnection().then(console.log).catch(console.error);
"

# Check API Manager status
node -e "
const manager = require('./src/services/instagramApiManager');
manager.getApiStatus().then(console.log).catch(console.error);
"

# Test token health
node -e "
const service = require('./src/services/instagramGraphApiService');
service.getHealthStatus().then(console.log).catch(console.error);
"
```

## 📊 Token Management Best Practices

### Security
- Never commit tokens to version control
- Use environment variables or secure key management
- Rotate tokens regularly (every 30-45 days)
- Monitor token usage and expiration

### Automation
- Set up automatic token refresh (24 hours before expiry)
- Implement monitoring alerts for token health
- Log all token operations for audit trail
- Use system user tokens for production stability

### Performance
- Cache token validation results
- Implement rate limiting according to Meta guidelines
- Use batch operations when possible
- Monitor API usage quotas

## 🔗 Additional Resources

- [Instagram Graph API Documentation](https://developers.facebook.com/docs/instagram-platform/)
- [Meta Token Management Guide](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/)
- [Instagram Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Business Manager System Users](https://business.facebook.com/settings/system-users/)

## 📞 Support

If you encounter issues:
1. Check this documentation
2. Review system logs in `logs/app.log`
3. Run debug commands above
4. Verify Meta Developer Console for app status
5. Check Instagram account business status

---

**Last Updated**: August 1, 2025  
**Graph API Version**: v21.0  
**System Status**: ✅ Configured, ❌ Token Needs Renewal