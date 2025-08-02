/**
 * Debug script to test the aprovar-e-postar endpoint
 * This will help us identify exactly where the issue is occurring
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3355/api';
const TEST_DENUNCIA_ID = 'cmdt4x12e00032w52lzl8jgtp'; // Valid denúncia ID from database

// Test payload that matches what the frontend is sending
const testPayload = {
  "acao": "aprovar_e_postar",
  "confirmar_publicacao": "CONFIRMO_PUBLICACAO_IMEDIATA",
  "usuario_confirmacao": "admin",
  "motivo_urgencia": "necessario engajar urgente para resolver problema de seguranca publica",
  "observacoes": "teste de debug"
};

async function testApprovalEndpoint() {
  console.log('🧪 Testing aprovar-e-postar endpoint');
  console.log('🎯 Target URL:', `${BASE_URL}/admin/denuncias/${TEST_DENUNCIA_ID}/aprovar-e-postar`);
  console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));
  
  try {
    // First, try to get a token (you'll need to update this with real credentials)
    console.log('\n1️⃣ Getting authentication token...');
    
    const loginResponse = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@teste.com', // Try this credential from the test files
        senha: 'Admin123!' // The API expects 'senha' not 'password'
      })
    });
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Login failed:', errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Token obtained:', token ? '✓' : '✗');
    
    // Now test the approval endpoint
    console.log('\n2️⃣ Testing aprovar-e-postar endpoint...');
    
    const approvalResponse = await fetch(`${BASE_URL}/admin/denuncias/${TEST_DENUNCIA_ID}/aprovar-e-postar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('📊 Response status:', approvalResponse.status);
    console.log('📊 Response statusText:', approvalResponse.statusText);
    console.log('📊 Response ok:', approvalResponse.ok);
    
    // Try to get response body
    const responseText = await approvalResponse.text();
    console.log('📄 Response body:', responseText);
    
    if (approvalResponse.ok) {
      console.log('✅ Endpoint working correctly!');
      const responseData = JSON.parse(responseText);
      console.log('📊 Parsed response:', JSON.stringify(responseData, null, 2));
    } else {
      console.log('❌ Endpoint returned error');
      console.log('🔍 Error details:', responseText);
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error('📍 Error stack:', error.stack);
  }
}

async function main() {
  console.log('🚀 Starting endpoint debug test');
  console.log('⏰ Timestamp:', new Date().toISOString());
  
  await testApprovalEndpoint();
  
  console.log('\n✅ Debug test completed');
}

// Run the test
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});