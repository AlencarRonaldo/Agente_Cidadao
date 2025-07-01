from flask import Flask, request, jsonify
import sqlite3
from datetime import datetime
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from pathlib import Path
import re

# Construir caminhos de forma dinâmica a partir da localização do projeto
PROJECT_ROOT = Path(__file__).parent.parent # Vai para D:/Agente_Cidadao/
NLTK_DATA_PATH = PROJECT_ROOT / 'data' / 'nltk_data'
DATABASE_PATH = PROJECT_ROOT / 'data' / 'agente_cidadao.db'

nltk.data.path.append(str(NLTK_DATA_PATH))

app = Flask(__name__)

# Fila de denúncias para agendamento
fila_denuncias = []

# Contadores para limites diários (resetar a cada dia em uma implementação real)
posts_hoje = 0
stories_hoje = 0
MAX_POSTS_DIA = 2
MAX_STORIES_DIA = 5

# Horários estratégicos para posts
STRATEGIC_POST_HOURS = [8, 18]

# Carregar stopwords em português
stop_words_pt = set(stopwords.words('portuguese'))

# Definição de categorias e palavras-chave
CATEGORIAS = {
    'buraco': ['buraco', 'cratera', 'pavimento', 'asfalto'],
    'lixo': ['lixo', 'entulho', 'descarte', 'sujeira'],
    'iluminacao': ['iluminação', 'poste', 'luz', 'lampada'],
    'arvore': ['arvore', 'galho', 'poda', 'raiz'],
    'agua': ['agua', 'vazamento', 'esgoto', 'encanamento'],
    'seguranca': ['seguranca', 'roubo', 'assalto', 'violencia'],
    'transito': ['transito', 'sinal', 'semaforo', 'engarrafamento'],
    'calcada': ['calcada', 'passeio', 'pedestre', 'obstaculo'],
    'animal': ['animal', 'cachorro', 'gato', 'abandono'],
    'barulho': ['barulho', 'som', 'poluicao sonora']
}

# Definição de prioridades e palavras-chave
PRIORIDADES = {
    'urgente': ['urgente', 'emergencia', 'perigo', 'risco', 'grave'], # Prioridade 1
    'alto': ['importante', 'serio', 'critico'], # Prioridade 2
    'medio': ['problema', 'necessario'], # Prioridade 3 (default)
    'baixo': ['pequeno', 'simples', 'menor'] # Prioridade 4
}

# Palavras-chave para detecção de conteúdo inadequado/spam
PALAVRAS_INADEQUADAS = [
    'sexo', 'nudez', 'pornografia', 'erotico', 'conteudo adulto',
    'droga', 'trafico', 'maconha', 'cocaina', 'crack',
    'arma', 'violencia', 'ameaca', 'agressao', 'matar', 'morte',
    'racismo', 'preconceito', 'discriminacao', 'odio',
    'golpe', 'fraude', 'phishing', 'spam', 'promocao', 'ganhe dinheiro',
    'aposta', 'cassino', 'jogos de azar',
    'politica', 'eleicao', 'partido', 'candidato', 'voto' # Exemplo: se quiser evitar denúncias políticas
]

def detectar_conteudo_inadequado(texto):
    texto_lower = texto.lower()
    for palavra in PALAVRAS_INADEQUADAS:
        # Usar regex para corresponder a palavras inteiras, insensível a maiúsculas/minúsculas
        if re.search(r'\b' + re.escape(palavra) + r'\b', texto_lower):
            return True
    return False

def verificar_denuncia_fake_news(texto):
    # Esta é uma função placeholder para verificação de fake news.
    # Em uma implementação real, um modelo de NLP ou integração com APIs de verificação seria usado aqui.
    # Por enquanto, simula a detecção de fake news com base em palavras-chave simples.
    texto_lower = texto.lower()
    palavras_fake_news = ['fake news', 'noticia falsa', 'boato', 'mentira']
    for palavra in palavras_fake_news:
        if palavra in texto_lower:
            return True
    return False # Retorna False por padrão, simulando que a maioria não é fake news

