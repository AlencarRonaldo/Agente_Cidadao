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
        'molhar': 'umedecer'
    }

    # Aplicar mapeamento formal
    for informal, formal in mapeamento_formal.items():
        texto_lower = texto_lower.replace(informal, formal)
    
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

def identificar_vereadores_por_regiao(endereco):
    vereadores_encontrados = []
    conn = None
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        # Simplificação: busca por correspondência exata ou parcial no endereço
        # Em um cenário real, isso seria mais robusto (geocoding, etc.)
        cursor.execute("SELECT instagram_handle FROM vereadores WHERE ? LIKE '%' || regiao || '%'", (endereco,))
        vereadores_encontrados = [row[0] for row in cursor.fetchall() if row[0]] # Filtra handles vazios
    except Exception as e:
        print(f"Erro ao buscar vereadores: {e}")
    finally:
        if conn:
            conn.close()
    return vereadores_encontrados

def formatar_post_instagram(denuncia_data, vereadores_mencionados):
    texto_original = denuncia_data['texto_original']
    endereco = denuncia_data['endereco_denuncia']
    categoria = denuncia_data['categoria']
    prioridade = denuncia_data['prioridade']

    # Formatar o texto do post
    post_text = f"Denúncia de CidadãoBot:\n\n"
    post_text += f"Problema: {texto_original}\n"
    post_text += f"Local: {endereco}\n"
    post_text += f"Categoria: {categoria.capitalize()}\n"
    post_text += f"Prioridade: {prioridade}\n\n"

    # Adicionar menções aos vereadores
    if vereadores_mencionados:
        handles = ' '.join(vereadores_mencionados)
        post_text += f"Atenção: {handles}\n\n"

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
    
    if not usuario_whatsapp or not texto_original or not endereco_denuncia: 
        return jsonify({'error': 'Dados incompletos para a denúncia.'}), 400
    
    # Processar o texto da denúncia
    processamento_resultado = processar_texto_denuncia(texto_original)
    texto_processado = processamento_resultado['texto_processado']
    categoria = processamento_resultado['categoria']
    prioridade = processamento_resultado['prioridade']
    
    try:
        # Identificar vereadores
        vereadores_mencionados = identificar_vereadores_por_regiao(endereco_denuncia)
        vereadores_str = ', '.join(vereadores_mencionados) if vereadores_mencionados else ''
        
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO denuncias (
                usuario_whatsapp, texto_original, texto_processado, imagem_url, endereco_denuncia, categoria,
                prioridade, tipo_publicacao, status, vereadores_mencionados
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (usuario_whatsapp, texto_original, texto_processado, imagem_url, endereco_denuncia, categoria,
              prioridade, 'post', 'recebida', vereadores_str))
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
            'imagem_url': imagem_url
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

    # Criar uma cópia da fila para iterar, pois a fila original será modificada
    fila_para_processar = sorted(fila_denuncias, key=lambda x: x['prioridade'])
    
    for denuncia in fila_para_processar:
        tipo_publicacao = denuncia['tipo_publicacao']
        
        pode_publicar = False
        if tipo_publicacao == 'post' and posts_hoje < MAX_POSTS_DIA:
            pode_publicar = True
            posts_hoje += 1
        elif tipo_publicacao == 'story' and stories_hoje < MAX_STORIES_DIA:
            pode_publicar = True
            stories_hoje += 1
            
        if pode_publicar:
            # Remover a denúncia da fila original
            fila_denuncias.remove(denuncia)
            
            # Formatar o post do Instagram
            vereadores = identificar_vereadores_por_regiao(denuncia['endereco_denuncia'])
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
            break
            
    return jsonify({
        'message': 'Processamento da fila concluído.',
        'publicacoes_realizadas': publicacoes_realizadas,
        'posts_hoje': posts_hoje,
        'stories_hoje': stories_hoje,
        'fila_restante': len(fila_denuncias)
    }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
