# Guia de Servidores MCP Instalados

Este documento contém informações sobre os servidores MCP (Model Context Protocol) instalados e disponíveis para uso em qualquer projeto.

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Exa MCP Server](#1-exa-mcp-server-)
- [Ref Tools MCP](#2-ref-tools-mcp-)
- [Semgrep MCP](#3-semgrep-mcp-)
- [Shadcn UI MCP](#4-shadcn-ui-mcp-)
- [Configuração](#configuração)
- [Casos de Uso](#casos-de-uso)

## Visão Geral

Os servidores MCP expandem as capacidades do Claude Code, permitindo acesso a ferramentas especializadas para pesquisa, documentação e análise de código.

## 1. Exa MCP Server 🔍

### Descrição
Servidor de busca avançada na web usando IA neural, ideal para pesquisas em tempo real e descoberta de conteúdo.

### Instalação
```bash
npm install -g @exa/mcp-server
```

### Comandos Disponíveis
- `search` - Busca neural na web
- `find_similar` - Encontra conteúdo similar a uma URL
- `get_contents` - Obtém conteúdo de URLs específicas

### Configuração
```bash
export EXA_API_KEY="sua-chave-api"
```

### Casos de Uso
- Pesquisar tendências e tecnologias atuais
- Encontrar soluções para problemas técnicos
- Descobrir bibliotecas e ferramentas
- Análise competitiva e pesquisa de mercado

### Exemplo de Uso
```javascript
// Buscar informações sobre React 19
await mcp.search({
  query: "React 19 new features",
  num_results: 10
});
```

## 2. Ref Tools MCP 📚

### Descrição
Ferramenta otimizada para busca em documentação técnica, minimizando uso de tokens.

### Instalação
```bash
npm install -g @reftools/mcp-server
```

### Comandos Disponíveis
- `search_docs` - Busca em documentação
- `get_doc_content` - Obtém conteúdo específico
- `list_sources` - Lista fontes disponíveis

### Características
- Busca eficiente com economia de tokens
- Suporte para múltiplas fontes de documentação
- Cache inteligente para respostas rápidas

### Casos de Uso
- Consultar documentação de frameworks
- Encontrar exemplos de código
- Verificar APIs e métodos
- Resolver dúvidas de sintaxe

### Exemplo de Uso
```javascript
// Buscar documentação do Next.js
await mcp.search_docs({
  query: "Next.js App Router",
  source: "nextjs"
});
```

## 3. Semgrep MCP 🛡️

### Descrição
Analisador estático de código para detectar vulnerabilidades, bugs e problemas de qualidade.

### Instalação
```bash
pip install semgrep
npm install -g @semgrep/mcp-server
```

### Comandos Disponíveis
- `scan` - Analisa código em busca de problemas
- `list_rules` - Lista regras disponíveis
- `get_findings` - Obtém resultados detalhados
- `fix_finding` - Sugere correções

### Capacidades
- Detecção de vulnerabilidades (OWASP Top 10)
- Análise de qualidade de código
- Verificação de conformidade
- Suporte para 30+ linguagens

### Casos de Uso
- Auditoria de segurança
- Code review automatizado
- Detecção de bugs
- Conformidade com padrões

### Exemplo de Uso
```javascript
// Analisar projeto para vulnerabilidades
await mcp.scan({
  path: "./src",
  rules: ["security", "bug"],
  severity: ["HIGH", "CRITICAL"]
});
```

## 4. Shadcn UI MCP 🎨

### Descrição
Servidor MCP especializado para acesso completo aos componentes shadcn/ui, proporcionando AI assistants com capacidades avançadas para desenvolvimento de interfaces modernas.

### Instalação
```bash
npm install -g @jpisnice/shadcn-ui-mcp-server
# ou
npm install @jpisnice/shadcn-ui-mcp-server --save-dev
```

### Comandos Disponíveis
- `get_component` - Recupera código fonte de componentes
- `get_component_demo` - Obtém exemplos de uso e demos
- `list_components` - Lista todos os componentes disponíveis
- `get_block` - Recupera implementações completas de blocos

### Características
- Suporte para React e Svelte frameworks
- Acesso a componentes shadcn/ui v4
- Metadados e dependências dos componentes
- Exemplos práticos e demos interativas
- Integração com GitHub API para performance otimizada

### Configuração
```bash
# Token GitHub para melhor rate limit (opcional mas recomendado)
export GITHUB_PERSONAL_ACCESS_TOKEN="seu-token-github"

# Ou usar flag na execução
npx @jpisnice/shadcn-ui-mcp-server --github-api-key seu-token-github
```

### Casos de Uso
- Desenvolvimento rápido de componentes UI
- Exploração de padrões de design shadcn/ui
- Implementação consistente de interfaces
- Prototipagem acelerada de componentes
- Integração com sistemas de design existentes

### Exemplo de Uso
```javascript
// Obter código de um componente Button
await mcp.get_component({
  component: "button",
  framework: "react"
});

// Listar todos os componentes disponíveis
await mcp.list_components({
  framework: "react"
});

// Obter demo de um componente específico
await mcp.get_component_demo({
  component: "dialog",
  framework: "react"
});
```

### Benefícios para Desenvolvimento
- **Acelera desenvolvimento**: Acesso instantâneo a componentes testados
- **Consistência de design**: Componentes padronizados e acessíveis
- **Melhor DX**: Integração seamless com AI assistants
- **Framework flexível**: Suporte para múltiplos frameworks
- **Atualizado**: Sempre sincronizado com as versões mais recentes

## Configuração

### 1. Variáveis de Ambiente
```bash
# Exa API Key (obter em https://exa.ai)
export EXA_API_KEY="sua-chave-aqui"

# GitHub Personal Access Token para Shadcn UI MCP (obter em https://github.com/settings/tokens)
export GITHUB_PERSONAL_ACCESS_TOKEN="seu-token-github"

# Configurações opcionais
export SEMGREP_RULES_PATH="/caminho/para/regras/customizadas"
export REF_TOOLS_CACHE_DIR="/caminho/para/cache"
```

### 2. Integração com Claude Desktop
Adicione ao seu arquivo de configuração do Claude:
```json
{
  "mcpServers": {
    "exa": {
      "command": "exa-mcp-server"
    },
    "reftools": {
      "command": "reftools-mcp-server"
    },
    "semgrep": {
      "command": "semgrep-mcp-server"
    },
    "shadcn-ui": {
      "command": "npx",
      "args": ["@jpisnice/shadcn-ui-mcp-server"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "seu-token-github"
      }
    }
  }
}
```

## Casos de Uso

### 🔍 Pesquisa e Descoberta (Exa)
- **Problema**: Preciso encontrar a melhor biblioteca de gráficos para React
- **Solução**: Use Exa para buscar comparações atualizadas e tendências

### 📚 Consulta Rápida (Ref Tools)
- **Problema**: Como funciona o useEffect no React?
- **Solução**: Use Ref Tools para acessar documentação oficial rapidamente

### 🛡️ Segurança (Semgrep)
- **Problema**: Verificar se o código tem vulnerabilidades antes do deploy
- **Solução**: Use Semgrep para análise completa de segurança

### 🎨 Desenvolvimento UI (Shadcn UI)
- **Problema**: Preciso implementar um componente complexo com melhor UX
- **Solução**: Use Shadcn UI MCP para acessar componentes prontos e exemplos

### 🔄 Workflow Completo
1. **Pesquise** soluções com Exa
2. **Consulte** documentação com Ref Tools
3. **Implemente** UI com Shadcn UI MCP
4. **Valide** segurança com Semgrep

## Melhores Práticas

1. **Use Exa** para informações atualizadas e pesquisa exploratória
2. **Use Ref Tools** para consultas rápidas de documentação
3. **Use Shadcn UI MCP** para desenvolvimento rápido e consistente de interfaces
4. **Use Semgrep** regularmente para manter código seguro
5. **Combine** todos os servidores para um workflow completo de desenvolvimento

## Troubleshooting

### Exa não retorna resultados
- Verifique se a API key está configurada
- Tente queries mais específicas

### Ref Tools está lento
- Limpe o cache: `rm -rf $REF_TOOLS_CACHE_DIR`
- Verifique conexão com internet

### Semgrep não detecta problemas
- Atualize as regras: `semgrep --update`
- Verifique se está analisando os arquivos corretos

### Shadcn UI MCP com erros de rate limit
- Configure o token GitHub: `export GITHUB_PERSONAL_ACCESS_TOKEN="seu-token"`
- Verifique se o token tem permissões de leitura de repositórios públicos
- Aguarde alguns minutos antes de tentar novamente

## Recursos Adicionais

- [Exa Documentation](https://docs.exa.ai)
- [Ref Tools GitHub](https://github.com/ref-tools/ref-tools-mcp)
- [Semgrep Rules](https://semgrep.dev/r)
- [Shadcn UI MCP GitHub](https://github.com/Jpisnice/shadcn-ui-mcp-server)
- [Shadcn UI Components](https://ui.shadcn.com/components)
- [GitHub Personal Access Tokens](https://github.com/settings/tokens)

---

**Última atualização**: 31/07/2025