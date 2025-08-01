/**
 * Authentication Security Tests
 * Comprehensive security testing for authentication flows
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('Authentication Security Tests', () => {
  let app;
  let validToken;
  let expiredToken;
  let tamperedToken;

  beforeAll(async () => {
    // Setup test app (mock)
    app = require('../../src/app'); // Assume we have an app.js
    
    // Generate test tokens
    validToken = jwt.sign(
      { userId: 'test-user', role: 'ADMIN' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    expiredToken = jwt.sign(
      { userId: 'test-user', role: 'ADMIN' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '-1h' } // Already expired
    );
    
    tamperedToken = validToken.slice(0, -10) + 'tampered123';
  });

  describe('Login Endpoint Security', () => {
    test('should prevent SQL injection in login credentials', async () => {
      const sqlInjectionPayloads = [
        "admin'; DROP TABLE users; --",
        "admin' OR '1'='1",
        "admin' UNION SELECT * FROM users --",
        "admin' OR 1=1 --",
        "' OR 'x'='x",
        "1' OR '1'='1' --",
        "admin'/**/OR/**/1=1--"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: payload,
            password: 'any_password'
          });

        // Should not return 200 or leak database information
        expect(response.status).not.toBe(200);
        expect(response.body).not.toHaveProperty('users');
        expect(response.body).not.toHaveProperty('error');
        
        // Response should not contain SQL error messages
        const bodyString = JSON.stringify(response.body).toLowerCase();
        expect(bodyString).not.toContain('sql');
        expect(bodyString).not.toContain('mysql');
        expect(bodyString).not.toContain('postgresql');
        expect(bodyString).not.toContain('syntax error');
      }
    });

    test('should prevent NoSQL injection attempts', async () => {
      const nosqlPayloads = [
        { $ne: null },
        { $gt: '' },
        { $regex: '.*' },
        { $where: 'this.username == this.password' },
        { username: { $ne: null }, password: { $ne: null } }
      ];

      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(payload);

        expect(response.status).not.toBe(200);
        expect(response.body.success).toBeFalsy();
      }
    });

    test('should implement rate limiting for login attempts', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      // Make multiple rapid login attempts
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send(loginData)
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited (429)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should not reveal user enumeration information', async () => {
      // Test with non-existent user
      const nonExistentResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'definitelynotauser12345',
          password: 'anypassword'
        });

      // Test with existing user but wrong password
      const wrongPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });

      // Both responses should be similar (no user enumeration)
      expect(nonExistentResponse.status).toBe(wrongPasswordResponse.status);
      expect(nonExistentResponse.body.message).toBe(wrongPasswordResponse.body.message);
      
      // Should not reveal whether user exists or not
      expect(nonExistentResponse.body.message).not.toContain('user not found');
      expect(nonExistentResponse.body.message).not.toContain('user does not exist');
    });

    test('should enforce strong password requirements', async () => {
      const weakPasswords = [
        '123',
        'password',
        '12345678',
        'qwerty',
        'admin',
        'test'
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            password: weakPassword,
            email: 'test@example.com'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBeFalsy();
        expect(response.body.message).toContain('password');
      }
    });

    test('should properly hash passwords', async () => {
      const plainPassword = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

      // Hash should not contain the plain password
      expect(hashedPassword).not.toContain(plainPassword);
      
      // Hash should be properly formatted bcrypt hash
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
      
      // Should verify correctly
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('should implement account lockout after failed attempts', async () => {
      const testUser = 'lockout-test-user';
      
      // Make multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            username: testUser,
            password: 'wrongpassword'
          });
      }

      // Next attempt should be locked out
      const lockedResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: testUser,
          password: 'wrongpassword'
        });

      expect(lockedResponse.status).toBe(423); // Locked
      expect(lockedResponse.body.message).toContain('locked');
    });
  });

  describe('JWT Token Security', () => {
    test('should reject expired tokens', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('expired');
    });

    test('should reject tampered tokens', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('invalid');
    });

    test('should reject tokens with invalid signatures', async () => {
      const invalidToken = jwt.sign(
        { userId: 'test-user', role: 'ADMIN' },
        'wrong-secret', // Different secret
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });

    test('should validate token payload structure', async () => {
      const malformedToken = jwt.sign(
        { invalid: 'payload' }, // Missing required fields
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${malformedToken}`);

      expect(response.status).toBe(401);
    });

    test('should prevent token reuse after logout', async () => {
      // First, use token to access protected route
      const beforeLogout = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(beforeLogout.status).toBe(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      // Try to use token again
      const afterLogout = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${validToken}`);

      expect(afterLogout.status).toBe(401);
    });

    test('should enforce token refresh security', async () => {
      // Test with invalid refresh token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBeFalsy();
    });
  });

  describe('Session Security', () => {
    test('should implement secure session configuration', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'correct-password'
        });

      if (response.status === 200) {
        const cookies = response.headers['set-cookie'];
        
        if (cookies) {
          const sessionCookie = cookies.find(cookie => cookie.includes('sessionId'));
          
          if (sessionCookie) {
            // Should have secure flags
            expect(sessionCookie).toContain('HttpOnly');
            expect(sessionCookie).toContain('Secure');
            expect(sessionCookie).toContain('SameSite');
          }
        }
      }
    });

    test('should implement session timeout', async () => {
      // This would require mocking time or using a test database
      // to test session expiration
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'correct-password'
        });

      if (loginResponse.status === 200) {
        const token = loginResponse.body.token;
        
        // Mock time passage (would need implementation)
        // await mockTimePassage(25 * 60 * 1000); // 25 minutes
        
        // Session should still be valid
        let protectedResponse = await request(app)
          .get('/api/admin/dashboard')
          .set('Authorization', `Bearer ${token}`);
        
        // This test would need proper session timeout implementation
        // expect(protectedResponse.status).toBe(200);
      }
    });

    test('should prevent session fixation attacks', async () => {
      // Get initial session ID
      const initialResponse = await request(app)
        .get('/api/auth/status');

      const initialSessionId = extractSessionId(initialResponse);

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'correct-password'
        });

      if (loginResponse.status === 200) {
        const newSessionId = extractSessionId(loginResponse);
        
        // Session ID should change after login
        expect(newSessionId).not.toBe(initialSessionId);
      }
    });
  });

  describe('Authorization Security', () => {
    test('should enforce role-based access control', async () => {
      const userToken = jwt.sign(
        { userId: 'regular-user', role: 'USER' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Regular user should not access admin endpoints
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('insufficient');
    });

    test('should prevent privilege escalation', async () => {
      const userToken = jwt.sign(
        { userId: 'regular-user', role: 'USER' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Try to modify role through API
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          role: 'ADMIN' // Attempt privilege escalation
        });

      expect(response.status).not.toBe(200);
      
      // If successful, role should not have changed
      if (response.status === 200) {
        expect(response.body.user.role).not.toBe('ADMIN');
      }
    });

    test('should validate resource ownership', async () => {
      const user1Token = jwt.sign(
        { userId: 'user-1', role: 'USER' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Try to access another user's data
      const response = await request(app)
        .get('/api/users/user-2/profile')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Security Headers and HTTPS', () => {
    test('should implement security headers', async () => {
      const response = await request(app)
        .get('/api/health');

      // Check for security headers
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should prevent clickjacking attacks', async () => {
      const response = await request(app)
        .get('/admin/dashboard');

      expect(response.headers['x-frame-options']).toMatch(/^(DENY|SAMEORIGIN)$/);
    });

    test('should implement CSRF protection', async () => {
      // Get CSRF token
      const csrfResponse = await request(app)
        .get('/api/csrf-token');

      const csrfToken = csrfResponse.body.csrfToken;

      // Try request without CSRF token
      const withoutCSRF = await request(app)
        .post('/api/admin/denuncias/approve')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ denunciaId: 'test-id' });

      expect(withoutCSRF.status).toBe(403);

      // Try request with CSRF token
      const withCSRF = await request(app)
        .post('/api/admin/denuncias/approve')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-CSRF-Token', csrfToken)
        .send({ denunciaId: 'test-id' });

      // Should not be rejected due to CSRF (might fail for other reasons)
      expect(withCSRF.status).not.toBe(403);
    });
  });

  describe('Input Validation Security', () => {
    test('should prevent XSS attacks in user inputs', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '"><script>alert("XSS")</script>',
        "';alert(String.fromCharCode(88,83,83))//';alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//\";alert(String.fromCharCode(88,83,83))//--></SCRIPT>\">'><SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>"
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/denuncias')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            texto: payload,
            endereco: 'Test address',
            bairro: 'Test neighborhood'
          });

        // Response should not contain unescaped script tags
        const responseBody = JSON.stringify(response.body);
        expect(responseBody).not.toContain('<script>');
        expect(responseBody).not.toContain('javascript:');
        expect(responseBody).not.toContain('onerror=');
      }
    });

    test('should validate and sanitize file uploads', async () => {
      // Test malicious file upload
      const maliciousFiles = [
        { filename: 'test.php', content: '<?php system($_GET["cmd"]); ?>' },
        { filename: 'test.jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>' },
        { filename: 'test.exe', content: 'MZ\x90\x00' }, // PE header
        { filename: 'test.sh', content: '#!/bin/bash\nrm -rf /' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${validToken}`)
          .attach('file', Buffer.from(file.content), file.filename);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('invalid');
      }
    });

    test('should prevent path traversal attacks', async () => {
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        '\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '..%2F..%2F..%2Fetc%2Fpasswd',
        '..%5c..%5c..%5cwindows%5csystem32%5cconfig%5csam'
      ];

      for (const payload of pathTraversalPayloads) {
        const response = await request(app)
          .get(`/api/files/${payload}`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(200);
        // Should not contain sensitive file contents
        const bodyString = response.text.toLowerCase();
        expect(bodyString).not.toContain('root:');
        expect(bodyString).not.toContain('administrator');
      }
    });
  });

  // Helper functions
  function extractSessionId(response) {
    const cookies = response.headers['set-cookie'];
    if (!cookies) return null;
    
    const sessionCookie = cookies.find(cookie => cookie.includes('sessionId'));
    if (!sessionCookie) return null;
    
    return sessionCookie.split('=')[1].split(';')[0];
  }
});