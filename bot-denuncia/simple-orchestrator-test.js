/**
 * Teste simples do Instagram Token Validation Orchestrator
 */
const InstagramTokenValidationOrchestrator = require('./src/services/instagramTokenValidationOrchestrator');

async function testOrchestrator() {
    console.log('🧪 Testando Instagram Token Validation Orchestrator...');
    
    try {
        // Criar instância do orchestrator
        const orchestrator = new InstagramTokenValidationOrchestrator();
        console.log('✅ Orchestrator criado com sucesso');
        
        // Testar validação
        console.log('🔄 Iniciando validação...');
        const result = await orchestrator.startValidation();
        
        // Verificar resultados
        console.log('📊 Resultados do teste:');
        console.log('- Status:', result.status);
        console.log('- Health Score:', result.healthScore);
        console.log('- Completed Steps:', result.completedSteps, '/', result.totalSteps);
        console.log('- Recommendations:', result.recommendations.length);
        
        // Validar estrutura do resultado
        const validations = [
            { test: 'status deve ser string', value: typeof result.status === 'string' },
            { test: 'healthScore deve ser número', value: typeof result.healthScore === 'number' },
            { test: 'completedSteps deve ser número', value: typeof result.completedSteps === 'number' },
            { test: 'totalSteps deve ser 12', value: result.totalSteps === 12 },
            { test: 'recommendations deve ser array', value: Array.isArray(result.recommendations) },
            { test: 'details deve existir', value: result.details && typeof result.details === 'object' }
        ];
        
        console.log('\n🔍 Validações:');
        let passedTests = 0;
        validations.forEach(validation => {
            const status = validation.value ? '✅' : '❌';
            console.log(`${status} ${validation.test}`);
            if (validation.value) passedTests++;
        });
        
        const testScore = Math.round((passedTests / validations.length) * 100);
        console.log(`\n📈 Score do teste: ${testScore}% (${passedTests}/${validations.length})`);
        
        // Parar orchestrator
        orchestrator.stop();
        console.log('🛑 Orchestrator parado');
        
        if (testScore >= 80) {
            console.log('\n🎉 TESTE PASSOU! Orchestrator funcional para produção');
            return true;
        } else {
            console.log('\n⚠️ TESTE PARCIAL! Algumas validações falharam');
            return false;
        }
        
    } catch (error) {
        console.error('❌ TESTE FALHOU!', error.message);
        return false;
    }
}

// Executar teste
testOrchestrator()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('💥 Erro fatal:', error);
        process.exit(1);
    });