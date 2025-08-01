/**
 * URGENTE: Teste final das ações após todas as correções
 */

const { chromium } = require('playwright');

async function testActionsFinal() {
  console.log('🚨 TESTE FINAL DAS AÇÕES - TODAS AS CORREÇÕES APLICADAS');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  let requestCount = 0;
  const startTime = Date.now();
  
  // Monitorar requisições (mas não interromper como antes)
  page.on('request', request => {
    if (request.url().includes('denuncias')) {
      requestCount++;
      const timeElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${timeElapsed}s] Request #${requestCount}: ${request.method()} ${request.url()}`);
    }
  });
  
  // Capturar erros de console
  const errosConsole = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errosConsole.push(msg.text());
      console.log('🚨 CONSOLE ERROR:', msg.text());
    }
  });
  
  try {
    console.log('1. ACESSANDO ADMIN PANEL...');
    await page.goto('http://localhost:3007', { waitUntil: 'networkidle' });
    
    console.log('2. FAZENDO LOGIN...');
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', 'admin@teste.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    console.log('3. AGUARDANDO ESTABILIZAÇÃO...');
    await page.waitForTimeout(5000);
    
    console.log(`   📊 Requests até agora: ${requestCount}`);
    
    if (requestCount > 20) {
      console.log('   ⚠️  Ainda há muitos requests, mas vamos continuar...');
    } else {
      console.log('   ✅ Requests estabilizados');
    }
    
    console.log('4. PROCURANDO DENÚNCIA DE TESTE...');
    
    // Aguardar tabela carregar
    await page.waitForSelector('table, .MuiTable-root', { timeout: 10000 });
    await page.screenshot({ path: 'dashboard-com-denuncia-teste.png', fullPage: true });
    
    // Procurar pela denúncia de teste
    const denunciaTestRow = await page.locator('text=DEN-TEST').first();
    const denunciaExists = await denunciaTestRow.count() > 0;
    
    console.log(`   Denúncia de teste encontrada: ${denunciaExists ? '✅' : '❌'}`);
    
    if (!denunciaExists) {
      console.log('   ❌ Denúncia de teste não encontrada na tabela');
      return;
    }
    
    console.log('5. TESTANDO BOTÕES DE AÇÃO...');
    
    // Localizar a linha da denúncia de teste
    const row = page.locator('tr:has-text("DEN-TEST")').first();
    await row.screenshot({ path: 'linha-denuncia-teste.png' });
    
    // Localizar os botões na linha
    const botoes = await row.locator('button').all();
    console.log(`   Botões encontrados na linha: ${botoes.length}`);
    
    if (botoes.length === 0) {
      console.log('   ❌ NENHUM BOTÃO ENCONTRADO NA LINHA DA DENÚNCIA');
      return;
    }
    
    // Testar cada botão
    for (let i = 0; i < Math.min(botoes.length, 4); i++) {
      const botao = botoes[i];
      
      try {
        // Verificar se botão está visível e habilitado
        const isVisible = await botao.isVisible();
        const isEnabled = await botao.isEnabled();
        const title = await botao.getAttribute('title') || '';
        
        console.log(`   Botão ${i + 1}: Visível=${isVisible}, Habilitado=${isEnabled}, Title="${title}"`);
        
        if (isVisible && isEnabled) {
          console.log(`      Testando clique no botão ${i + 1}...`);
          
          const errorsBefore = errosConsole.length;
          await botao.click();
          await page.waitForTimeout(2000);
          
          const errorsAfter = errosConsole.length;
          const newErrors = errorsAfter - errorsBefore;
          
          if (newErrors === 0) {
            console.log(`      ✅ Clique funcionou sem erros`);
            
            // Verificar se algum modal/diálogo abriu
            const dialog = page.locator('[role="dialog"], .MuiDialog-root').first();
            const dialogOpen = await dialog.count() > 0 && await dialog.isVisible();
            
            if (dialogOpen) {
              console.log(`      ✅ Diálogo aberto com sucesso`);
              await page.screenshot({ path: `dialog-botao-${i + 1}.png` });
              
              // Fechar diálogo
              const cancelBtn = dialog.locator('button:has-text("Cancelar")').first();
              if (await cancelBtn.count() > 0) {
                await cancelBtn.click();
                await page.waitForTimeout(1000);
              }
            } else {
              console.log(`      ⚠️  Clique funcionou mas nenhum diálogo abriu`);
            }
          } else {
            console.log(`      ❌ ${newErrors} erros após clique`);
          }
        }
      } catch (error) {
        console.log(`      ❌ Erro ao testar botão ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('\n6. RESUMO FINAL:');
    console.log(`   Total de requests: ${requestCount}`);
    console.log(`   Total de erros console: ${errosConsole.length}`);
    
    if (errosConsole.length === 0) {
      console.log('   🎉 SUCESSO! Nenhum erro de console detectado');
    } else {
      console.log('   ⚠️  Erros detectados:');
      errosConsole.forEach((erro, i) => {
        console.log(`      ${i + 1}. ${erro.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    await page.screenshot({ path: 'erro-teste-final.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🚨 TESTE FINAL CONCLUÍDO');
}

testActionsFinal().catch(console.error);