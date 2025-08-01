# 🧠 Sistema de Análise Inteligente - Documentação Completa

## 🎯 Visão Geral

O Sistema de Análise Inteligente do Bot de Denúncias Cidadãs utiliza **processamento de linguagem natural** para análise automática de denúncias, gerando captions otimizadas para Instagram com:

- 🔍 **Detecção automática** de problemas urbanos com emojis específicos
- 📍 **Identificação de localização** e bairros de São Bernardo do Campo
- 🏛️ **Seleção automática** de vereadores responsáveis por região
- 🏷️ **Geração de hashtags** personalizadas e otimizadas
- 📝 **Captions inteligentes** formatadas para máximo engajamento

## 🚀 Funcionalidades

### 🔍 Detecção Automática de Problemas

O sistema reconhece **92 tipos diferentes** de problemas urbanos organizados em **9 categorias**:

- **🛣️ VIA_PUBLICA**: buracos, asfalto, calçadas, meio-fio
- **💡 ILUMINACAO**: lâmpadas, postes, iluminação pública
- **🗑️ LIMPEZA**: lixo, entulho, coleta, varrição
- **🚦 TRANSITO**: semáforos, sinalização, placas, faixas de pedestre
- **🌳 MEIO_AMBIENTE**: árvores, poda, praças, parques
- **🚰 SANEAMENTO**: esgoto, água, vazamentos, bueiros
- **👮 SEGURANCA**: segurança pública, roubos, violência
- **🚌 TRANSPORTE**: ônibus, pontos, transporte público
- **🏗️ CONSTRUCAO**: obras, construções, reformas

### 📍 Detecção de Localização

**Mapeamento completo** de São Bernardo do Campo com:
- **6 regiões administrativas**: Centro, Norte, Sul, Leste, Oeste, São Pedro
- **Mais de 30 bairros** mapeados com vereadores responsáveis
- **Detecção inteligente** de endereços e referências
- **Normalização** automática de texto com acentos
- **Região São Pedro especial** com SubPrefeito Renatão

### 🏛️ Sistema de Vereadores

Cada bairro possui **vereadores específicos** mapeados com handles reais do Instagram:
- **Região Centro**: @perycartola, @danilolimasbc, @julinho.fuzari
- **Região Norte**: @joaovianasbc, @shellgomes, @ananicemartins
- **Região Sul**: @lucasferreiravereador, @palhinhasbc, @ananicemartins
- **Região Leste**: @shellgomes, @lucasferreiravereador, @ananicemartins
- **Região Oeste**: @julinho.fuzari, @watanabe_oficial, @getuliodoamarelinho
- **Região São Pedro**: @renatao_o_amigo_da_periferia (SubPrefeito)

### 📝 Geração de Captions Inteligentes

**Formato otimizado** seguindo as melhores práticas do Instagram:

```
🕳️ DENÚNCIA CIDADÃ

Buraco gigante na Rua das Flores, 123 - Assunção. Está causando acidentes!

📢 VEREADORES DA REGIÃO:
@joaovianasbc @shellgomes @ananicemartins

📍 Região: ASSUNÇÃO

👥 MORADORES: Curtam e compartilhem para dar visibilidade!
🏛️ PODER PÚBLICO: Esperamos providências!
Porque aqui é CIDADE PRA FRENTE!

#AssuncaoSBC #DenunciaCidada #FiscalizaSBC #SaoBernardoDoCampo #ProblemasUrbanos #CidadeMelhor #ABC #ViasPublicas #Asfalto #Mobilidade
```

## 🔧 Integração com o Sistema

### 1. ProcessWorker Integration

O `processWorker.js` foi atualizado para incluir análise inteligente:

```javascript
// 2. Análise inteligente da denúncia
const analiseInteligente = await smartAnalysisService.analisarDenuncia(denuncia.texto, denuncia.localizacao);

// Usar vereadores detectados pela análise inteligente
if (analiseInteligente.bairro && analiseInteligente.vereadores.length > 0) {
  vereadores = analiseInteligente.vereadores;
  bairroFinal = analiseInteligente.bairro;
}

// Salvar análise no metadata da denúncia
metadata: {
  analiseInteligente: {
    problemaDetectado: analiseInteligente.problemaDetectado,
    emoji: analiseInteligente.emoji,
    categoria: analiseInteligente.categoria,
    // ... outros campos
  }
}
```

### 2. PublishWorker Integration

