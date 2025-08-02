#!/usr/bin/env node

/**
 * Instagram Graph API Token Fix Utility
 * Automated token refresh and validation script
 */

require('dotenv').config();
const axios = require('axios');
const logger = require('./src/utils/logger');

class InstagramTokenFixer {
    constructor() {
        this.appId = process.env.INSTAGRAM_APP_ID;
        this.appSecret = process.env.INSTAGRAM_APP_SECRET;
        this.currentToken = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
        this.businessId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    }

    async analyzeCurrentToken() {
        console.log('🔍 ANALYZING CURRENT GRAPH API TOKEN...\n');

        if (!this.currentToken) {
            console.log('❌ No token found in environment variables');
            return { valid: false, reason: 'no_token' };
        }

        try {
            // Check token validity
            const introspection = await this.introspectToken(this.currentToken);
            console.log('📋 Token Analysis:');
            console.log(`   Valid: ${introspection.is_valid ? '✅' : '❌'}`);
            console.log(`   App ID: ${introspection.app_id}`);
            console.log(`   User ID: ${introspection.user_id}`);
            
            if (introspection.expires_at) {
                const expiryDate = new Date(introspection.expires_at * 1000);
                const now = new Date();
                const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                
                console.log(`   Expires: ${expiryDate.toISOString()}`);
                console.log(`   Days until expiry: ${daysUntilExpiry}`);
                
                if (daysUntilExpiry <= 0) {
                    console.log('   Status: ❌ TOKEN EXPIRED');
                    return { valid: false, reason: 'expired', data: introspection };
                } else if (daysUntilExpiry <= 7) {
                    console.log('   Status: ⚠️ TOKEN EXPIRING SOON');
                    return { valid: true, reason: 'expiring_soon', data: introspection };
                }
            }

            // Test actual API usage
            const testResult = await this.testApiAccess();
            if (!testResult.success) {
                console.log(`   API Test: ❌ ${testResult.error}`);
                return { valid: false, reason: 'api_failed', data: introspection };
            }

            console.log('   Status: ✅ TOKEN HEALTHY');
            return { valid: true, reason: 'healthy', data: introspection };

        } catch (error) {
            console.log(`❌ Token analysis failed: ${error.message}`);
            return { valid: false, reason: 'analysis_failed', error: error.message };
        }
    }

    async introspectToken(token) {
        const url = `https://graph.facebook.com/debug_token`;
        const response = await axios.get(url, {
            params: {
                input_token: token,
                access_token: `${this.appId}|${this.appSecret}`
            }
        });
        return response.data.data;
    }

