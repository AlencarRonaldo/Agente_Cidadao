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
            vereadores_mencionados TEXT,
            cep TEXT
        )
    """
    )

    # Adicionar coluna vereadores_mencionados se não existir
    cursor.execute("""
        PRAGMA table_info(denuncias);
    """)
    columns = [col[1] for col in cursor.fetchall()]
    if 'vereadores_mencionados' not in columns:
        cursor.execute("""
            ALTER TABLE denuncias ADD COLUMN vereadores_mencionados TEXT;
        """)

    # Adicionar coluna cep se não existir
    cursor.execute("""
        PRAGMA table_info(denuncias);
    """)
    columns = [col[1] for col in cursor.fetchall()]
    if 'cep' not in columns:
        cursor.execute("""
            ALTER TABLE denuncias ADD COLUMN cep TEXT;
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
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador F', 'Centro', '@vereador_f'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereadora G', 'Zona Sul', '@vereadora_g'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador H', 'Zona Norte', '@vereador_h'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereadora I', 'Zona Leste', '@vereadora_i'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador J', 'Zona Oeste', '@vereador_j'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador K', 'Centro', '@vereador_k'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereadora L', 'Zona Sul', '@vereadora_l'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador M', 'Zona Norte', '@vereador_m'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereadora N', 'Zona Leste', '@vereadora_n'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador O', 'Zona Oeste', '@vereador_o'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador P', 'Centro', '@vereador_p'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereadora Q', 'Zona Sul', '@vereadora_q'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador R', 'Zona Norte', '@vereador_r'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereadora S', 'Zona Leste', '@vereadora_s'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador T', 'Zona Oeste', '@vereador_t'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador U', 'Centro', '@vereador_u'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereadora V', 'Zona Sul', '@vereadora_v'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador W', 'Zona Norte', '@vereador_w'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereadora X', 'Zona Leste', '@vereadora_x'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereador Y', 'Zona Oeste', '@vereador_y'))
    cursor.execute("INSERT OR IGNORE INTO vereadores (nome, regiao, instagram_handle) VALUES (?, ?, ?)", ('Vereadora Z', 'Centro', '@vereadora_z'))
    conn.commit()
    conn.close()
    print("Banco de dados inicializado com sucesso em:", DATABASE_PATH)

if __name__ == '__main__':
    init_db()