O `publishWorker.js` foi atualizado para usar captions inteligentes:

```javascript
// Formatar texto do post usando análise inteligente
const textoPost = await formatarPostInteligente(denuncia);

async function formatarPostInteligente(denuncia) {
  // Usar análise salva ou executar nova análise
  const analiseInteligente = denuncia.metadata?.analiseInteligente || 
    await smartAnalysisService.analisarDenuncia(denuncia.texto, denuncia.localizacao);
  
  // Gerar caption otimizada
  const caption = smartAnalysisService.gerarCaption(analiseInteligente, denuncia.textoFiltrado);
  return `${caption}\\n\\nProtocolo: ${denuncia.protocolo}`;
}
```

## 🛠️ Endpoints da API

### POST `/api/admin/smart-analysis/test`
Testar análise inteligente de texto

**Request:**
```json
{
  "texto": "Buraco gigante na Rua das Flores, 123 - Assunção",
  "localizacao": "Assunção"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analise": {
      "problemaDetectado": "buraco",
      "emoji": "🕳️",
      "categoria": "VIA_PUBLICA",
      "prioridade": "ALTA",
      "bairro": "ASSUNÇÃO",
      "regiao": "NORTE",
      "vereadores": ["@joao.viana.sbc", "@bispo.joao.batista"],
      "hashtags": ["#AssuncaoSBC", "#DenunciaCidada", "..."]
    },
    "caption": "🕳️ DENÚNCIA CIDADÃ\\n\\nBuraco gigante...",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### GET `/api/admin/smart-analysis/problemas`
Listar todos os problemas urbanos conhecidos

**Response:**
```json
{
  "success": true,
  "data": {
    "VIA_PUBLICA": [
      {"termo": "buraco", "emoji": "🕳️", "prioridade": "ALTA"},
      {"termo": "asfalto", "emoji": "🛣️", "prioridade": "ALTA"}
    ],
    "ILUMINACAO": [
      {"termo": "lampada", "emoji": "💡", "prioridade": "ALTA"}
    ]
  },
  "totalCategorias": 9
}
```

### GET `/api/admin/smart-analysis/bairros`
Listar todos os bairros conhecidos

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "bairro": "ASSUNÇÃO",
      "regiao": "NORTE",
      "hashtag": "#AssuncaoSBC",
      "vereadores": ["@joao.viana.sbc", "@bispo.joao.batista"]
    }
  ],
  "totalBairros": 23
}
```

### GET `/api/admin/smart-analysis/vereadores/:bairro`
Buscar vereadores por bairro específico

**Response:**
```json
{
  "success": true,
  "data": {
    "vereadores": ["@joao.viana.sbc", "@bispo.joao.batista"],
    "regiao": "NORTE",
    "hashtag": "#AssuncaoSBC"
  }
}
```

### GET `/api/admin/smart-analysis/stats`
Estatísticas das análises realizadas (apenas ADMIN)

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "categorias": {
      "VIA_PUBLICA": 45,
      "ILUMINACAO": 30,
      "LIMPEZA": 25
    },
    "prioridades": {
      "ALTA": 65,
      "MEDIA": 85
    },
    "regioes": {
      "NORTE": 40,
      "CENTRO": 35
    },
    "problemasDetectados": 142,
    "denunciasAnalisadas": 150
  }
}
```

### POST `/api/admin/smart-analysis/reprocess/:id`
Reprocessar denúncia específica com nova análise

**Response:**
```json
{
  "success": true,
  "message": "Denúncia reprocessada com análise inteligente",
  "data": {
    "denuncia": { "id": "...", "...": "..." },
    "novaAnalise": { "problemaDetectado": "...", "...": "..." },
    "novaCaption": "🕳️ DENÚNCIA CIDADÃ..."
  }
}
```

## 🧪 Testando o Sistema

### 1. Executar Script de Teste

```bash
node test-smart-analysis.js
```

O script testa:
- ✅ Detecção de problemas urbanos
- ✅ Identificação de bairros e regiões  
- ✅ Seleção de vereadores corretos
- ✅ Geração de captions otimizadas
- ✅ Funcionalidades auxiliares

### 2. Teste via Admin Panel

1. Acesse: `http://localhost:3333/admin`
2. Faça login como admin
3. Use os endpoints `/api/admin/smart-analysis/*`

### 3. Casos de Teste Recomendados

