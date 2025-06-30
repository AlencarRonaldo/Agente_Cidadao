import sqlite3

DATABASE_PATH = 'D:/Agente_Cidadao/data/agente_cidadao.db'

conn = sqlite3.connect(DATABASE_PATH)
cursor = conn.cursor()
cursor.execute('SELECT * FROM denuncias ORDER BY id DESC LIMIT 1')
print(cursor.fetchone())
conn.close()