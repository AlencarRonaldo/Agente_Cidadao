@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo Bot-Denuncia Safe Startup Script
echo ==========================================
echo.

REM Check if port 3355 is in use
echo Checking port 3355...
netstat -ano | findstr ":3355" >nul

if %ERRORLEVEL%==0 (
    echo ⚠️ Port 3355 is currently in use
    echo.
    
    REM Get process information
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":3355"') do (
        set PID=%%i
        goto CHECK_PROCESS
    )
    
    :CHECK_PROCESS
    echo Process using port 3355:
    tasklist | findstr "!PID!"
    echo.
    
    REM Check if it's a Node.js process (likely another instance)
    tasklist | findstr "!PID!" | findstr "node.exe" >nul
    if !ERRORLEVEL!==0 (
        echo 🤔 Detected Node.js process. This might be another instance of the bot.
        echo.
        set /p KILL_NODE="Do you want to kill the Node.js process and start fresh? (y/N): "
        
        if /i "!KILL_NODE!"=="y" (
            echo Killing Node.js process !PID!...
            taskkill /PID !PID! /F
            
            REM Wait for process to terminate
            timeout /t 3 >nul
            
            echo Rechecking port 3355...
            netstat -ano | findstr ":3355" >nul
            if !ERRORLEVEL!==0 (
                echo ❌ Port still in use. Manual intervention required.
                pause
                exit /b 1
            ) else (
                echo ✅ Port 3355 is now available
            )
        ) else (
            echo The application will attempt to find an alternative port...
        )
    ) else (
        echo ⚠️ Non-Node.js process detected. The application will find an alternative port.
    )
    echo.
) else (
    echo ✅ Port 3355 is available
    echo.
)

echo Starting bot-denuncia application...
echo.

REM Change to the project directory
cd /d "%~dp0.."

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if !ERRORLEVEL! neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the application
echo 🚀 Starting application...
node src/index.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Application failed to start
    echo Check the logs above for error details
    pause
)

echo.
echo Application stopped.
pause