```javascript
// Teste 1: Buraco na Assunção
{
  "texto": "Buraco gigante na Rua das Flores, 123 - Assunção. Está causando acidentes!",
  "localizacao": "Assunção"
}

// Teste 2: Lâmpada no Centro  
{
  "texto": "Lâmpada do poste na Rua Marechal Deodoro está queimada",
  "localizacao": "Centro"
}

// Teste 3: Semáforo sem localização explícita
{
  "texto": "Semáforo da Avenida Kennedy no Rudge Ramos não funciona",
  "localizacao": null
}
```

## 📊 Métricas e Monitoramento

### Logs Importantes

```javascript
// Logs de análise
logger.info('🔍 Iniciando análise inteligente da denúncia...');
logger.info('✅ Análise inteligente concluída: buraco 🕳️');
logger.info('🎯 Usando vereadores da análise inteligente: ASSUNÇÃO → @joao.viana.sbc');

// Logs de caption
logger.info('📋 Usando análise inteligente salva para denúncia 123');
logger.info('🤖 Executando análise inteligente em tempo real para denúncia 456');
```

### Campos no Banco de Dados

A análise inteligente é salva no campo `metadata` das denúncias:

```json
{
  "metadata": {
    "analiseInteligente": {
      "problemaDetectado": "buraco",
      "emoji": "🕳️",
      "categoria": "VIA_PUBLICA",
      "prioridade": "ALTA",
      "bairroDetectado": "ASSUNÇÃO",
      "regiaoDetectada": "NORTE",
      "localizacaoDetectada": "Rua das Flores, 123",
      "hashtags": ["#AssuncaoSBC", "#DenunciaCidada"],
      "processedAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

## 📈 Performance e Otimização

### Caching Strategy

- **Análises salvas**: Reutilizar análises já processadas para evitar reprocessamento
- **Fallback inteligente**: Usar método tradicional se análise inteligente falhar
- **Processamento assíncrono**: Análise executada nos workers sem bloquear UI

### Error Handling

```javascript
try {
  const analise = await smartAnalysisService.analisarDenuncia(texto, localizacao);
  // Usar análise inteligente
} catch (error) {
  logger.error('❌ Erro na análise inteligente:', error.message);
  // Fallback para método tradicional
  return formatarPostTradicional(denuncia);
}
```

## 🔄 Workflow Completo

1. **WhatsApp Bot** recebe denúncia
2. **ProcessWorker** executa análise inteligente automaticamente
3. **Metadata** da análise é salvo na denúncia
4. **Bairro e vereadores** são atualizados se detectados
5. **PublishWorker** usa análise salva para gerar caption
6. **Instagram** recebe post com caption otimizada
7. **Admin Panel** permite reprocessamento manual

## 🚀 Próximas Melhorias

- **Machine Learning**: Treinar modelo personalizado com dados históricos
- **Sentiment Analysis**: Detectar urgência e sentimento das denúncias
- **Geo-coding**: Integração com APIs de mapas para localização precisa
- **Auto-tagging**: Tags automáticas para categorização avançada
- **A/B Testing**: Testar diferentes formatos de caption para maior engajamento

## ⚠️ Limitações Conhecidas

1. **Dependência de palavras-chave**: Detecção baseada em termos específicos
2. **Bairros limitados**: Apenas bairros mapeados de São Bernardo do Campo
3. **Idioma único**: Suporte apenas para português brasileiro
4. **Análise sintática**: Não compreende contexto complexo ou sarcasmo

## 📞 Suporte e Debugging

### Verificar Logs
```bash
tail -f logs/combined.log | grep "análise inteligente"
```

### Testar Manualmente
```javascript
const smartAnalysisService = require('./src/services/smartAnalysisService');
const resultado = await smartAnalysisService.analisarDenuncia('Buraco na Assunção');
console.log(resultado);
```

### Endpoints de Debug
- **GET** `/api/admin/smart-analysis/problemas` - Ver todos os problemas cadastrados
- **GET** `/api/admin/smart-analysis/bairros` - Ver todos os bairros mapeados
- **POST** `/api/admin/smart-analysis/test` - Testar análise específica

---

**✅ Sistema de Análise Inteligente pronto para produção!**

O sistema agora detecta automaticamente problemas urbanos, identifica bairros, seleciona vereadores apropriados e gera captions otimizadas para Instagram, proporcionando uma experiência muito mais inteligente e eficiente para o Bot de Denúncias Cidadãs.