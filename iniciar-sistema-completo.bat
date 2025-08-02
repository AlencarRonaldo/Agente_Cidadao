@echo off
echo ===================================================
echo         INICIANDO SISTEMA COMPLETO BOT DENUNCIA
echo ===================================================
echo.

REM Definir cores para melhor visualização
color 0A

REM Verificar se Redis está instalado e rodando
echo [1/5] Verificando Redis...

REM Tentar encontrar Redis no PATH
where redis-cli >nul 2>&1
if %errorlevel% neq 0 (
    echo    [!] Redis nao encontrado no PATH do sistema.
    echo    [!] Opcoes:
    echo        1. Instale o Redis para Windows: https://github.com/tporadowski/redis/releases
    echo        2. Use Docker: docker run -d -p 6379:6379 redis
    echo        3. Use WSL: wsl sudo service redis-server start
    echo.
    echo    [!] Continuando sem Redis - algumas funcionalidades podem nao funcionar
    echo.
) else (
    redis-cli ping >nul 2>&1
    if %errorlevel% neq 0 (
        echo    [!] Redis instalado mas nao esta rodando.
        
        REM Tentar iniciar Redis de diferentes formas
        REM Opcao 1: Tentar redis-server direto
        where redis-server >nul 2>&1
        if %errorlevel% equ 0 (
            echo    [*] Tentando iniciar Redis...
            start "Redis Server" redis-server
            timeout /t 3 /nobreak >nul
        ) else (
            REM Opcao 2: Tentar como servico Windows
            sc query Redis >nul 2>&1
            if %errorlevel% equ 0 (
                echo    [*] Tentando iniciar servico Redis...
                net start Redis >nul 2>&1
                timeout /t 3 /nobreak >nul
            ) else (
                echo    [!] Nao foi possivel iniciar o Redis automaticamente.
                echo    [!] Inicie manualmente antes de continuar.
            )
        )
    ) else (
        echo    [OK] Redis ja esta rodando
    )
)

REM Verificar se MySQL está rodando
echo [2/5] Verificando MySQL...
sc query mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo    [!] MySQL nao esta rodando. Tente iniciar manualmente.
) else (
    echo    [OK] MySQL esta rodando
)

REM Navegar para a pasta do projeto
cd /d E:\SITES\bot_agente\bot-denuncia

REM Iniciar Backend Principal (API)
echo [3/5] Iniciando Backend API (porta 3355)...
start "Backend API - Bot Denuncia" cmd /k "npm start"
timeout /t 5 /nobreak >nul

REM Iniciar Workers (Processamento de Filas)
echo [4/5] Iniciando Workers (Processamento de Filas)...
start "Workers - Bot Denuncia" cmd /k "npm run workers"
timeout /t 3 /nobreak >nul

REM Iniciar Frontend Admin Panel
echo [5/5] Iniciando Painel Administrativo (porta 3007)...
cd admin-panel
start "Admin Panel - Bot Denuncia" cmd /k "npm start"

REM Voltar para a pasta raiz
cd ..

echo.
echo ===================================================
echo           TODOS OS SERVICOS FORAM INICIADOS!
echo ===================================================
echo.
echo Servicos em execucao:
echo   - Redis (Cache e Filas)
echo   - MySQL (Banco de Dados)
echo   - Backend API: http://localhost:3355
echo   - Workers (Processamento em Background)
echo   - Admin Panel: http://localhost:3007
echo.
echo Para parar todos os servicos, feche as janelas ou use parar-tudo.bat
echo.
pause