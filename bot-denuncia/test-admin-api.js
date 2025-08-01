/**
 * Test Admin API Endpoints
 * 
 * This script tests the admin API endpoints to ensure they're working correctly
 * and returning the expected data for the frontend.
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3355';
const ADMIN_CREDENTIALS = {
  email: 'admin@teste.com',
  senha: '123456'
};

async function testAdminAPI() {
  console.log('🧪 Testing Admin API Endpoints...\n');
  
  try {
    // Step 1: Test login and get token
    console.log('1️⃣ Testing admin login...');
    const loginResponse = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ADMIN_CREDENTIALS)
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('   Token length:', loginData.token ? loginData.token.length : 0);
    console.log('   User:', loginData.user ? loginData.user.email : 'N/A');
    
    const token = loginData.token;
    if (!token) {
      throw new Error('No token received from login');
    }
    
    // Step 2: Test denuncias endpoint
    console.log('\n2️⃣ Testing denuncias endpoint...');
    const denunciasResponse = await fetch(`${BASE_URL}/api/admin/denuncias?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   Response status:', denunciasResponse.status);
    
    if (!denunciasResponse.ok) {
      const errorText = await denunciasResponse.text();
      console.error('❌ Denuncias request failed:', errorText);
      throw new Error(`Denuncias request failed: ${denunciasResponse.status}`);
    }
    
    const denunciasData = await denunciasResponse.json();
    console.log('✅ Denuncias endpoint working');
    console.log('   Data structure:', Object.keys(denunciasData));
    console.log('   Denuncias count:', denunciasData.data ? denunciasData.data.length : 0);
    console.log('   Total count:', denunciasData.pagination ? denunciasData.pagination.total : 'N/A');
    
    if (denunciasData.data && denunciasData.data.length > 0) {
      const firstDenuncia = denunciasData.data[0];
      console.log('   First denuncia:');
      console.log('     ID:', firstDenuncia.id);
      console.log('     Protocolo:', firstDenuncia.protocolo);
      console.log('     Status:', firstDenuncia.status);
      console.log('     Bairro:', firstDenuncia.bairro);
      console.log('     Has texto:', !!firstDenuncia.texto);
      console.log('     Created:', firstDenuncia.createdAt);
    }
    
    // Step 3: Test with different parameters
    console.log('\n3️⃣ Testing with different parameters...');
    
    // Test with status filter
    const statusFilterResponse = await fetch(`${BASE_URL}/api/admin/denuncias?page=1&limit=10&status=RECEBIDA`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (statusFilterResponse.ok) {
      const statusData = await statusFilterResponse.json();
      console.log('✅ Status filter working - RECEBIDA count:', statusData.data ? statusData.data.length : 0);
    }
    
    // Test dashboard endpoint
    console.log('\n4️⃣ Testing dashboard endpoint...');
    const dashboardResponse = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('✅ Dashboard endpoint working');
      console.log('   Dashboard keys:', Object.keys(dashboardData));
    }
    
    console.log('\n✅ All API tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ API test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAdminAPI();
}

module.exports = { testAdminAPI };