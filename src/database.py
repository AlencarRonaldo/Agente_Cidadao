import sqlite3

DATABASE_PATH = 'D:/Agente_Cidadao/data/agente_cidadao.db'

def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Tabela de denúncias
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS denuncias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_whatsapp TEXT,
            texto_original TEXT,
            texto_processado TEXT,
            imagem_url TEXT,
            endereco_denuncia TEXT,
            categoria TEXT,
            prioridade INTEGER DEFAULT 3,
            tipo_publicacao TEXT DEFAULT 'post',
            status TEXT,
            agendado_para TIMESTAMP,
            publicado_em TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            vereadores_mencionados TEXT
        )
    """)

    # Adicionar coluna vereadores_mencionados se não existir
    cursor.execute("""
        PRAGMA table_info(denuncias);
    """)
    columns = [col[1] for col in cursor.fetchall()]
    if 'vereadores_mencionados' not in columns:
        cursor.execute("""
            ALTER TABLE denuncias ADD COLUMN vereadores_mencionados TEXT;
        """)

    # Tabela de vereadores
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vereadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            regiao TEXT NOT NULL,
            instagram_handle TEXT
        )
    """)

    conn.commit()

    # Inserir dados de exemplo na tabela vereadores (se não existirem)
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador A', 'Centro', '@vereador_a'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereadora B', 'Zona Sul', '@vereadora_b'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador C', 'Zona Norte', '@vereador_c'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereadora D', 'Zona Leste', '@vereadora_d'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador E', 'Zona Oeste', '@vereador_e'))
    conn.commit()
    conn.close()
    print("Banco de dados inicializado com sucesso em:", DATABASE_PATH)

if __name__ == '__main__':
    init_db()
