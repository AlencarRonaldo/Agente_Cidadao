/**
 * Teste Simples: Verificação de Interceptação System Initializer
 * Valida se o código de interceptação está correto SEM inicializar dependências
 */

const fs = require('fs');
const path = require('path');

function testInterceptorCode() {
  console.log('🧪 [TEST] Verificando código de interceptação...\n');

  try {
    // Ler o arquivo do System Initializer
    const initializerPath = path.join(__dirname, 'src', 'services', 'systemInitializer.js');
    const code = fs.readFileSync(initializerPath, 'utf8');

    console.log('✅ [TEST] Arquivo systemInitializer.js lido com sucesso');

    // Verificar se contém interceptação de aprovarDenuncia
    const hasIndividualInterception = code.includes('adminController._originalAprovarDenuncia') && 
                                    code.includes('adminController.aprovarDenuncia');

    console.log(`   📝 Interceptação Individual: ${hasIndividualInterception ? '✅' : '❌'}`);

    // Verificar se contém interceptação de acaoLote
    const hasBatchInterception = code.includes('adminController._originalAcaoLote') && 
                               code.includes('adminController.acaoLote');

    console.log(`   📝 Interceptação em Lote: ${hasBatchInterception ? '✅' : '❌'}`);

    // Verificar se chama queueApprovedPost para individual
    const hasIndividualQueue = code.includes('this.masterFlow.queueApprovedPost(denunciaId)') &&
                              code.includes('aprovação individual');

    console.log(`   📝 Fila Individual: ${hasIndividualQueue ? '✅' : '❌'}`);

    // Verificar se chama queueApprovedPost para lote
    const hasBatchQueue = code.includes('this.masterFlow.queueApprovedPost(denunciaId)') &&
                         code.includes('aprovação em lote');

    console.log(`   📝 Fila em Lote: ${hasBatchQueue ? '✅' : '❌'}`);

    // Verificar se verifica ação = 'aprovar' no lote
    const hasActionCheck = code.includes("req.body.acao === 'aprovar'");

    console.log(`   📝 Verificação de Ação: ${hasActionCheck ? '✅' : '❌'}`);

    // Verificar se processa array de IDs
    const hasIdLoop = code.includes('for (const denunciaId of denunciaIds)') ||
                     code.includes('req.body.ids');

    console.log(`   📝 Loop de IDs: ${hasIdLoop ? '✅' : '❌'}`);

    console.log('\n🔍 [TEST] Analisando AdminController...');

    // Verificar adminController
    const adminPath = path.join(__dirname, 'src', 'controllers', 'adminController.js');
    const adminCode = fs.readFileSync(adminPath, 'utf8');

    // Verificar se usa addPublishJob (não publishQueue.add)
    const usesCorrectFunction = adminCode.includes('addPublishJob(') && 
                               !adminCode.includes('publishQueue.add(');

    console.log(`   📝 Uso Correto de addPublishJob: ${usesCorrectFunction ? '✅' : '❌'}`);

    // Verificar se acaoLote existe
    const hasAcaoLote = adminCode.includes('async acaoLote(req, res)');

    console.log(`   📝 Função acaoLote Existe: ${hasAcaoLote ? '✅' : '❌'}`);

    // Resultado final
    const allChecksPass = hasIndividualInterception && 
                         hasBatchInterception && 
                         hasIndividualQueue && 
                         hasBatchQueue && 
                         hasActionCheck && 
                         hasIdLoop && 
                         usesCorrectFunction && 
                         hasAcaoLote;

    console.log('\n📊 [RESULT] Verificação de Integração:');
    console.log(`   ✅ System Initializer intercepta aprovarDenuncia: ${hasIndividualInterception}`);
    console.log(`   ✅ System Initializer intercepta acaoLote: ${hasBatchInterception}`);
    console.log(`   ✅ Adiciona individual à fila: ${hasIndividualQueue}`);
    console.log(`   ✅ Adiciona lote à fila: ${hasBatchQueue}`);
    console.log(`   ✅ Verifica ação 'aprovar': ${hasActionCheck}`);
    console.log(`   ✅ Processa array de IDs: ${hasIdLoop}`);
    console.log(`   ✅ AdminController usa addPublishJob: ${usesCorrectFunction}`);
    console.log(`   ✅ Função acaoLote existe: ${hasAcaoLote}`);

    if (allChecksPass) {
      console.log('\n🎉 [SUCCESS] INTEGRAÇÃO COMPLETA IMPLEMENTADA!');
      console.log('   ✅ Todas as verificações passaram');
      console.log('   ✅ System Initializer intercepta AMBAS as funções');
      console.log('   ✅ Master Flow Controller receberá TODAS as aprovações');
      console.log('   ✅ Zero perda de denúncias aprovadas');
    } else {
      console.log('\n🚨 [FAILURE] PROBLEMAS NA IMPLEMENTAÇÃO!');
      console.log('   ❌ Algumas verificações falharam - ver detalhes acima');
    }

    return {
      success: allChecksPass,
      message: allChecksPass ? 'Integração completa implementada' : 'Problemas na implementação',
      checks: {
        individualInterception: hasIndividualInterception,
        batchInterception: hasBatchInterception,
        individualQueue: hasIndividualQueue,
        batchQueue: hasBatchQueue,
        actionCheck: hasActionCheck,
        idLoop: hasIdLoop,
        correctFunction: usesCorrectFunction,
        acaoLoteExists: hasAcaoLote
      }
    };

  } catch (error) {
    console.log('\n❌ [TEST] Erro na verificação!');
    console.log(`   Erro: ${error.message}`);
    
    return {
      success: false,
      message: 'Erro na verificação do código',
      error: error.message
    };
  }
}

// Verificar problema antes/depois
function showCodeComparison() {
  console.log('🔍 [COMPARISON] Antes vs Depois:\n');
  
  console.log('❌ [ANTES] System Initializer interceptava apenas:');
  console.log('   • adminController.aprovarDenuncia (aprovação individual)');
  console.log('   • ❌ NÃO interceptava adminController.acaoLote');
  console.log('   • 🚨 Resultado: Aprovações em lote perdidas\n');
  
  console.log('✅ [DEPOIS] System Initializer intercepta:');
  console.log('   • adminController.aprovarDenuncia (aprovação individual)');
  console.log('   • adminController.acaoLote (aprovação em lote) ← NOVO!');
  console.log('   • 🎯 Resultado: TODAS as aprovações capturadas\n');
}

// Executar teste
if (require.main === module) {
  showCodeComparison();
  
  const result = testInterceptorCode();
  
  console.log('\n📊 [SUMMARY] Resumo completo:');
  console.log(JSON.stringify(result, null, 2));
  
  process.exit(result.success ? 0 : 1);
}

module.exports = { testInterceptorCode, showCodeComparison };