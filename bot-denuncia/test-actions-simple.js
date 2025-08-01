/**
 * URGENTE: Teste simples das ações - Verificação final
 */

const { chromium } = require('playwright');

async function testActionsSimple() {
  console.log('🚨 TESTE SIMPLES DAS AÇÕES - VERIFICAÇÃO FINAL');
  console.log('='.repeat(50));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  let errorsFound = [];
  
  // Capturar erros
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errorsFound.push(msg.text());
      console.log('🚨 CONSOLE ERROR:', msg.text());
    }
  });
  
  try {
    console.log('1. ACESSANDO ADMIN PANEL...');
    await page.goto('http://localhost:3007', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('2. AGUARDANDO CARREGAMENTO...');
    await page.waitForTimeout(5000);
    
    // Verificar se temos o formulário de login
    const loginForm = await page.locator('input[type="email"]').count();
    if (loginForm === 0) {
      console.log('   ⚠️  Formulário de login não encontrado. Verificando se já está logado...');
      await page.screenshot({ path: 'current-page.png', fullPage: true });
    } else {
      console.log('3. FAZENDO LOGIN...');
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.fill('input[type="email"]', 'admin@teste.com');
      await page.fill('input[type="password"]', '123456');
      await page.click('button[type="submit"]');
      
      console.log('4. AGUARDANDO DASHBOARD...');
      await page.waitForTimeout(8000);
    }
    
    console.log('5. PROCURANDO DENÚNCIA DE TESTE...');
    
    // Aguardar tabela aparecer
    await page.waitForSelector('table, .MuiTable-root', { timeout: 15000 });
    await page.screenshot({ path: 'admin-dashboard.png', fullPage: true });
    
    // Procurar denúncia de teste (DEN-TEST)
    const testRow = page.locator('tr:has-text("DEN-TEST")');
    const testRowExists = await testRow.count() > 0;
    
    console.log(`   Denúncia de teste encontrada: ${testRowExists ? '✅' : '❌'}`);
    
    if (testRowExists) {
      console.log('6. TESTANDO BOTÕES NA LINHA...');
      
      // Capturar screenshot da linha
      await testRow.first().screenshot({ path: 'test-row.png' });
      
      // Encontrar botões na linha da denúncia de teste
      const actionButtons = testRow.locator('button');
      const buttonCount = await actionButtons.count();
      
      console.log(`   Botões encontrados na linha: ${buttonCount}`);
      
      if (buttonCount > 0) {
        // Testar cada botão
        for (let i = 0; i < Math.min(buttonCount, 4); i++) {
          const button = actionButtons.nth(i);
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          
          console.log(`   Botão ${i + 1}: Visível=${isVisible}, Habilitado=${isEnabled}`);
          
          if (isVisible && isEnabled) {
            console.log(`      Testando clique...`);
            const errorsBefore = errorsFound.length;
            
            try {
              await button.click();
              await page.waitForTimeout(2000);
              
              // Verificar se um dialog abriu
              const dialog = page.locator('[role="dialog"], .MuiDialog-root');
              const dialogVisible = await dialog.count() > 0 && await dialog.first().isVisible();
              
              if (dialogVisible) {
                console.log(`      ✅ Dialog aberto com sucesso`);
                await page.screenshot({ path: `dialog-button-${i + 1}.png` });
                
                // Fechar dialog
                const cancelBtn = dialog.locator('button:has-text("Cancelar")');
                if (await cancelBtn.count() > 0) {
                  await cancelBtn.first().click();
                  await page.waitForTimeout(1000);
                }
              } else {
                console.log(`      ⚠️  Clique funcionou mas nenhum dialog abriu`);
              }
              
              const errorsAfter = errorsFound.length;
              if (errorsAfter === errorsBefore) {
                console.log(`      ✅ Sem erros JS`);
              } else {
                console.log(`      ❌ ${errorsAfter - errorsBefore} novos erros JS`);
              }
              
            } catch (clickError) {
              console.log(`      ❌ Erro no clique: ${clickError.message}`);
            }
          }
        }
      } else {
        console.log('   ❌ NENHUM BOTÃO ENCONTRADO NA LINHA');
      }
    } else {
      console.log('   ❌ DENÚNCIA DE TESTE NÃO ENCONTRADA NA TABELA');
      
      // Listar todas as linhas para debug
      const allRows = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tr'));
        return rows.map(row => row.textContent.trim()).slice(1, 6); // Skip header, get first 5
      });
      
      console.log('   📋 Primeiras 5 linhas encontradas:');
      allRows.forEach((row, i) => {
        console.log(`      ${i + 1}. ${row.substring(0, 100)}...`);
      });
    }
    
    console.log('\\n7. RESUMO FINAL:');
    console.log(`   Total de erros JS: ${errorsFound.length}`);
    
    if (errorsFound.length === 0) {
      console.log('   🎉 SUCESSO! Nenhum erro detectado');
    } else {
      console.log('   ⚠️  Erros encontrados:');
      errorsFound.forEach((erro, i) => {
        console.log(`      ${i + 1}. ${erro.substring(0, 80)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  console.log('\\n' + '='.repeat(50));
  console.log('🚨 TESTE SIMPLES CONCLUÍDO');
}

testActionsSimple().catch(console.error);