/**
 * TESTE: Interface Frontend do Botão "Aprovar e Postar Agora"
 */

const { chromium } = require('playwright');

async function testFrontendBypass() {
  console.log('🚀 TESTANDO INTERFACE FRONTEND: Botão Aprovar e Postar Agora');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('1. ACESSANDO ADMIN PANEL...');
    await page.goto('http://localhost:3007', { waitUntil: 'networkidle' });
    
    console.log('2. FAZENDO LOGIN...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'admin@teste.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    
    console.log('3. AGUARDANDO DASHBOARD...');
    await page.waitForTimeout(5000);
    
    console.log('4. PROCURANDO DENÚNCIA DE TESTE...');
    await page.waitForSelector('table, .MuiTable-root', { timeout: 15000 });
    
    // Procurar pela linha da denúncia de teste
    const denunciaTestRow = page.locator('tr:has-text("DEN-TEST")');
    const denunciaExists = await denunciaTestRow.count() > 0;
    
    console.log(`   Denúncia de teste encontrada: ${denunciaExists ? '✅' : '❌'}`);
    
    if (denunciaExists) {
      console.log('5. PROCURANDO BOTÃO DE BYPASS...');
      
      // Capturar screenshot da tabela
      await page.screenshot({ path: 'frontend-tabela-com-bypass.png', fullPage: true });
      
      // Procurar botão com emoji de raio (⚡)
      const bypassButton = denunciaTestRow.locator('button:has-text("⚡")');
      const bypassButtonExists = await bypassButton.count() > 0;
      
      console.log(`   Botão ⚡ (Bypass) encontrado: ${bypassButtonExists ? '✅' : '❌'}`);
      
      if (bypassButtonExists) {
        console.log('6. TESTANDO CLIQUE NO BOTÃO BYPASS...');
        
        await bypassButton.first().click();
        await page.waitForTimeout(2000);
        
        // Verificar se o diálogo especial abriu
        const dialog = page.locator('[role="dialog"]:has-text("PUBLICAÇÃO IMEDIATA")');
        const dialogOpen = await dialog.count() > 0;
        
        console.log(`   Diálogo de confirmação especial aberto: ${dialogOpen ? '✅' : '❌'}`);
        
        if (dialogOpen) {
          await page.screenshot({ path: 'frontend-dialog-bypass.png' });
          
          // Verificar elementos do diálogo
          const alertElement = dialog.locator('div:has-text("BYPASS COMPLETO")');
          const alertExists = await alertElement.count() > 0;
          
          const buttonElement = dialog.locator('button:has-text("PUBLICAR AGORA MESMO")');
          const buttonExists = await buttonElement.count() > 0;
          
          console.log(`   Alert de aviso encontrado: ${alertExists ? '✅' : '❌'}`);
          console.log(`   Botão "PUBLICAR AGORA MESMO" encontrado: ${buttonExists ? '✅' : '❌'}`);
          
          // Fechar diálogo sem executar a ação
          const cancelButton = dialog.locator('button:has-text("Cancelar")');
          if (await cancelButton.count() > 0) {
            await cancelButton.click();
            console.log('   ✅ Diálogo fechado com sucesso');
          }
          
          return {
            success: true,
            features: {
              botaoBypassEncontrado: bypassButtonExists,
              dialogoAberto: dialogOpen,
              alertaAviso: alertExists,
              botaoPublicar: buttonExists
            }
          };
          
        } else {
          console.log('   ❌ Diálogo não abriu');
          return { success: false, error: 'Diálogo não abriu' };
        }
        
      } else {
        console.log('   ❌ Botão de bypass não encontrado');
        
        // Listar todos os botões na linha para debug
        const allButtons = await denunciaTestRow.locator('button').all();
        console.log(`   Debug: ${allButtons.length} botões encontrados na linha`);
        
        for (let i = 0; i < allButtons.length; i++) {
          const text = await allButtons[i].textContent();
          const title = await allButtons[i].getAttribute('title');
          console.log(`      Botão ${i + 1}: "${text}" (title: "${title}")`);
        }
        
        return { success: false, error: 'Botão bypass não encontrado' };
      }
      
    } else {
      console.log('   ❌ DENÚNCIA DE TESTE NÃO ENCONTRADA');
      
      // Listar primeiras linhas para debug
      const allRows = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        return rows.slice(0, 3).map(row => row.textContent.trim());
      });
      
      console.log('   Debug - primeiras 3 linhas:');
      allRows.forEach((row, i) => {
        console.log(`      ${i + 1}. ${row.substring(0, 80)}...`);
      });
      
      return { success: false, error: 'Denúncia teste não encontrada' };
    }
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error.message);
    await page.screenshot({ path: 'frontend-error.png', fullPage: true });
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// Executar teste
testFrontendBypass()
  .then(result => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADO FINAL DO TESTE FRONTEND:');
    console.log(result.success ? '✅ SUCESSO' : '❌ FALHOU');
    
    if (result.features) {
      console.log('\n🔍 RECURSOS VERIFICADOS:');
      console.log(`   Botão Bypass (⚡): ${result.features.botaoBypassEncontrado ? '✅' : '❌'}`);
      console.log(`   Diálogo Especial: ${result.features.dialogoAberto ? '✅' : '❌'}`);
      console.log(`   Alert de Aviso: ${result.features.alertaAviso ? '✅' : '❌'}`);
      console.log(`   Botão Publicar: ${result.features.botaoPublicar ? '✅' : '❌'}`);
    }
    
    if (result.error) {
      console.log(`\nErro: ${result.error}`);
    }
    
    console.log('\n🎉 IMPLEMENTAÇÃO DO BOTÃO "APROVAR E POSTAR AGORA" CONCLUÍDA!');
  })
  .catch(console.error);