def processar_texto_denuncia(texto):
    texto_lower = texto.lower()
    
    # Mapeamento de termos informais para formais (simplificado)
    mapeamento_formal = {
        'tá': 'está',
        'pra': 'para',
        'vc': 'você',
        'q': 'que',
        'eh': 'é',
        'to': 'estou',
        'num': 'em um',
        'nao': 'não',
        'mt': 'muito',
        'vdd': 'verdade',
        'blz': 'beleza',
        'obg': 'obrigado',
        'pfv': 'por favor',
        'oq': 'o que',
        'kd': 'cadê',
        'tipo assim': 'por exemplo',
        'daí': 'então',
        'aí': 'então',
        'né': 'não é',
        'tipo': 'por exemplo',
        'galera': 'pessoal',
        'gente': 'nós',
        'ruim': 'insatisfatório',
        'bom': 'satisfatório',
        'problema': 'questão',
        'coisa': 'situação',
        'fazer': 'realizar',
        'resolver': 'solucionar',
        'ajudar': 'auxiliar',
        'pedir': 'solicitar',
        'falar': 'comunicar',
        'ver': 'verificar',
        'dar': 'fornecer',
        'ter': 'possuir',
        'ir': 'dirigir-se',
        'vir': 'chegar',
        'saber': 'ter conhecimento',
        'achar': 'considerar',
        'querer': 'desejar',
        'poder': 'ter a capacidade',
        'dever': 'ter a obrigação',
        'ficar': 'permanecer',
        'passar': 'transcorrer',
        'chegar': 'atingir',
        'sair': 'partir',
        'entrar': 'ingressar',
        'voltar': 'retornar',
        'começar': 'iniciar',
        'terminar': 'finalizar',
        'continuar': 'prosseguir',
        'parar': 'interromper',
        'mudar': 'modificar',
        'usar': 'utilizar',
        'precisar': 'necessitar',
        'encontrar': 'localizar',
        'perder': 'extraviar',
        'ganhar': 'obter',
        'comprar': 'adquirir',
        'vender': 'comercializar',
        'abrir': 'inaugurar',
        'fechar': 'encerrar',
        'ligar': 'conectar',
        'desligar': 'desconectar',
        'mandar': 'enviar',
        'receber': 'recepcionar',
        'responder': 'replicar',
        'perguntar': 'indagar',
        'explicar': 'esclarecer',
        'mostrar': 'apresentar',
        'esconder': 'ocultar',
        'construir': 'edificar',
        'destruir': 'demolir',
        'limpar': 'higienizar',
        'sujar': 'contaminar',
        'secar': 'desidratar',
        'molhar': 'umedecer',
        'quente': 'elevada temperatura',
        'frio': 'baixa temperatura',
        'grande': 'extenso',
        'pequeno': 'reduzido',
        'alto': 'elevado',
        'baixo': 'reduzido',
        'novo': 'recente',
        'velho': 'antigo',
        'claro': 'luminoso',
        'escuro': 'obscuro',
        'forte': 'robusto',
        'fraco': 'debilitado',
        'rapido': 'veloz',
        'devagar': 'lentamente',
        'perto': 'próximo',
        'longe': 'distante',
        'dentro': 'interior',
        'fora': 'exterior',
        'em cima': 'superior',
        'em baixo': 'inferior',
        'antes': 'anteriormente',
        'depois': 'posteriormente',
        'agora': 'atualmente',
        'sempre': 'constantemente',
        'nunca': 'jamais',
        'as vezes': 'ocasionalmente',
        'muito': 'excessivamente',
        'pouco': 'insuficientemente',
        'mais': 'adicionalmente',
        'menos': 'subtraindo',
        'melhor': 'superior',
        'pior': 'inferior',
        'certo': 'correto',
        'errado': 'incorreto',
        'facil': 'simples',
        'dificil': 'complexo',
        'possivel': 'viável',
        'impossivel': 'inviável',
        'verdade': 'realidade',
        'mentira': 'falsidade',
        'sim': 'afirmativo',
        'nao': 'negativo',
        'talvez': 'possivelmente',
        'claro': 'evidentemente',
        'obvio': 'manifesto',
        'cuidado': 'atenção',
        'perigo': 'risco',
        'ajuda': 'auxílio',
        'socorro': 'assistência',
        'parabens': 'felicitações',
        'desculpa': 'perdão',
        'obrigado': 'grato',
        'por favor': 'gentileza',
        'com licença': 'permissão',
        'saudade': 'nostalgia',
        'felicidade': 'contentamento',
        'tristeza': 'melancolia',
        'raiva': 'cólera',
        'medo': 'temor',
        'amor': 'afeição',
        'odio': 'aversão',
        'paz': 'tranquilidade',
        'guerra': 'conflito',
        'vida': 'existência',
        'morte': 'óbito',
        'dia': 'jornada',
        'noite': 'período noturno',
        'sol': 'astro-rei',
        'lua': 'satélite natural',
        'estrela': 'corpo celeste',
        'ceu': 'firmamento',
        'terra': 'planeta',
        'agua': 'líquido',
        'fogo': 'chama',
        'ar': 'atmosfera',
        'vento': 'corrente de ar',
        'chuva': 'precipitação',
        'neve': 'precipitação sólida',
        'rio': "curso d'água",
        'mar': 'oceano',
        'lago': "espelho d'água",
        'montanha': 'elevação',
        'vale': 'depressão',
        'floresta': 'mata',
        'deserto': 'região árida',
        'cidade': 'município',
        'vila': 'povoado',
        'rua': 'logradouro',
        'avenida': 'via pública',
        'praca': 'logradouro público',
        'parque': 'área verde',
        'casa': 'residência',
        'apartamento': 'unidade habitacional',
        'predio': 'edifício',
        'escola': 'instituição de ensino',
        'hospital': 'unidade de saúde',
        'loja': 'estabelecimento comercial',
        'mercado': 'supermercado',
        'banco': 'instituição financeira',
        'igreja': 'templo religioso',
        'carro': 'automóvel',
        'moto': 'motocicleta',
        'onibus': 'ônibus',
        'trem': 'ferrovia',
        'aviao': 'aeronave',
        'navio': 'embarcação',
        'bicicleta': 'biciclo',
        'andar': 'caminhar',
        'correr': 'deslocar-se rapidamente',
        'pular': 'saltar',
        'nadar': 'flutuar',
        'voar': 'pairar',
        'comer': 'alimentar-se',
        'beber': 'ingerir',
        'dormir': 'repousar',
        'acordar': 'despertar',
        'sentar': 'assentar',
        'levantar': 'erguer-se',
        'ficar de pe': 'permanecer em pé',
        'cantar': 'entoar',
        'dancar': 'bailar',
        'tocar': 'manipular',
        'ouvir': 'escutar',
        'ver': 'observar',
        'cheirar': 'olfatear',
        'provar': 'degustar',
        'sentir': 'experimentar',
        'pensar': 'refletir',
        'estudar': 'aprender',
        'trabalhar': 'laborar',
        'descansar': 'repousar',
        'brincar': 'recrear-se',
        'rir': 'gargalhar',
        'chorar': 'prantear',
        'sorrir': 'exibir um sorriso',
        'gritar': 'bradear',
        'sussurrar': 'murmurar',
        'falar': 'dialogar',
        'escrever': 'redigir',
        'ler': 'decifrar',
        'desenhar': 'ilustrar',
        'pintar': 'colorir',
        'construir': 'edificar',
        'destruir': 'demolir',
        'abrir': 'desobstruir',
        'fechar': 'obstruir',
        'ligar': 'conectar',
        'desligar': 'desconectar',
        'limpar': 'higienizar',
        'sujar': 'contaminar',
        'secar': 'desidratar',
        'molhar': 'umedecer',
        'pra caramba': 'excessivamente',
        'tipo assim': 'por exemplo',
        'tá ligado': 'compreende',
        'e aí': 'olá',
        'valeu': 'obrigado',
        'demais': 'muito',
        'bagulho': 'situação',
        'treta': 'problema',
        'parada': 'situação',
        'rolê': 'evento',
        'mina': 'mulher',
        'cara': 'homem',
        'mano': 'amigo',
        'tipo': 'por exemplo',
        'da hora': 'excelente',
        'legal': 'interessante',
        'chato': 'aborrecido',
        'foda': 'difícil',
        'putz': 'lamentável',
        'poxa': 'lamentável',
        'aff': 'descontentamento',
        'kkk': 'risos',
        'rsrs': 'risos',
        'sqn': 'só que não',
        'top': 'excelente',
        'show': 'ótimo',
        'irado': 'excelente',
        'maneiro': 'interessante',
        'zoeira': 'brincadeira',
        'zuar': 'ridicularizar',
        'vacilo': 'erro',
        'dar mole': 'cometer um erro',
        'ficar de boa': 'permanecer tranquilo',
        'estar por dentro': 'estar informado',
        'estar por fora': 'estar desinformado',
        'meter o louco': 'agir irracionalmente',
        'pagar mico': 'passar vergonha',
        'pisar na bola': 'cometer um erro',
        'quebrar o galho': 'ajudar',
        'dar uma força': 'auxiliar',
        'ficar ligado': 'ficar atento',
        'ficar esperto': 'ficar atento',
        'pegar a visão': 'compreender',
        'tamo junto': 'estamos juntos',
        'é nós': 'somos nós',
        'partiu': 'vamos',
        'bora': 'vamos',
        'fui': 'vou',
        'vlw': 'valeu',
        'tmj': 'tamo junto'
    }

    # Aplicar mapeamento formal
    for informal, formal in mapeamento_formal.items():
        # Usar regex para substituir apenas palavras inteiras
        texto_lower = re.sub(r'\b' + re.escape(informal) + r'\b', formal, texto_lower)
    
    # Remover pontuação e tokenizar
    texto_limpo = re.sub(r'[^\w\s]', '', texto_lower)
    palavras = word_tokenize(texto_limpo, language='portuguese')
    
    # Remover stopwords
    palavras_filtradas = [word for word in palavras if word not in stop_words_pt]
    texto_processado = ' '.join(palavras_filtradas)

    # Identificar categoria
    categoria_identificada = 'outros' # Categoria padrão
    for cat, keywords in CATEGORIAS.items():
        if any(keyword in texto_lower for keyword in keywords):
            categoria_identificada = cat
            break
            
    # Identificar prioridade
    prioridade_identificada = 3 # Prioridade padrão (médio)
    if any(keyword in texto_lower for keyword in PRIORIDADES['urgente']):
        prioridade_identificada = 1
    elif any(keyword in texto_lower for keyword in PRIORIDADES['alto']):
        prioridade_identificada = 2
    elif any(keyword in texto_lower for keyword in PRIORIDADES['baixo']):
        prioridade_identificada = 4
            
    return {
        'texto_processado': texto_processado,
        'categoria': categoria_identificada,
        'prioridade': prioridade_identificada
    }

