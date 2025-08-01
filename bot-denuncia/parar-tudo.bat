@echo off
echo Parando todos os processos Node.js...
taskkill /F /IM node.exe /T 2>nul
echo.
echo Todos os processos Node.js foram parados!
echo.
pause