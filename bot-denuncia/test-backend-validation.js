/**
 * Backend API Test: Approve and Post Validation
 * Tests the backend endpoint directly with correct and incorrect payloads
 */

const axios = require('axios');

async function testBackendValidation() {
  console.log('🧪 TESTING BACKEND VALIDATION FOR /aprovar-e-postar ENDPOINT');
  console.log('=' .repeat(60));

  const baseURL = 'http://localhost:3001'; // Adjust port as needed
  const testDenunciaId = '1'; // Use an existing denuncia ID

  // Test authentication first
  let authToken;
  try {
    console.log('🔐 Step 1: Authenticating...');
    const loginResponse = await axios.post(`${baseURL}/admin/login`, {
      email: 'admin@teste.com',
      password: 'admin123'
    });
    
    if (loginResponse.data.token) {
      authToken = loginResponse.data.token;
      console.log('✅ Authentication successful');
    } else {
      throw new Error('No token received');
    }
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
    console.log('⚠️  Make sure the backend is running and admin user exists');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  // Test 1: Incorrect payload (original issue)
  console.log('\n📝 Test 1: INCORRECT PAYLOAD (Original Issue)');
  console.log('-'.repeat(50));
  
  const incorrectPayload = {
    acao: 'aprovar_e_postar',
    publicar_agora: true,
    observacoes: 'Test observations',
    usuario_id: 'admin'
  };

  try {
    const response = await axios.post(
      `${baseURL}/admin/denuncias/${testDenunciaId}/aprovar-e-postar`,
      incorrectPayload,
      { headers }
    );
    console.log('❌ UNEXPECTED: Request should have failed but succeeded');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ EXPECTED: 400 validation error received');
      console.log('📋 Error details:', error.response.data);
      
      // Verify it's the specific error we expect
      if (error.response.data.error && 
          error.response.data.error.includes('confirmar_publicacao deve ser: CONFIRMO_PUBLICACAO_IMEDIATA')) {
        console.log('✅ CONFIRMED: Correct validation error message');
      }
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 2: Correct payload (after fix)
  console.log('\n📝 Test 2: CORRECT PAYLOAD (After Fix)');
  console.log('-'.repeat(50));

  const correctPayload = {
    acao: 'aprovar_e_postar',
    confirmar_publicacao: 'CONFIRMO_PUBLICACAO_IMEDIATA',
    usuario_confirmacao: 'Test Administrator',
    motivo_urgencia: 'Emergency testing of approve and post functionality - requires immediate attention',
    observacoes: 'Additional context for testing purposes'
  };

  try {
    console.log('📤 Sending correct payload:', JSON.stringify(correctPayload, null, 2));
    
    const response = await axios.post(
      `${baseURL}/admin/denuncias/${testDenunciaId}/aprovar-e-postar`,
      correctPayload,
      { headers }
    );

    if (response.status === 200) {
      console.log('✅ SUCCESS: Request passed validation!');
      console.log('📋 Response:', response.data);
    } else {
      console.log('⚠️  Unexpected status:', response.status);
    }
  } catch (error) {
    if (error.response) {
      console.log('❌ Request failed:', error.response.status, error.response.data);
      
      // If it's still a validation error, check what's missing
      if (error.response.status === 400) {
        console.log('🔍 Validation still failing - checking requirements...');
        console.log('Current payload fields:', Object.keys(correctPayload));
      }
    } else {
      console.log('❌ Network/connection error:', error.message);
    }
  }

  // Test 3: Edge cases
  console.log('\n📝 Test 3: EDGE CASES');
  console.log('-'.repeat(50));

  const edgeCases = [
    {
      name: 'Missing confirmar_publicacao',
      payload: {
        acao: 'aprovar_e_postar',
        usuario_confirmacao: 'Test Admin',
        motivo_urgencia: 'Testing edge case validation'
      }
    },
    {
      name: 'Wrong confirmar_publicacao value',
      payload: {
        acao: 'aprovar_e_postar',
        confirmar_publicacao: 'WRONG_VALUE',
        usuario_confirmacao: 'Test Admin',
        motivo_urgencia: 'Testing edge case validation'
      }
    },
    {
      name: 'usuario_confirmacao too short',
      payload: {
        acao: 'aprovar_e_postar',
        confirmar_publicacao: 'CONFIRMO_PUBLICACAO_IMEDIATA',
        usuario_confirmacao: 'AB', // Only 2 chars
        motivo_urgencia: 'Testing edge case validation'
      }
    },
    {
      name: 'motivo_urgencia too short',
      payload: {
        acao: 'aprovar_e_postar',
        confirmar_publicacao: 'CONFIRMO_PUBLICACAO_IMEDIATA',
        usuario_confirmacao: 'Test Admin',
        motivo_urgencia: 'Short' // Only 5 chars
      }
    }
  ];

  for (const testCase of edgeCases) {
    try {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      const response = await axios.post(
        `${baseURL}/admin/denuncias/${testDenunciaId}/aprovar-e-postar`,
        testCase.payload,
        { headers }
      );
      console.log('❌ UNEXPECTED: Should have failed validation');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ EXPECTED: Validation failed as expected');
        console.log(`   Error: ${error.response.data.error}`);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
  }

  console.log('\n🎉 BACKEND VALIDATION TESTING COMPLETE!');
  console.log('=' .repeat(60));
}

// Run the test
if (require.main === module) {
  testBackendValidation().catch(console.error);
}

module.exports = { testBackendValidation };