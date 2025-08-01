@echo off
echo 🔧 Configurando ambiente para WhatsApp Bot - Correção Chrome/Puppeteer

REM Definir variáveis de ambiente para Puppeteer
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

REM Verificar se Chrome está instalado
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo ✅ Chrome encontrado: C:\Program Files\Google\Chrome\Application\chrome.exe
    set PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
) else (
    REM Tentar caminho alternativo
    if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
        echo ✅ Chrome encontrado: C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
        set PUPPETEER_EXECUTABLE_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
        set CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
    ) else (
        echo ❌ Chrome não encontrado! Instalando via Chocolatey...
        
        REM Verificar se Chocolatey está instalado
        choco -v >nul 2>&1
        if errorlevel 1 (
            echo 📦 Instalando Chocolatey...
            powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
        )
        
        REM Instalar Chrome
        echo 🌐 Instalando Google Chrome...
        choco install googlechrome -y
        
        REM Definir caminho após instalação
        set PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
        set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
    )
)

REM Matar processos órfãos do Chrome
echo 🧹 Limpando processos órfãos...
taskkill /f /im chrome.exe /t >nul 2>&1
taskkill /f /im chromedriver.exe /t >nul 2>&1

REM Verificar Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado! Instale Node.js primeiro.
    pause
    exit /b 1
)

echo 🚀 Ambiente configurado! Iniciando WhatsApp Bot...
echo.
echo 📋 Configurações aplicadas:
echo    - CHROME_PATH: %CHROME_PATH%
echo    - PUPPETEER_EXECUTABLE_PATH: %PUPPETEER_EXECUTABLE_PATH%
echo    - PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: %PUPPETEER_SKIP_CHROMIUM_DOWNLOAD%
echo.

REM Iniciar o bot
npm start

pause