    async testApiAccess() {
        try {
            const url = `https://graph.instagram.com/v21.0/${this.businessId}`;
            const response = await axios.get(url, {
                params: {
                    fields: 'id,username,name',
                    access_token: this.currentToken
                }
            });
            return { success: true, data: response.data };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.error?.message || error.message 
            };
        }
    }

    async generateOAuthUrl() {
        console.log('\n🔗 GENERATING OAUTH URL FOR TOKEN REFRESH...\n');

        const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3001/admin/instagram/oauth/callback';
        const state = Buffer.from(Date.now().toString()).toString('base64');
        
        const scopes = [
            'instagram_basic',
            'instagram_content_publish',
            'instagram_manage_insights',
            'pages_show_list',
            'pages_read_engagement',
            'business_management'
        ].join(',');

        const authUrl = `https://www.instagram.com/oauth/authorize?` +
            `client_id=${this.appId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${scopes}&` +
            `response_type=code&` +
            `state=${state}`;

        console.log('📱 Authorization URL:');
        console.log(`   ${authUrl}\n`);
        
        console.log('📋 Instructions:');
        console.log('   1. Copy the URL above');
        console.log('   2. Open it in your browser');
        console.log('   3. Log in to your Instagram Business account');
        console.log('   4. Grant all requested permissions');
        console.log('   5. Copy the authorization code from the callback URL');
        console.log('   6. Run this script with the code: node fix-instagram-tokens.js --code YOUR_CODE\n');

        return { authUrl, state };
    }

    async exchangeCodeForToken(authorizationCode) {
        console.log('\n🔄 EXCHANGING AUTHORIZATION CODE FOR TOKEN...\n');

        try {
            const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3001/admin/instagram/oauth/callback';

            // Step 1: Exchange code for short-lived token
            console.log('📝 Step 1: Getting short-lived token...');
            const shortTokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', {
                client_id: this.appId,
                client_secret: this.appSecret,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code: authorizationCode
            });

            const { access_token: shortToken, user_id } = shortTokenResponse.data;
            console.log(`   Short-lived token: ${shortToken.substring(0, 20)}...`);
            console.log(`   User ID: ${user_id}`);

            // Step 2: Exchange for long-lived token
            console.log('\n📝 Step 2: Getting long-lived token...');
            const longTokenResponse = await axios.get('https://graph.instagram.com/access_token', {
                params: {
                    grant_type: 'ig_exchange_token',
                    client_secret: this.appSecret,
                    access_token: shortToken
                }
            });

            const { access_token: longToken, expires_in } = longTokenResponse.data;
            const expiryDate = new Date(Date.now() + expires_in * 1000);

            console.log(`   Long-lived token: ${longToken.substring(0, 20)}...`);
            console.log(`   Expires in: ${expires_in} seconds (${Math.round(expires_in / 86400)} days)`);
            console.log(`   Expiry date: ${expiryDate.toISOString()}`);

            // Step 3: Verify token works
            console.log('\n📝 Step 3: Verifying new token...');
            const verifyResponse = await axios.get(`https://graph.instagram.com/v21.0/${user_id}`, {
                params: {
                    fields: 'id,username,account_type',
                    access_token: longToken
                }
            });

            console.log(`   Verified account: ${verifyResponse.data.username}`);
            console.log(`   Account type: ${verifyResponse.data.account_type}`);

            // Step 4: Generate environment variable update
            console.log('\n✅ TOKEN REFRESH SUCCESSFUL!\n');
            console.log('📋 UPDATE YOUR .ENV FILE:');
            console.log('=' .repeat(60));
            console.log(`INSTAGRAM_GRAPH_ACCESS_TOKEN=${longToken}`);
            console.log(`INSTAGRAM_BUSINESS_ACCOUNT_ID=${user_id}`);
            console.log('=' .repeat(60));

            console.log('\n📝 Additional Information:');
            console.log(`   Token expires: ${expiryDate.toLocaleDateString()}`);
            console.log(`   Set reminder to refresh before: ${new Date(expiryDate.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`);

            return {
                success: true,
                longToken,
                userId: user_id,
                expiresAt: expiryDate,
                accountInfo: verifyResponse.data
            };

        } catch (error) {
            console.log(`❌ Token exchange failed: ${error.message}`);
            if (error.response?.data) {
                console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
            }
            return { success: false, error: error.message };
        }
    }

    async refreshExistingToken() {
        console.log('\n🔄 ATTEMPTING TO REFRESH EXISTING TOKEN...\n');

        if (!this.currentToken) {
            console.log('❌ No existing token to refresh');
            return { success: false, reason: 'no_token' };
        }

        try {
            // Try to refresh the current token
            const refreshResponse = await axios.get('https://graph.instagram.com/refresh_access_token', {
                params: {
                    grant_type: 'ig_refresh_token',
                    access_token: this.currentToken
                }
            });

            const { access_token: newToken, expires_in } = refreshResponse.data;
            const expiryDate = new Date(Date.now() + expires_in * 1000);

            console.log('✅ TOKEN REFRESH SUCCESSFUL!');
            console.log(`   New token: ${newToken.substring(0, 20)}...`);
            console.log(`   Expires: ${expiryDate.toISOString()}`);

            console.log('\n📋 UPDATE YOUR .ENV FILE:');
            console.log('=' .repeat(60));
            console.log(`INSTAGRAM_GRAPH_ACCESS_TOKEN=${newToken}`);
            console.log('=' .repeat(60));

            return {
                success: true,
                newToken,
                expiresAt: expiryDate
            };

        } catch (error) {
            console.log(`❌ Token refresh failed: ${error.message}`);
            console.log('   This token cannot be refreshed automatically');
            console.log('   You need to complete the OAuth flow to get a new token');
            return { success: false, error: error.message };
        }
    }

    async performHealthCheck() {
        console.log('\n🏥 PERFORMING COMPLETE HEALTH CHECK...\n');

        // Check configuration
        console.log('📋 Configuration Check:');
        console.log(`   App ID: ${this.appId || '❌ MISSING'}`);
        console.log(`   App Secret: ${this.appSecret ? '✅ Present' : '❌ MISSING'}`);
        console.log(`   Current Token: ${this.currentToken ? '✅ Present' : '❌ MISSING'}`);
        console.log(`   Business ID: ${this.businessId || '❌ MISSING'}`);

        if (!this.appId || !this.appSecret) {
            console.log('\n❌ Missing required configuration. Check your .env file.');
            return false;
        }

        // Analyze current token
        const tokenAnalysis = await this.analyzeCurrentToken();
        
        if (tokenAnalysis.valid) {
            console.log('\n✅ Graph API is healthy and ready for use!');
            return true;
        } else {
            console.log('\n⚠️ Graph API needs attention:');
            console.log(`   Issue: ${tokenAnalysis.reason}`);
            
            if (tokenAnalysis.reason === 'expired' || tokenAnalysis.reason === 'expiring_soon') {
                console.log('\n🔄 Attempting automatic token refresh...');
                const refreshResult = await this.refreshExistingToken();
                
                if (refreshResult.success) {
                    return true;
                } else {
                    console.log('\n🔗 Automatic refresh failed. Manual OAuth required.');
                    await this.generateOAuthUrl();
                    return false;
                }
            } else {
                console.log('\n🔗 Manual OAuth flow required.');
                await this.generateOAuthUrl();
                return false;
            }
        }
    }

    async runFixer() {
        console.log('🔧 INSTAGRAM GRAPH API TOKEN FIXER\n');
        console.log('=' .repeat(50));

        // Check if user provided authorization code
        const args = process.argv.slice(2);
        const codeIndex = args.indexOf('--code');
        
        if (codeIndex !== -1 && args[codeIndex + 1]) {
            const authCode = args[codeIndex + 1];
            console.log(`🔐 Using provided authorization code: ${authCode.substring(0, 10)}...`);
            return await this.exchangeCodeForToken(authCode);
        }

        // Otherwise run health check
        return await this.performHealthCheck();
    }
}

// Run if called directly
if (require.main === module) {
    const fixer = new InstagramTokenFixer();
    fixer.runFixer()
        .then(result => {
            if (result === true || (result && result.success)) {
                console.log('\n🎉 Instagram Graph API is ready for production!');
                process.exit(0);
            } else {
                console.log('\n⚠️ Manual intervention required for Graph API setup.');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('❌ Fatal error:', error.message);
            process.exit(1);
        });
}

module.exports = InstagramTokenFixer;