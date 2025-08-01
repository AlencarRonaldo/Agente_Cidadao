const { test, expect } = require('@playwright/test');

test.describe('Botão Aprovar e Postar - Teste Específico', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewportSize({ width: 1366, height: 768 });
    
    // Navegar para o admin panel
    await page.goto('http://localhost:3007', { waitUntil: 'networkidle' });
    
    // Aguardar carregamento
    await page.waitForTimeout(2000);
  });

  test('Verificar se botão Aprovar e Postar aparece', async () => {
    console.log('🔍 Iniciando teste do botão Aprovar e Postar');
    
    // Fazer login
    console.log('📝 Fazendo login...');
    await page.fill('input[placeholder*="Email"], input[name="email"], input[type="email"]', 'admin@teste.com');
    await page.fill('input[placeholder*="Senha"], input[name="password"], input[type="password"]', '123456');
    await page.click('button:has-text("ACESSAR SISTEMA")');
    
    // Aguardar redirecionamento
    await page.waitForTimeout(3000);
    
    // Verificar se chegou no dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    console.log('✅ Login realizado com sucesso');
    
    // Aguardar carregamento das denúncias
    await page.waitForTimeout(5000);
    
    // Capturar screenshot inicial
    await page.screenshot({ 
      path: 'debug-dashboard-loaded.png',
      fullPage: true 
    });
    
    // Verificar se existem denúncias na tabela
    const tableRows = await page.locator('tbody tr').count();
    console.log(`📊 Encontradas ${tableRows} linhas na tabela`);
    
    if (tableRows === 0) {
      console.log('⚠️ Nenhuma denúncia encontrada na tabela');
      return;
    }
    
    // Procurar por denúncias com status que permite moderação
    const moderatableStatuses = ['PENDENTE_MODERACAO', 'RECEBIDA', 'PROCESSANDO'];
    let foundModeratable = false;
    
    for (let i = 0; i < tableRows; i++) {
      const row = page.locator('tbody tr').nth(i);
      const statusElement = row.locator('td').nth(1); // Coluna de status
      
      try {
        const statusText = await statusElement.textContent();
        console.log(`📋 Linha ${i + 1}: Status = "${statusText}"`);
        
        if (moderatableStatuses.some(status => statusText.includes(status))) {
          foundModeratable = true;
          console.log(`✅ Encontrada denúncia moderável na linha ${i + 1}`);
          
          // Procurar pelos botões de ação nesta linha
          const actionsCell = row.locator('td').last(); // Última coluna (ações)
          
          // Aguardar os botões carregarem
          await page.waitForTimeout(2000);
          
          // Capturar screenshot da linha específica
          await row.screenshot({ path: `debug-row-${i}.png` });
          
          // Verificar botões específicos
          console.log('🔍 Verificando botões de ação...');
          
          // 1. Botão Visualizar (sempre presente)
          const viewButton = actionsCell.locator('button[title*="Visualizar"], [aria-label*="Visualizar"]');
          const viewCount = await viewButton.count();
          console.log(`👁️ Botões "Visualizar": ${viewCount}`);
          
          // 2. Botão Aprovar (para status moderáveis)
          const approveButton = actionsCell.locator('button[title*="Aprovar denúncia"], [aria-label*="Aprovar"]');
          const approveCount = await approveButton.count();
          console.log(`✅ Botões "Aprovar": ${approveCount}`);
          
          // 3. BOTÃO APROVAR E POSTAR (o que estamos testando)
          const approveAndPostButton = actionsCell.locator(`
            button[title*="Aprovar e Postar"],
            button[title*="Bypass"],
            button:has-text("⚡"),
            [aria-label*="Aprovar e Postar"]
          `);
          const approveAndPostCount = await approveAndPostButton.count();
          console.log(`⚡ Botões "Aprovar e Postar": ${approveAndPostCount}`);
          
          // 4. Botão Rejeitar
          const rejectButton = actionsCell.locator('button[title*="Rejeitar"], [aria-label*="Rejeitar"]');
          const rejectCount = await rejectButton.count();
          console.log(`❌ Botões "Rejeitar": ${rejectCount}`);
          
          // 5. Botão Editar
          const editButton = actionsCell.locator('button[title*="Editar"], [aria-label*="Editar"]');
          const editCount = await editButton.count();
          console.log(`✏️ Botões "Editar": ${editCount}`);
          
          // Verificar se o botão Aprovar e Postar existe
          if (approveAndPostCount > 0) {
            console.log('🎉 SUCESSO: Botão "Aprovar e Postar" encontrado!');
            
            // Verificar se está visível
            await expect(approveAndPostButton.first()).toBeVisible();
            console.log('✅ Botão está visível');
            
            // Verificar se está habilitado
            await expect(approveAndPostButton.first()).toBeEnabled();
            console.log('✅ Botão está habilitado');
            
            // Verificar propriedades visuais
            const buttonElement = approveAndPostButton.first();
            const styles = await buttonElement.evaluate(el => {
              const computed = window.getComputedStyle(el);
              return {
                background: computed.background,
                color: computed.color,
                display: computed.display
              };
            });
            console.log('🎨 Estilos do botão:', styles);
            
          } else {
            console.log('❌ PROBLEMA: Botão "Aprovar e Postar" NÃO encontrado!');
            
            // Capturar HTML da célula de ações para debug
            const actionsHTML = await actionsCell.innerHTML();
            console.log('🔍 HTML da célula de ações:', actionsHTML);
            
            // Listar todos os botões encontrados
            const allButtons = await actionsCell.locator('button').all();
            console.log(`🔍 Total de botões encontrados: ${allButtons.length}`);
            
            for (let j = 0; j < allButtons.length; j++) {
              const buttonText = await allButtons[j].textContent();
              const buttonTitle = await allButtons[j].getAttribute('title');
              console.log(`  Botão ${j + 1}: texto="${buttonText}", title="${buttonTitle}"`);
            }
          }
          
          // Capturar screenshot final desta linha
          await actionsCell.screenshot({ path: `debug-actions-cell-${i}.png` });
          
          break; // Testar apenas a primeira denúncia moderável
        }
      } catch (error) {
        console.log(`⚠️ Erro ao verificar linha ${i + 1}:`, error.message);
      }
    }
    
    if (!foundModeratable) {
      console.log('⚠️ Nenhuma denúncia com status moderável encontrada');
      console.log('💡 Criar uma denúncia de teste com status PENDENTE_MODERACAO');
    }
    
    // Screenshot final
    await page.screenshot({ 
      path: 'debug-final-state.png',
      fullPage: true 
    });
  });

  test('Testar clique no botão Aprovar e Postar', async () => {
    console.log('🔍 Testando funcionalidade do botão Aprovar e Postar');
    
    // Login
    await page.fill('input[placeholder*="Email"], input[name="email"], input[type="email"]', 'admin@teste.com');
    await page.fill('input[placeholder*="Senha"], input[name="password"], input[type="password"]', '123456');
    await page.click('button:has-text("ACESSAR SISTEMA")');
    await page.waitForTimeout(3000);
    
    // Aguardar denúncias carregarem
    await page.waitForTimeout(5000);
    
    // Procurar botão Aprovar e Postar
    const approveAndPostButton = page.locator(`
      button[title*="Aprovar e Postar"],
      button:has-text("⚡")
    `).first();
    
    const buttonExists = await approveAndPostButton.count() > 0;
    
    if (buttonExists) {
      console.log('✅ Botão encontrado, testando clique...');
      
      // Clicar no botão
      await approveAndPostButton.click();
      
      // Aguardar modal abrir
      await page.waitForTimeout(2000);
      
      // Verificar se modal de confirmação abriu
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Verificar se contém o texto específico do modal
      const modalText = await modal.textContent();
      expect(modalText).toContain('ATENÇÃO: PUBLICAÇÃO IMEDIATA');
      expect(modalText).toContain('BYPASS COMPLETO');
      
      console.log('✅ Modal abriu corretamente com aviso de publicação imediata');
      
      // Capturar screenshot do modal
      await page.screenshot({ path: 'debug-approve-post-modal.png' });
      
      // Fechar modal
      await page.click('button:has-text("Cancelar")');
      
    } else {
      console.log('❌ Botão Aprovar e Postar não encontrado para teste de clique');
    }
  });

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });
});