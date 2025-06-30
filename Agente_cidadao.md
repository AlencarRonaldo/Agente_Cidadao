Escopo do Projeto: Agente IA para Denúncias Urbanas
1. Visão Geral do Projeto
Objetivo Principal
Desenvolver um sistema automatizado que receba reclamações de cidadãos via WhatsApp, processe o conteúdo usando IA, e publique automaticamente no Instagram marcando autoridades competentes por região.
Nome do Projeto
CidadãoBot - Agente de Denúncias Urbanas Inteligente
2. Escopo Funcional
2.1 Funcionalidades Principais
Módulo de Recepção (WhatsApp)

Receber mensagens de texto
Receber imagens com descrições
Receber áudios (transcrição para texto) - *Adiado para fases futuras*
Identificar localização via descrição textual (endereço fornecido pelo usuário)
Validar formato e conteúdo das denúncias
Sistema de confirmação para o usuário

Módulo de Processamento IA

Análise de Imagem:

Identificar tipo de problema (buraco, lixo, iluminação, etc.) - *Análise básica ou dependência da descrição textual*
Extrair informações de localização da imagem - *Adiado, foco no endereço textual*
Classificar gravidade do problema
Detectar conteúdo inadequado/spam


Processamento de Texto:

Correção ortográfica e gramatical - *Simplificado ou adiado*
Ajuste de tom para linguagem formal/institucional - *Simplificado ou adiado*
Padronização do formato da denúncia
Extração de palavras-chave para categorização
Identificação de região/bairro mencionado


Módulo de Roteamento

Mapear denúncia para região administrativa (baseado no endereço textual)
Identificar vereadores responsáveis pela área (baseado em cadastro manual)
Selecionar autoridades competentes por tipo de problema
Validar handles/perfis do Instagram dos políticos


Módulo de Publicação (Instagram)

Criar post com texto formatado
Incluir imagem (se fornecida)
Adicionar hashtags padronizadas
Mencionar autoridades relevantes
Agendar horários de publicação estratégicos
Limitação de Postagens: Máximo 2 posts por dia
Stories: Máximo 5 stories por dia para denúncias rápidas
Sistema de fila para gerenciar publicações
Priorização por gravidade do problema
Monitorar engajamento das postagens

2.2 Funcionalidades Secundárias

Dashboard administrativo para monitoramento - *Adiado*
Relatórios de denúncias por região/tipo - *Adiado*
Sistema de feedback para usuários - *Adiado*
Moderação manual para casos complexos - *Adiado*
Integração com sistemas de protocolo municipal - *Adiado*

3. Requisitos Técnicos
3.1 Arquitetura do Sistema
[WhatsApp (Node.js)] → [Backend Python (Flask)] → [Banco de Dados (SQLite)] → [Instagram API]

3.2 Tecnologias Propostas
Backend

Linguagem: Python 3.9+
Framework: Flask
Banco de Dados: SQLite
Queue System: Fila em memória ou processamento síncrono (para baixo custo)
Containerização: Docker + Docker Compose - *Adiado para fases futuras*

APIs de IA

Visão Computacional: Modelos open-source básicos ou dependência textual - *Foco em baixo custo*
Processamento de Linguagem: NLTK ou SpaCy (open-source)
Transcrição de Áudio: Adiado

Integrações

WhatsApp: whatsapp-web.js (não oficial, para baixo custo)
Instagram: Instagram Graph API
Mapas: Não utilizado (endereço textual)
Notificações: Sistema de webhooks

Infraestrutura

Cloud: VPS de baixo custo (ex: DigitalOcean, Linode, Vultr)
Monitoramento: Removido para baixo custo
Logs: Removido para baixo custo

3.3 Requisitos de Performance

Processamento de mensagens em até 30 segundos
Suporte a 1000+ denúncias simultâneas
Disponibilidade 99.5%
Backup automático diário

4. Banco de Dados
4.1 Principais Entidades

Usuários: Cidadãos que fazem denúncias
Denúncias: Registro completo de cada reclamação
Políticos: Vereadores com dados de contato
Regiões: Mapeamento de bairros e áreas administrativas
Publicações: Histórico de posts no Instagram
Categorias: Tipos de problemas urbanos

4.2 Estrutura Exemplo
-- Tabela principal de denúncias
CREATE TABLE denuncias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_whatsapp TEXT,
    texto_original TEXT,
    texto_processado TEXT,
    imagem_url TEXT,
    endereco_denuncia TEXT,
    categoria TEXT,
    prioridade INTEGER DEFAULT 3, -- 1=urgente, 5=baixa
    tipo_publicacao TEXT DEFAULT 'post', -- 'post' ou 'story'
    status TEXT,
    agendado_para TIMESTAMP,
    publicado_em TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de vereadores
CREATE TABLE vereadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    regiao TEXT NOT NULL,
    instagram_handle TEXT
);

5. Fluxo de Trabalho Detalhado
5.1 Processo de Denúncia

Recepção (0-5s)

Usuário envia mensagem no WhatsApp
Sistema valida formato e conteúdo
Confirma recebimento para o usuário


Processamento (5-25s)

IA analisa imagem (se presente)
IA processa e ajusta texto
Sistema identifica localização e categoria
Mapeia autoridades responsáveis


Validação (25-30s)

Verificação de conteúdo inadequado
Confirmação de dados dos políticos
Formatação final do post


