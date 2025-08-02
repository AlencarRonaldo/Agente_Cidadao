# Como Instalar Redis no Windows

O Redis é necessário para o funcionamento das filas e cache do sistema Bot Denúncia.

## Opção 1: Redis Nativo para Windows (Recomendado)

1. Baixe a versão mais recente do Redis para Windows:
   - https://github.com/tporadowski/redis/releases
   - Escolha o arquivo `.msi` (ex: `Redis-x64-5.0.14.1.msi`)

2. Execute o instalador:
   - Aceite os termos
   - Escolha instalar como serviço Windows
   - Use a porta padrão 6379

3. Após instalação, o Redis iniciará automaticamente

## Opção 2: Usando Docker

Se você tem Docker instalado:

```bash
# Baixar e executar Redis
docker run -d --name redis-bot -p 6379:6379 redis

# Para parar
docker stop redis-bot

# Para iniciar novamente
docker start redis-bot
```

## Opção 3: Usando WSL (Windows Subsystem for Linux)

1. Instale WSL se ainda não tiver:
   ```powershell
   wsl --install
   ```

2. No terminal WSL:
   ```bash
   # Instalar Redis
   sudo apt update
   sudo apt install redis-server

   # Iniciar Redis
   sudo service redis-server start
   ```

## Verificar se Redis está funcionando

Abra um terminal e execute:
```bash
redis-cli ping
```

Se retornar `PONG`, o Redis está funcionando!

## Configuração para o Bot Denúncia

O sistema usa as configurações padrão do Redis:
- Host: localhost
- Porta: 6379
- Sem senha (desenvolvimento local)

Para produção, configure senha no arquivo `redis.conf`.