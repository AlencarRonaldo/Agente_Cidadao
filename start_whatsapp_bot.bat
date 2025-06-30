@echo off
REM Muda o diretório para a pasta 'whatsapp_bot' localizada no mesmo diretório do script.
REM %~dp0 expande para o caminho do script (ex: D:\Agente_Cidadao\)
cd /d %~dp0whatsapp_bot
node index.js
PAUSE