Agendamento Inteligente

Fila de Publicações: Sistema de prioridade por gravidade
Posts: Máximo 2 por dia (manhã e tarde)
Stories: Máximo 5 por dia para denúncias menores
Horários Estratégicos: 8h, 18h para posts / distribuição ao longo do dia para stories


Publicação (variável)

Post no Instagram com menções ou story rápido
Confirmação para o usuário sobre agendamento
Monitoramento de engajamento


5.2 Casos de Uso Especiais

Muitas denúncias: Sistema de fila inteligente priorizando por gravidade
Denúncia urgente: Pode ser publicada como story imediatamente
Denúncia sem localização: Solicitar esclarecimento
Conteúdo inadequado: Rejeitar e orientar usuário
Político sem Instagram: Usar canais alternativos
Problema fora da jurisdição: Redirecionar para órgão correto
Limite de posts atingido: Informar usuário sobre agendamento para o próximo dia

6. Aspectos Legais e Éticos
6.1 Conformidade Legal

LGPD: Consentimento explícito para uso de dados
Termos de Uso: Política clara de uso do serviço
Direito de Imagem: Validação para fotos de terceiros
Fake News: Sistema de verificação de denúncias

6.2 Diretrizes Éticas

Transparência sobre uso de IA
Direito de exclusão de dados
Moderação humana para casos sensíveis
Evitar perseguição política

7. Cronograma de Desenvolvimento
Fase 1: MVP (8 semanas)

Semanas 1-2: Configuração da infraestrutura
Semanas 3-4: Integração WhatsApp + processamento básico
Semanas 5-6: Processamento IA + banco de dados
Semanas 7-8: Integração Instagram + testes

Fase 2: Aprimoramentos (6 semanas)

Semanas 9-10: Dashboard administrativo
Semanas 11-12: Sistema de geolocalização avançado
Semanas 13-14: Otimizações e melhorias de IA

Fase 3: Produção (4 semanas)

Semanas 15-16: Testes de carga e segurança
Semanas 17-18: Deploy e monitoramento

8. Riscos e Mitigações
8.1 Riscos Técnicos

Bloqueio de APIs: Diversificar provedores
Sobrecarga do sistema: Implementar auto-scaling
Qualidade da IA: Treinar modelos específicos

8.2 Riscos Legais

Violação de privacidade: Auditoria legal prévia
Processo por difamação: Sistema de moderação robusto
Mudanças na legislação: Acompanhamento jurídico

8.3 Riscos de Negócio

Baixa adesão: Estratégia de marketing
Resistência política: Diálogo com autoridades
Sustentabilidade financeira: Modelo de monetização

9. Métricas de Sucesso
9.1 KPIs Principais

Número de denúncias processadas por mês
Taxa de conversão (WhatsApp → Instagram)
Tempo médio de processamento
Engajamento nas publicações do Instagram
Satisfação do usuário (NPS)

9.2 Metas Iniciais (6 meses)

1.000+ denúncias processadas
95% de taxa de conversão
<30s tempo de processamento
500+ seguidores no Instagram
NPS > 7.0

10. Próximos Passos

Validação do Conceito: Pesquisa com cidadãos e autoridades
Prototipagem: Desenvolvimento de MVP básico
Testes Piloto: Implementação em bairro específico
Ajustes e Melhorias: Baseado no feedback dos testes
Lançamento: Expansão para toda a cidade

11. Status Atual do Projeto

**Estrutura de Diretórios:**
- `D:/Agente_Cidadao/src/`: Contém o código Python do backend.
- `D:/Agente_Cidadao/data/`: Armazena o banco de dados SQLite.
- `D:/Agente_Cidadao/whatsapp_bot/`: Contém o código Node.js do bot do WhatsApp.

**Arquivos Criados e Configurados:**
- `D:/Agente_Cidadao/src/requirements.txt`: Lista as dependências Python (`Flask`, `Pillow`, `nltk`).
- `D:/Agente_Cidadao/src/app.py`: Backend Flask com uma rota `/denuncia` para receber dados do bot do WhatsApp e salvar no banco de dados.
- `D:/Agente_Cidadao/src/database.py`: Script para inicializar o banco de dados SQLite (`D:/Agente_Cidadao/data/agente_cidadao.db`) com as tabelas `denuncias` e `vereadores`. Este script já foi executado.
- `D:/Agente_Cidadao/whatsapp_bot/package.json`: Arquivo de configuração do projeto Node.js.
- `D:/Agente_Cidadao/whatsapp_bot/index.js`: Bot do WhatsApp que se conecta ao WhatsApp Web, exibe QR code para autenticação e envia mensagens recebidas para o backend Flask. Utiliza `whatsapp-web.js` e `axios`.
- `D:/Agente_Cidadao/start_backend.bat`: Script para iniciar o backend Flask.
- `D:/Agente_Cidadao/start_whatsapp_bot.bat`: Script para iniciar o bot do WhatsApp.

**Status da Configuração:**
- O ambiente Python e Node.js foram configurados.
- As dependências `Flask`, `Pillow`, `nltk` (Python) e `whatsapp-web.js`, `axios`, `qrcode-terminal` (Node.js) foram instaladas.
- O bot do WhatsApp foi autenticado com sucesso via QR code.
- O banco de dados SQLite foi inicializado com as tabelas `denuncias` e `vereadores`.