def validar_instagram_handle(handle):
    # Valida o formato de um handle do Instagram.
    # Um handle válido começa com '@', seguido por caracteres alfanuméricos, underscores ou pontos.
    # O comprimento total (incluindo '@') deve ser entre 2 e 31 caracteres.
    if not handle or not isinstance(handle, str):
        return False
    # Regex: ^@ - começa com @
    # [a-zA-Z0-9._] - permite letras, números, ponto e underscore
    # {1,30}$ - de 1 a 30 caracteres após o @ (total de 2 a 31 caracteres)
    instagram_regex = re.compile(r"^@[a-zA-Z0-9._]{1,30}$")
    return bool(instagram_regex.match(handle))

def mapear_para_regiao_administrativa(endereco, texto_original):
    # Lista de regiões administrativas conhecidas (exemplo)
    regioes_conhecidas = {
        "centro": ["centro", "praca da se", "republica"],
        "zona sul": ["zona sul", "ibirapuera", "moema", "brooklin"],
        "zona norte": ["zona norte", "santana", "tucuruvi", "casa verde"],
        "zona leste": ["zona leste", "itaquera", "tatuape", "penha"],
        "zona oeste": ["zona oeste", "pinheiros", "lapa", "butanta"]
    }

    search_text = f"{endereco.lower()} {texto_original.lower()}"

    for regiao, palavras_chave in regioes_conhecidas.items():
        if any(palavra in search_text for palavra in palavras_chave):
            return regiao
    return "outra" # Região padrão se nenhuma for identificada

