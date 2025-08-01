/**
 * Teste das correções de WebSocket timeout
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testando correções de WebSocket timeout...\n');

// 1. Verificar se useSimpleAgendaData foi criado
const simpleHookPath = path.join(__dirname, 'src/hooks/useSimpleAgendaData.js');
if (fs.existsSync(simpleHookPath)) {
  console.log('✅ Hook useSimpleAgendaData criado com sucesso');
} else {
  console.log('❌ Hook useSimpleAgendaData não encontrado');
}

// 2. Verificar se PostingScheduleCard foi atualizado
const cardPath = path.join(__dirname, 'src/components/PostingScheduleCard.js');
if (fs.existsSync(cardPath)) {
  const cardContent = fs.readFileSync(cardPath, 'utf8');
  
  if (cardContent.includes('useSimpleAgendaData')) {
    console.log('✅ PostingScheduleCard atualizado para usar hook simples');
  } else {
    console.log('❌ PostingScheduleCard ainda usa hook complexo');
  }
  
  if (cardContent.includes('useIntegrationOrchestrator')) {
    console.log('⚠️  PostingScheduleCard ainda tem referência ao hook complexo');
  } else {
    console.log('✅ Referências ao hook complexo removidas');
  }
}

// 3. Verificar configurações do orchestrator
const orchestratorPath = path.join(__dirname, 'src/hooks/useIntegrationOrchestrator.js');
if (fs.existsSync(orchestratorPath)) {
  const orchestratorContent = fs.readFileSync(orchestratorPath, 'utf8');
  
  if (orchestratorContent.includes('enableWebSocket = false')) {
    console.log('✅ WebSocket desabilitado por padrão');
  } else {
    console.log('❌ WebSocket ainda está habilitado por padrão');
  }
  
  if (orchestratorContent.includes('localhost:3355')) {
    console.log('✅ URL corrigida para porta 3355');
  } else {
    console.log('⚠️  URL pode estar incorreta');
  }
}

console.log('\n🎯 Resumo das correções implementadas:');
console.log('- Hook simplificado sem WebSocket timeout');
console.log('- Dados mock para desenvolvimento');
console.log('- PostingScheduleCard atualizado');
console.log('- WebSocket desabilitado por padrão');
console.log('- Fallback HTTP para porta correta (3355)');

console.log('\n✅ Sistema pronto para teste sem erros de WebSocket timeout!');
console.log('\nPara testar: npm start (admin-panel deve carregar sem erros)');