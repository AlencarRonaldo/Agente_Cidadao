/**
 * URGENTE: Teste rápido após correção do loop infinito
 */

const { chromium } = require('playwright');

async function testActionsFixed() {
  console.log('🚨 TESTE APÓS CORREÇÃO DO LOOP INFINITO');
  console.log('='.repeat(40));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  let requestCount = 0;
  const startTime = Date.now();
  
  // Monitorar requisições
  page.on('request', request => {
    if (request.url().includes('denuncias')) {
      requestCount++;
      const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${timeElapsed}s] Request #${requestCount}: ${request.method()} ${request.url()}`);
      
      // Se mais de 10 requisições em 30 segundos, algo está errado
      if (requestCount > 10 && (Date.now() - startTime) < 30000) {
        console.log('🚨 AINDA HÁ LOOP - Interrompendo teste');
        browser.close();
        return;
      }
    }
  });
  
  try {
    // 1. ACESSAR E LOGIN
    console.log('1. Acessando admin panel...');
    await page.goto('http://localhost:3007', { waitUntil: 'networkidle' });
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'admin@teste.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    // 2. AGUARDAR DASHBOARD SEM LOOP
    console.log('2. Aguardando estabilização...');
    await page.waitForTimeout(10000); // 10 segundos para verificar se para de fazer requests
    
    console.log(`📊 RESULTADO:`);
    console.log(`   Total de requests: ${requestCount}`);
    console.log(`   Tempo decorrido: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    
    if (requestCount <= 5) {
      console.log('   ✅ LOOP CORRIGIDO! Requests normais');
      
      // 3. AGORA TESTAR OS BOTÕES
      console.log('3. Procurando botões de ação...');
      await page.screenshot({ path: 'dashboard-estavel.png', fullPage: true });
      
      // Procurar pelos botões diretamente
      const botoes = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.map((btn, index) => ({
          index,
          text: btn.textContent.trim(),
          title: btn.title || '',
          classes: btn.className,
          disabled: btn.disabled,
          hasIcon: btn.querySelector('svg') !== null
        })).filter(btn => 
          btn.hasIcon || 
          btn.text.includes('Ver') || 
          btn.text.includes('Aprovar') || 
          btn.text.includes('Reprovar') || 
          btn.text.includes('Editar') ||
          btn.classes.includes('eye') ||
          btn.classes.includes('check') ||
          btn.classes.includes('edit')
        );
      });
      
      console.log('   📋 Botões encontrados:');
      botoes.forEach(btn => {
        console.log(`      ${btn.index}: "${btn.text}" (${btn.disabled ? 'DESABILITADO' : 'HABILITADO'})`);
      });
      
      if (botoes.length > 0) {
        console.log('   ✅ BOTÕES EXISTEM! Testando clique...');
        
        // Testar clique no primeiro botão
        try {
          await page.click(`button:nth-of-type(${botoes[0].index + 1})`);
          await page.waitForTimeout(2000);
          console.log('   ✅ Clique funcionou sem erro');
        } catch (clickError) {
          console.log(`   ❌ Erro no clique: ${clickError.message}`);
        }
      } else {
        console.log('   ❌ NENHUM BOTÃO DE AÇÃO ENCONTRADO');
      }
      
    } else {
      console.log('   ❌ AINDA HÁ LOOP - Needs mais investigação');
    }
    
  } catch (error) {
    console.error('❌ ERRO:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '='.repeat(40));
  console.log('🚨 TESTE CONCLUÍDO');
}

testActionsFixed().catch(console.error);