def identificar_vereadores_por_regiao(regiao_identificada):
    vereadores_encontrados = []
    conn = None
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Busca vereadores pela região identificada
        cursor.execute("SELECT instagram_handle FROM vereadores WHERE regiao = ?", (regiao_identificada.title(),))
        
        # Filtra handles vazios e valida com a função placeholder
        vereadores_encontrados = [row[0] for row in cursor.fetchall() if row[0] and validar_instagram_handle(row[0])]
    except Exception as e:
        print(f"Erro ao buscar vereadores: {e}")
    finally:
        if conn:
            conn.close()
    return vereadores_encontrados

MAYOR_INSTAGRAM_HANDLE = '@prefeito_da_cidade' # Exemplo: Substitua pelo handle real do prefeito

# Lista fixa de vereadores para menção em todas as denúncias (para fins de teste)
FIXED_VEREADORES_HANDLES = ['@renatao_da_sao_pedro', '@vereadora_exemplo'] # Adicione os handles desejados aqui

def formatar_post_instagram(denuncia_data, vereadores_mencionados):
    texto_original = denuncia_data['texto_original']
    endereco = denuncia_data['endereco_denuncia']
    categoria = denuncia_data['categoria']
    prioridade = denuncia_data['prioridade']
    cep = denuncia_data['cep']

    # Formatar o texto do post
    post_text = f"Denúncia de CidadãoBot:\n\n"
    post_text += f"Problema: {texto_original}\n"
    post_text += f"Local: {endereco}\n"
    post_text += f"CEP: {cep}\n"
    post_text += f"Categoria: {categoria.capitalize()}\n"
    post_text += f"Prioridade: {prioridade}\n\n"

    # Adicionar menções aos vereadores
    if vereadores_mencionados:
        handles = ' '.join(vereadores_mencionados)
        post_text += f"Atenção: {handles}\n\n"

    # Adicionar menção ao prefeito
    if MAYOR_INSTAGRAM_HANDLE:
        post_text += f"Prefeito: {MAYOR_INSTAGRAM_HANDLE}\n\n"

    # Adicionar hashtags padronizadas (exemplo)
    post_text += f"#AgenteCidadao #DenunciaUrbana #{categoria.capitalize()} #CidadeMelhor"

    return post_text

