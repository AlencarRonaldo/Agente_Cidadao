
    1 import nltk
    2 import os
    3 import sys
    4 import traceback
    5 
    6 # Adicionar o caminho para os dados do NLTK, assim como no 
      seu app.py
    7 nltk_data_path = 'D:/Agente_Cidadao/data/nltk_data'
    8 if nltk_data_path not in nltk.data.path:
    9     nltk.data.path.append(nltk_data_path)
   10 
   11 print("--- Diagnóstico NLTK ---")
   12 print(f"Caminhos de dados do NLTK configurados: 
      {nltk.data.path}")
   13 
   14 punkt_dir = os.path.join(nltk_data_path, 'tokenizers',
      'punkt')
   15 print(f"Verificando conteúdo de: {punkt_dir}")
   16 if os.path.exists(punkt_dir):
   17     try:
   18         print(f"Conteúdo de {punkt_dir}: 
      {os.listdir(punkt_dir)}")
   19     except Exception as e:
   20         print(f"Erro ao listar conteúdo de {punkt_dir}: {e}"
      )
   21 else:
   22     print(f"Diretório {punkt_dir} não encontrado.")
   23 
   24 test_text = "Este é um texto de teste para tokenização."
   25 
   26 try:
   27     print(f"\nTentando tokenizar: \"{test_text}\"")
   28     # Tentar usar word_tokenize, que depende do recurso 
      'punkt'
   29     words = nltk.word_tokenize(test_text, language=
      'portuguese')
   30     print("Tokenização bem-sucedida:", words)
   31 except LookupError as e:
   32     print(f"\nErro: LookupError - {e}")
   33     print("\n--- Traceback Completo ---")
   34     traceback.print_exc(file=sys.stdout)
   35     print("--- Fim do Traceback ---")
   36 except Exception as e:
   37     print(f"\nOcorreu um erro inesperado: {e}")
   38     print("\n--- Traceback Completo ---")
   39     traceback.print_exc(file=sys.stdout)
   40     print("--- Fim do Traceback ---")
   41 
   42 print("\n--- Fim do Diagnóstico ---")
   