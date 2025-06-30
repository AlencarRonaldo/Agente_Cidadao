import nltk
import os
import ssl
from pathlib import Path
from urllib.error import URLError

def setup_nltk_data():
    """
    Verifica e baixa os pacotes necessários do NLTK para um diretório local do projeto,
    com tratamento de erros aprimorado.
    """
    # Constrói o caminho para o diretório de dados do NLTK de forma dinâmica
    project_root = Path(__file__).parent
    nltk_data_path = project_root / 'data' / 'nltk_data'

    print(f"Diretório de dados do NLTK será: {nltk_data_path}")

    # Garante que o diretório de destino exista
    try:
        os.makedirs(nltk_data_path, exist_ok=True)
        print(f"Diretório '{nltk_data_path}' verificado/criado com sucesso.")
    except OSError as e:
        print(f"ERRO: Não foi possível criar o diretório '{nltk_data_path}'.")
        print(f"Detalhe do erro: {e}")
        print("Por favor, verifique as permissões de escrita na pasta do projeto.")
        return

    # Adiciona o caminho local ao path de busca do NLTK, se ainda não estiver lá
    if str(nltk_data_path) not in nltk.data.path:
        nltk.data.path.append(str(nltk_data_path))

    # --- Tratamento para problemas de certificado SSL ---
    # Este é um problema comum que impede o download.
    try:
        _create_unverified_https_context = ssl._create_unverified_context
    except AttributeError:
        pass  # A versão do Python pode não precisar disso
    else:
        ssl._create_default_https_context = _create_unverified_https_context
        print("\n[AVISO] Contexto SSL não verificado foi aplicado para o download do NLTK.")
        print("Isso é uma solução comum para erros de 'certificate verify failed'.")

    # Lista de pacotes necessários
    required_packages = {
        'punkt': 'tokenizers/punkt',
        'stopwords': 'corpora/stopwords'
    }

    print("\nIniciando verificação e download dos pacotes NLTK...")
    for package_id, path_check in required_packages.items():
        try:
            nltk.data.find(path_check)
            print(f"-> Pacote '{package_id}' já existe. Nenhuma ação necessária.")
        except LookupError:
            print(f"-> Pacote '{package_id}' não encontrado. Tentando baixar...")
            try:
                nltk.download(package_id, download_dir=str(nltk_data_path))
                print(f"   Download do pacote '{package_id}' concluído com sucesso.")
            except URLError as e:
                print(f"   ERRO DE REDE: Falha ao baixar o pacote '{package_id}'.")
                print(f"   Verifique sua conexão com a internet, firewall ou configurações de proxy.")
                print(f"   Detalhe do erro: {e}")
            except Exception as e:
                print(f"   ERRO INESPERADO: Falha ao baixar o pacote '{package_id}'.")
                print(f"   Detalhe do erro: {e}")

    print("\nConfiguração dos dados do NLTK concluída.")
    print("Verifique se os arquivos agora existem na pasta de destino.")

if __name__ == '__main__':
    setup_nltk_data()

