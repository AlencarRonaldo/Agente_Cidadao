@echo off
setlocal

REM Script to check and manage port usage for bot-denuncia
REM Usage: check-port.bat [port] [action]
REM   port: port number to check (default: 3355)
REM   action: check|kill|report (default: check)

set "DEFAULT_PORT=3355"
set "PORT=%~1"
set "ACTION=%~2"

if "%PORT%"=="" set "PORT=%DEFAULT_PORT%"
if "%ACTION%"=="" set "ACTION=check"

echo ==========================================
echo Bot-Denuncia Port Management Tool
echo ==========================================
echo Port: %PORT%
echo Action: %ACTION%
echo.

if "%ACTION%"=="check" goto CHECK_PORT
if "%ACTION%"=="kill" goto KILL_PROCESS
if "%ACTION%"=="report" goto GENERATE_REPORT
goto SHOW_HELP

:CHECK_PORT
echo Checking port %PORT%...
echo.

netstat -ano | findstr ":%PORT%" >nul
if %ERRORLEVEL%==0 (
    echo ❌ Port %PORT% is in use:
    echo.
    for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":%PORT%"') do (
        set PID=%%i
        goto GET_PROCESS_INFO
    )
) else (
    echo ✅ Port %PORT% is available
    goto END
)

:GET_PROCESS_INFO
echo Process Details:
tasklist | findstr "%PID%"
echo.
echo Full netstat output:
netstat -ano | findstr ":%PORT%"
echo.
echo To kill this process, run: check-port.bat %PORT% kill
goto END

:KILL_PROCESS
echo Attempting to kill process using port %PORT%...
echo.

for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":%PORT%"') do (
    set PID=%%i
    goto KILL_PID
)

echo No process found using port %PORT%
goto END

:KILL_PID
echo Found PID: %PID%
tasklist | findstr "%PID%"
echo.

set /p CONFIRM="Are you sure you want to kill this process? (y/N): "
if /i "%CONFIRM%"=="y" (
    echo Killing process %PID%...
    taskkill /PID %PID%
    if %ERRORLEVEL%==0 (
        echo ✅ Process killed successfully
        timeout /t 2 >nul
        echo Rechecking port %PORT%...
        netstat -ano | findstr ":%PORT%" >nul
        if %ERRORLEVEL%==0 (
            echo ⚠️ Port still in use
        ) else (
            echo ✅ Port %PORT% is now available
        )
    ) else (
        echo ❌ Failed to kill process. Try running as administrator.
    )
) else (
    echo Operation cancelled.
)
goto END

:GENERATE_REPORT
echo Generating port usage report...
echo.
echo Common ports used by bot-denuncia system:
echo.

set "PORTS=3355 3356 3357 3358 3359 5432 6379"

for %%p in (%PORTS%) do (
    echo Checking port %%p...
    netstat -ano | findstr ":%%p" >nul
    if !ERRORLEVEL!==0 (
        echo   Port %%p: IN USE
        for /f "tokens=5" %%i in ('netstat -ano ^| findstr ":%%p"') do (
            for /f "tokens=1" %%j in ('tasklist ^| findstr "%%i"') do (
                echo     Process: %%j ^(PID: %%i^)
            )
        )
    ) else (
        echo   Port %%p: AVAILABLE
    )
    echo.
)
goto END

:SHOW_HELP
echo Usage: check-port.bat [port] [action]
echo.
echo Arguments:
echo   port     Port number to check (default: 3355)
echo   action   Action to perform:
echo            - check   : Check if port is in use (default)
echo            - kill    : Kill process using the port
echo            - report  : Generate report of common ports
echo.
echo Examples:
echo   check-port.bat              (check port 3355)
echo   check-port.bat 3356         (check port 3356)
echo   check-port.bat 3355 kill    (kill process using port 3355)
echo   check-port.bat 3355 report  (generate port usage report)
goto END

:END
echo.
echo Script completed.
pause