def publicar_no_instagram(post_content, imagem_url=None):
    # Esta é uma função placeholder. Em uma implementação real, aqui seria a integração com a Instagram Graph API.
    print("\n--- SIMULANDO PUBLICAÇÃO NO INSTAGRAM ---")
    print("Conteúdo do Post:\n", post_content)
    if imagem_url:
        print("URL da Imagem:\n", imagem_url)
    print("----------------------------------------\n")
    return {'status': 'publicado_simulado', 'post_content': post_content}

def analisar_imagem_denuncia(imagem_url):
    # Esta é uma função placeholder para análise de imagem.
    # Em uma implementação real, um modelo de visão computacional seria usado aqui.
    # Por enquanto, simula a análise baseada em palavras-chave na URL da imagem.
    if imagem_url:
        imagem_url_lower = imagem_url.lower()
        if "buraco" in imagem_url_lower or "cratera" in imagem_url_lower:
            return "buraco"
        elif "lixo" in imagem_url_lower or "entulho" in imagem_url_lower:
            return "lixo"
        elif "iluminacao" in imagem_url_lower or "poste" in imagem_url_lower:
            return "iluminacao"
        elif "arvore" in imagem_url_lower or "galho" in imagem_url_lower:
            return "arvore"
        elif "agua" in imagem_url_lower or "vazamento" in imagem_url_lower:
            return "agua"
        elif "seguranca" in imagem_url_lower or "roubo" in imagem_url_lower:
            return "seguranca"
        elif "transito" in imagem_url_lower or "semaforo" in imagem_url_lower:
            return "transito"
        elif "calcada" in imagem_url_lower or "pedestre" in imagem_url_lower:
            return "calcada"
        elif "animal" in imagem_url_lower or "cachorro" in imagem_url_lower:
            return "animal"
        elif "barulho" in imagem_url_lower or "sonora" in imagem_url_lower:
            return "barulho"
        return "outros" # Categoria padrão se nenhuma palavra-chave for encontrada
    return None

def transcrever_audio(audio_url):
    # Esta é uma função placeholder para transcrição de áudio.
    # Em uma implementação real, uma API de transcrição de áudio seria usada aqui.
    # Por enquanto, retorna um texto simulado ou uma mensagem de erro.
    if audio_url:
        return "[Áudio Transcrito: Esta é uma denúncia de teste via áudio. A funcionalidade de transcrição real ainda não está implementada.]"
    return ""

