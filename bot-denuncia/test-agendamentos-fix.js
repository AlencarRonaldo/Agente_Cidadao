/**
 * URGENTE: Teste da correção dos agendamentos
 * Verificar se os agendamentos estão aparecendo no dashboard após correções
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function testAgendamentosFix() {
  console.log('🚨 TESTANDO CORREÇÃO DOS AGENDAMENTOS');
  console.log('='.repeat(50));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // 1. ACESSAR ADMIN PANEL
    console.log('1. ACESSANDO ADMIN PANEL...');
    await page.goto('http://localhost:3007', { waitUntil: 'networkidle' });
    
    // 2. FAZER LOGIN
    console.log('2. FAZENDO LOGIN...');
    
    // Aguardar formulário de login aparecer
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    
    // Preencher credenciais
    await page.fill('input[type="email"], input[name="email"]', 'admin@teste.com');
    await page.fill('input[type="password"], input[name="senha"], input[name="password"]', '123456');
    
    // Capturar tela antes do login
    await page.screenshot({ path: 'debug-login-form.png', fullPage: true });
    console.log('   📸 Screenshot salvo: debug-login-form.png');
    
    // Clicar no botão de login
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
    
    // Aguardar redirecionamento para dashboard
    await page.waitForTimeout(3000);
    
    // 3. VERIFICAR SE CHEGOU NO DASHBOARD
    console.log('3. VERIFICANDO DASHBOARD...');
    
    const currentUrl = page.url();
    console.log(`   URL atual: ${currentUrl}`);
    
    // Capturar tela do dashboard
    await page.screenshot({ path: 'debug-dashboard-state.png', fullPage: true });
    console.log('   📸 Screenshot salvo: debug-dashboard-state.png');
    
    // 4. PROCURAR COMPONENTE DE AGENDAMENTOS
    console.log('4. PROCURANDO COMPONENTE DE AGENDAMENTOS...');
    
    // Aguardar um pouco para componentes carregarem
    await page.waitForTimeout(2000);
    
    // Procurar por textos relacionados a agendamento
    const agendamentoTexts = [
      'Agenda de Postagens',
      'postagem agendada',
      'Próxima Publicação',
      'DEN-MDRN6Y0A-9ULDV', // Protocolo da denúncia agendada
      'VILA SÃO PEDRO' // Bairro da denúncia agendada
    ];
    
    console.log('   Procurando por textos de agendamento...');
    const foundTexts = [];
    
    for (const text of agendamentoTexts) {
      try {
        const element = await page.locator(`text=${text}`).first();
        const isVisible = await element.isVisible({ timeout: 1000 });
        if (isVisible) {
          foundTexts.push(text);
          console.log(`   ✅ ENCONTRADO: "${text}"`);
        } else {
          console.log(`   ❌ NÃO VISÍVEL: "${text}"`);
        }
      } catch (error) {
        console.log(`   ❌ NÃO ENCONTRADO: "${text}"`);
      }
    }
    
    // 5. CAPTURAR CONTEÚDO DA PÁGINA
    console.log('5. ANALISANDO CONTEÚDO DA PÁGINA...');
    
    const pageContent = await page.content();
    fs.writeFileSync('debug-page-content.html', pageContent);
    console.log('   📄 HTML salvo: debug-page-content.html');
    
    const textContent = await page.locator('body').textContent();
    fs.writeFileSync('debug-text-content.txt', textContent);
    console.log('   📄 Texto salvo: debug-text-content.txt');
    
    // 6. VERIFICAR SE DADOS CHEGARAM NO FRONTEND
    const hasAgendaCard = textContent.includes('Agenda de Postagens');
    const hasScheduledData = textContent.includes('DEN-MDRN6Y0A-9ULDV');
    const hasBairroData = textContent.includes('VILA SÃO PEDRO');
    
    console.log('\n📊 RESULTADO DO TESTE:');
    console.log(`   Card de Agenda presente: ${hasAgendaCard ? '✅' : '❌'}`);
    console.log(`   Dados de protocolo: ${hasScheduledData ? '✅' : '❌'}`);
    console.log(`   Dados de bairro: ${hasBairroData ? '✅' : '❌'}`);
    console.log(`   Textos encontrados: ${foundTexts.length}/${agendamentoTexts.length}`);
    
    // 7. ANÁLISE CONSOLE
    console.log('\n7. VERIFICANDO CONSOLE ERRORS...');
    
    // Capturar erros do console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`   🚨 CONSOLE ERROR: ${msg.text()}`);
      }
    });
    
    // Aguardar mais um pouco para ver se há erros
    await page.waitForTimeout(2000);
    
    // 8. DIAGNÓSTICO FINAL
    console.log('\n🔧 DIAGNÓSTICO FINAL:');
    
    if (hasAgendaCard && hasScheduledData && hasBairroData) {
      console.log('   🎉 SUCESSO! Agendamentos estão aparecendo corretamente');
      console.log('   ✅ Correção foi bem-sucedida');
    } else if (hasAgendaCard && !hasScheduledData) {
      console.log('   ⚠️  Card existe mas dados não aparecem');
      console.log('   💡 Pode ser problema de formatação ou filtragem');
    } else if (!hasAgendaCard) {
      console.log('   ❌ Card de agendamento não está renderizando');
      console.log('   💡 Problema na estrutura do componente ou dados não chegam');
    }
    
    // Captura final
    await page.screenshot({ path: 'debug-final-state.png', fullPage: true });
    console.log('   📸 Screenshot final: debug-final-state.png');
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    
    // Capturar tela de erro
    await page.screenshot({ path: 'debug-error-state.png', fullPage: true });
    console.log('   📸 Screenshot de erro: debug-error-state.png');
    
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🚨 TESTE CONCLUÍDO');
}

testAgendamentosFix().catch(console.error);