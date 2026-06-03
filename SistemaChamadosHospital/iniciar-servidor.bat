@echo off
title Chamados TI - Generico
cd /d "%~dp0"
echo.
echo Servidor de chamados iniciado.
echo.
echo Para abrir neste computador:
echo   http://localhost:8765/index.html
echo   http://localhost:8765/painel.html
echo.
echo Para outros computadores da rede, use o IP deste computador.
echo Exemplo:
echo   http://192.168.1.50:8765/index.html
echo   http://192.168.1.50:8765/painel.html
echo.
echo Para descobrir o IP, abra outro Prompt/PowerShell e rode:
echo   ipconfig
echo.
node server.js
pause
