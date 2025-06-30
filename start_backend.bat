@echo off
REM Muda o diretório para a pasta 'src' localizada no mesmo diretório do script.
REM %~dp0 expande para o caminho do script (ex: D:\Agente_Cidadao\)
cd /d %~dp0src
python app.py
PAUSE