def monitorar_engajamento_instagram(denuncia_id, post_content):
    # Esta é uma função placeholder para monitoramento de engajamento.
    # Em uma implementação real, aqui seria a integração com a Instagram Graph API
    # para obter métricas de engajamento (curtidas, comentários, etc.).
    # Seria necessário autenticação, tratamento de tokens e chamadas à API do Instagram.
    print(f"\n--- SIMULANDO MONITORAMENTO DE ENGAJAMENTO PARA DENÚNCIA {denuncia_id} ---")
    print(f"Conteúdo do Post: {post_content[:50]}...")
    
    # Simulação de engajamento variado
    curtidas_simuladas = 10 + (denuncia_id % 5)
    comentarios_simulados = 2 + (denuncia_id % 3)
    
    print(f"Engajamento simulado: {curtidas_simuladas} curtidas, {comentarios_simulados} comentários.")
    print("----------------------------------------------------\n")
    return {'status': 'monitorado_simulado', 'curtidas': curtidas_simuladas, 'comentarios': comentarios_simulados}

@app.route('/')
def home():
    return "Agente Cidadão Bot - Backend"

# Rota para receber denúncias
@app.route('/denuncia', methods=['POST'])
def receber_denuncia():
    data = request.json
    usuario_whatsapp = data.get('usuario_whatsapp')
    texto_original = data.get('texto_original')
    imagem_url = data.get('imagem_url')
    endereco_denuncia = data.get('endereco_denuncia')
    
    if not usuario_whatsapp or not texto_original:
        return jsonify({'error': 'Dados incompletos para a denúncia (usuário ou texto).', 'action': 'request_info'}), 400
    
    if len(texto_original) < 10:
        return jsonify({'error': 'A descrição da denúncia é muito curta. Por favor, forneça mais detalhes (mínimo 10 caracteres).', 'action': 'request_info'}), 400

    if not endereco_denuncia or len(endereco_denuncia) < 5:
        return jsonify({'error': 'Por favor, forneça o endereço ou localização da denúncia com mais detalhes (mínimo 5 caracteres).', 'action': 'request_address'}), 400
    
    cep = data.get('cep')
    audio_url = data.get('audio_url')

    # Se houver áudio, transcrever e adicionar ao texto original
    if audio_url:
        transcricao = transcrever_audio(audio_url)
        if texto_original:
            texto_original += "\n\n" + transcricao
        else:
            texto_original = transcricao

    if not cep:
        return jsonify({'error': 'Por favor, forneça o CEP da denúncia para que possamos encaminhá-la corretamente.', 'action': 'request_cep'}), 400

    # Verificar conteúdo inadequado
    if detectar_conteudo_inadequado(texto_original):
        return jsonify({'error': 'Conteúdo da denúncia considerado inadequado.'}), 400

    # Verificar fake news
    if verificar_denuncia_fake_news(texto_original):
        return jsonify({'error': 'Denúncia considerada como possível fake news e não será processada.'}), 400

    # Processar o texto da denúncia
    processamento_resultado = processar_texto_denuncia(texto_original)
    texto_processado = processamento_resultado['texto_processado']
    categoria = processamento_resultado['categoria']
    prioridade = processamento_resultado['prioridade']

    # Analisar imagem se houver e ajustar a categoria, se aplicável
    if imagem_url:
        categoria_imagem = analisar_imagem_denuncia(imagem_url)
        if categoria_imagem and categoria == 'outros': # Se a categoria do texto for genérica, usa a da imagem
            categoria = categoria_imagem
    
    try:
        # Usar a lista fixa de vereadores para menção (para fins de teste)
        vereadores_mencionados = FIXED_VEREADORES_HANDLES
        vereadores_str = ', '.join(vereadores_mencionados) if vereadores_mencionados else ''
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO denuncias (
                usuario_whatsapp, texto_original, texto_processado, imagem_url, endereco_denuncia, categoria,
                prioridade, tipo_publicacao, status, vereadores_mencionados, cep
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (usuario_whatsapp, texto_original, texto_processado, imagem_url, endereco_denuncia, categoria,
              prioridade, 'post', 'recebida', vereadores_str, cep))
        conn.commit()
        denuncia_id = cursor.lastrowid
        conn.close()
        
        # Preparar dados para o post do Instagram
        denuncia_data_for_post = {
            'id': denuncia_id,
            'usuario_whatsapp': usuario_whatsapp,
            'texto_original': texto_original,
            'endereco_denuncia': endereco_denuncia,
            'categoria': categoria,
            'prioridade': prioridade,
            'imagem_url': imagem_url,
            'cep': cep
        }
        
        # Determinar tipo de publicação e adicionar à fila
        tipo_publicacao = 'post'
        if prioridade == 1: # Denúncias urgentes podem ser stories
            tipo_publicacao = 'story'
            
        denuncia_data_for_post['tipo_publicacao'] = tipo_publicacao
        fila_denuncias.append(denuncia_data_for_post)
        
        # Ordenar a fila por prioridade (menor número = maior prioridade)
        fila_denuncias.sort(key=lambda x: x['prioridade'])
        
        return jsonify({'message': 'Denúncia recebida e adicionada à fila de publicação!', 'id': denuncia_id,
                        'vereadores_mencionados': vereadores_mencionados,
                        'tipo_agendado': tipo_publicacao}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# Rota para processar a fila de publicações (deve ser chamada periodicamente por um agendador)
@app.route('/processar_fila_publicacao', methods=['POST'])
def processar_fila_publicacao():
    global posts_hoje, stories_hoje, fila_denuncias
    publicacoes_realizadas = [] 
    denuncias_puladas_por_limite = False # New flag

    # Criar uma cópia da fila para iterar, pois a fila original será modificada
    fila_para_processar = sorted(fila_denuncias, key=lambda x: x['prioridade'])
    
    for denuncia in fila_para_processar:
        tipo_publicacao = denuncia['tipo_publicacao']
        
        pode_publicar = False
        current_hour = datetime.now().hour

        if tipo_publicacao == 'post':
            # Horários estratégicos para posts: 8h e 18h
            if posts_hoje < MAX_POSTS_DIA and current_hour in STRATEGIC_POST_HOURS:
                pode_publicar = True
                posts_hoje += 1
        elif tipo_publicacao == 'story':
            # Stories podem ser publicados a qualquer hora, respeitando o limite diário
            if stories_hoje < MAX_STORIES_DIA:
                pode_publicar = True
                stories_hoje += 1
            
        if pode_publicar:
            # Remover a denúncia da fila original
            fila_denuncias.remove(denuncia)
            
            # Formatar o post do Instagram
            regiao_identificada_para_fila = mapear_para_regiao_administrativa(denuncia['endereco_denuncia'], denuncia['texto_original'])
            vereadores = identificar_vereadores_por_regiao(regiao_identificada_para_fila)
            post_instagram_content = formatar_post_instagram(denuncia, vereadores)
            
            # Simular a publicação no Instagram
            publicacao_resultado = publicar_no_instagram(post_instagram_content, denuncia['imagem_url'])
            
            publicacoes_realizadas.append({
                'id': denuncia['id'],
                'tipo': tipo_publicacao,
                'status': publicacao_resultado['status'],
                'conteudo_simulado': publicacao_resultado['post_content']
            })
        else:
            # Se não pode publicar, as denúncias restantes na fila (que têm menor prioridade ou são do mesmo tipo) também não poderão
            # Adicionar à lista de publicações não realizadas com o motivo
            denuncias_puladas_por_limite = True # Set flag
            for remaining_denuncia in fila_para_processar[fila_para_processar.index(denuncia):]:
                publicacoes_realizadas.append({
                    'id': remaining_denuncia['id'],
                    'tipo': remaining_denuncia['tipo_publicacao'],
                    'status': 'nao_publicado',
                    'motivo': 'limite_diario_atingido'
                })
            break
            
    message = 'Processamento da fila concluído.'
    if denuncias_puladas_por_limite:
        message = 'Processamento da fila concluído. Algumas denúncias foram agendadas para o próximo dia devido a limites de publicação.'

    return jsonify({
        'message': message,
        'publicacoes_realizadas': publicacoes_realizadas,
        'posts_hoje': posts_hoje,
        'stories_hoje': stories_hoje,
        'fila_restante': len(fila_denuncias)
    }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
