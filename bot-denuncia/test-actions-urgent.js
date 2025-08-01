/**
 * URGENTE: Teste das 4 Ações do Gerenciamento de Denúncias
 * Verificar: Verificar, Aprovar, Reprovar, Editar
 */

const { chromium } = require('playwright');
const fs = require('fs');

async function testActionsUrgent() {
  console.log('🚨 TESTE URGENTE DAS AÇÕES DE GERENCIAMENTO');
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const errosConsole = [];
  const requisicoesRede = [];
  
  // Monitorar erros de console
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errosConsole.push(msg.text());
      console.log('🚨 CONSOLE ERROR:', msg.text());
    }
  });
  
  // Monitorar requisições de rede
  page.on('response', response => {
    if (response.url().includes('denunc') || response.url().includes('admin')) {
      requisicoesRede.push({
        url: response.url(),
        status: response.status(),
        type: 'response'
      });
      console.log(`📡 API Response: ${response.url()} - Status: ${response.status()}`);
    }
  });
  
  page.on('request', request => {
    if (request.url().includes('denunc') || request.url().includes('admin')) {
      requisicoesRede.push({
        url: request.url(),
        method: request.method(),
        type: 'request'
      });
      console.log(`📤 API Request: ${request.method()} ${request.url()}`);
    }
  });
  
  try {
    // 1. ACESSAR ADMIN PANEL
    console.log('1. ACESSANDO ADMIN PANEL...');
    await page.goto('http://localhost:3007', { waitUntil: 'networkidle' });
    
    // 2. FAZER LOGIN
    console.log('2. FAZENDO LOGIN...');
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
    await page.fill('input[type="email"], input[name="email"]', 'admin@teste.com');
    await page.fill('input[type="password"], input[name="senha"], input[name="password"]', '123456');
    await page.click('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
    await page.waitForTimeout(3000);
    
    // 3. AGUARDAR DASHBOARD CARREGAR
    console.log('3. AGUARDANDO DASHBOARD...');
    await page.waitForTimeout(2000);
    
    // Capturar estado inicial
    await page.screenshot({ path: 'acoes-estado-inicial.png', fullPage: true });
    console.log('   📸 Screenshot inicial: acoes-estado-inicial.png');
    
    // 4. LOCALIZAR TABELA DE DENÚNCIAS
    console.log('4. LOCALIZANDO TABELA DE DENÚNCIAS...');
    
    // Procurar por diferentes seletores da tabela
    const tabelaSelectors = [
      'table',
      '.MuiTable-root',
      '[role="table"]',
      '.denuncias-table',
      '.table-container',
      '.data-table'
    ];
    
    let tabela = null;
    for (const selector of tabelaSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0 && await element.isVisible()) {
          tabela = element;
          console.log(`   ✅ Tabela encontrada com seletor: ${selector}`);
          break;
        }
      } catch (e) {
        // Continuar procurando
      }
    }
    
    if (!tabela) {
      console.log('   ❌ TABELA NÃO ENCONTRADA!');
      const pageContent = await page.content();
      fs.writeFileSync('debug-sem-tabela.html', pageContent);
      console.log('   📄 HTML salvo: debug-sem-tabela.html');
      return;
    }
    
    // 5. PROCURAR BOTÕES DE AÇÃO
    console.log('5. PROCURANDO BOTÕES DE AÇÃO...');
    
    // Diferentes possibilidades de seletores para os botões
    const botoesSelectors = {
      verificar: [
        'button[title*="erificar"], button[title*="isualizar"], button[title*="Ver"]',
        '.btn-view, .btn-verificar, .btn-visualizar',
        'button:has-text("Ver"), button:has-text("Visualizar")',
        '[data-action="view"], [data-action="verificar"]',
        'button svg[data-testid="VisibilityIcon"], button .eye-icon',
        'button:has([class*="eye"]), button:has([class*="visibility"])'
      ],
      aprovar: [
        'button[title*="provar"], button[title*="Aprovar"]',
        '.btn-approve, .btn-aprovar, .btn-accept',
        'button:has-text("Aprovar"), button:has-text("Approve")',
        '[data-action="approve"], [data-action="aprovar"]',
        'button svg[data-testid="CheckIcon"], button .check-icon',
        'button:has([class*="check"]), button:has([class*="approve"])'
      ],
      reprovar: [
        'button[title*="eprovar"], button[title*="Rejeitar"]',
        '.btn-reject, .btn-reprovar, .btn-deny',
        'button:has-text("Reprovar"), button:has-text("Rejeitar")',
        '[data-action="reject"], [data-action="reprovar"]',
        'button svg[data-testid="CloseIcon"], button .close-icon',
        'button:has([class*="close"]), button:has([class*="reject"])'
      ],
      editar: [
        'button[title*="ditar"], button[title*="Edit"]',
        '.btn-edit, .btn-editar, .btn-modify',
        'button:has-text("Editar"), button:has-text("Edit")',
        '[data-action="edit"], [data-action="editar"]',
        'button svg[data-testid="EditIcon"], button .edit-icon',
        'button:has([class*="edit"]), button:has([class*="pencil"])'
      ]
    };
    
    const botoesEncontrados = {};
    
    for (const [acao, selectors] of Object.entries(botoesSelectors)) {
      console.log(`   Procurando botão: ${acao.toUpperCase()}`);
      
      let botaoEncontrado = null;
      let selectorUsado = '';
      
      for (const selector of selectors) {
        try {
          const elementos = page.locator(selector);
          const count = await elementos.count();
          
          if (count > 0) {
            // Verificar se pelo menos um está visível
            for (let i = 0; i < count; i++) {
              const elemento = elementos.nth(i);
              if (await elemento.isVisible()) {
                botaoEncontrado = elemento;
                selectorUsado = selector;
                break;
              }
            }
            if (botaoEncontrado) break;
          }
        } catch (e) {
          // Continuar procurando
        }
      }
      
      if (botaoEncontrado) {
        const habilitado = await botaoEncontrado.isEnabled();
        const classe = await botaoEncontrado.getAttribute('class') || '';
        const onclick = await botaoEncontrado.getAttribute('onclick') || '';
        const dataAction = await botaoEncontrado.getAttribute('data-action') || '';
        
        console.log(`   ✅ ${acao.toUpperCase()} encontrado:`);
        console.log(`      - Seletor: ${selectorUsado}`);
        console.log(`      - Habilitado: ${habilitado}`);
        console.log(`      - Classes: ${classe.substring(0, 100)}`);
        console.log(`      - OnClick: ${onclick.substring(0, 50)}`);
        console.log(`      - Data-Action: ${dataAction}`);
        
        botoesEncontrados[acao] = {
          elemento: botaoEncontrado,
          habilitado: habilitado,
          selector: selectorUsado
        };
      } else {
        console.log(`   ❌ ${acao.toUpperCase()} NÃO ENCONTRADO`);
        botoesEncontrados[acao] = null;
      }
      console.log('   ---');
    }
    
    // 6. CAPTURAR SCREENSHOT DA ÁREA DE AÇÕES
    console.log('6. CAPTURANDO SCREENSHOTS...');
    
    // Tentar capturar área específica dos botões
    try {
      const areaAcoes = page.locator('td:last-child, .actions-column, .btn-group').first();
      if (await areaAcoes.count() > 0) {
        await areaAcoes.screenshot({ path: 'botoes-acoes-detail.png' });
        console.log('   📸 Área de ações: botoes-acoes-detail.png');
      }
    } catch (e) {
      console.log('   ⚠️  Não foi possível capturar área específica de ações');
    }
    
    // 7. TESTAR CLIQUES NOS BOTÕES
    console.log('7. TESTANDO CLIQUES NOS BOTÕES...');
    
    for (const [acao, botaoData] of Object.entries(botoesEncontrados)) {
      if (botaoData && botaoData.elemento) {
        console.log(`   Testando ${acao.toUpperCase()}...`);
        
        try {
          // Limpar contadores antes do teste
          const errosAntes = errosConsole.length;
          const requisicoesAntes = requisicoesRede.length;
          
          // Clicar no botão
          await botaoData.elemento.click();
          await page.waitForTimeout(2000); // Aguardar resposta
          
          // Verificar se houve mudanças
          const errosDepois = errosConsole.length;
          const requisicoesDepois = requisicoesRede.length;
          
          const novosErros = errosDepois - errosAntes;
          const novasRequisicoes = requisicoesDepois - requisicoesAntes;
          
          console.log(`      - Novos erros: ${novosErros}`);
          console.log(`      - Novas requisições: ${novasRequisicoes}`);
          
          // Capturar screenshot após clique
          await page.screenshot({ path: `apos-click-${acao}.png` });
          console.log(`      📸 Screenshot: apos-click-${acao}.png`);
          
          if (novosErros > 0) {
            console.log(`      🚨 ERROS DETECTADOS no ${acao}!`);
          }
          
          if (novasRequisicoes === 0) {
            console.log(`      ⚠️  NENHUMA REQUISIÇÃO gerada pelo ${acao}`);
          }
          
        } catch (clickError) {
          console.log(`      ❌ ERRO ao clicar em ${acao}: ${clickError.message}`);
        }
        
        console.log('      ---');
      }
    }
    
    // 8. ANÁLISE FINAL
    console.log('8. ANÁLISE FINAL DOS RESULTADOS...');
    
    const botoesPresentes = Object.values(botoesEncontrados).filter(b => b !== null).length;
    const totalBotoes = Object.keys(botoesEncontrados).length;
    
    console.log(`📊 RESUMO:`);
    console.log(`   Botões encontrados: ${botoesPresentes}/${totalBotoes}`);
    console.log(`   Total de erros console: ${errosConsole.length}`);
    console.log(`   Total de requisições: ${requisicoesRede.length}`);
    
    if (botoesPresentes === 0) {
      console.log('   🚨 CRÍTICO: NENHUM BOTÃO DE AÇÃO ENCONTRADO!');
      console.log('   💡 Possíveis causas:');
      console.log('      - Componente não está renderizando');
      console.log('      - Seletores mudaram');
      console.log('      - Erro no JavaScript do componente');
    } else if (botoesPresentes < totalBotoes) {
      console.log('   ⚠️  PARCIAL: Alguns botões estão faltando');
    } else if (requisicoesRede.length === 0) {
      console.log('   ⚠️  BOTÕES EXISTEM mas não fazem requisições');
      console.log('   💡 Possíveis causas:');
      console.log('      - Event handlers não anexados');
      console.log('      - URLs/rotas incorretas');
      console.log('      - Problemas de autenticação');
    }
    
    // Salvar logs detalhados
    const relatorio = {
      timestamp: new Date().toISOString(),
      botoesEncontrados: Object.keys(botoesEncontrados).map(key => ({
        acao: key,
        encontrado: botoesEncontrados[key] !== null,
        habilitado: botoesEncontrados[key]?.habilitado || false,
        selector: botoesEncontrados[key]?.selector || 'N/A'
      })),
      errosConsole: errosConsole,
      requisicoesRede: requisicoesRede
    };
    
    fs.writeFileSync('relatorio-acoes-urgente.json', JSON.stringify(relatorio, null, 2));
    console.log('   📄 Relatório salvo: relatorio-acoes-urgente.json');
    
  } catch (error) {
    console.error('❌ ERRO CRÍTICO NO TESTE:', error.message);
    await page.screenshot({ path: 'erro-critico-acoes.png', fullPage: true });
    console.log('   📸 Screenshot de erro: erro-critico-acoes.png');
  } finally {
    await browser.close();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🚨 TESTE URGENTE CONCLUÍDO');
  console.log('📋 Próximos passos baseados nos resultados:');
  console.log('   1. Verificar screenshots gerados');
  console.log('   2. Analisar relatorio-acoes-urgente.json');
  console.log('   3. Implementar correções baseadas nos achados');
}

testActionsUrgent().catch(console.error);