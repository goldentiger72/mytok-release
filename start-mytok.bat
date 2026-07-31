@echo off
echo [MyTok] Stopping existing processes...
REM 브리지 자동 재시작 래퍼를 bun.exe 종료보다 먼저 정리 (재기동 경합 방지)
taskkill /F /FI "WINDOWTITLE eq MyTok OpenClaw Bridge*" >nul 2>nul
taskkill /F /IM bun.exe 2>nul
taskkill /F /IM cloudflared.exe 2>nul
timeout /t 2 /nobreak >nul

echo [MyTok] Starting Cloudflare tunnel...
start "" /B "C:\Users\fundo\bin\cloudflared.exe" tunnel --config C:\Users\fundo\.cloudflared\mytok-config.yml run
timeout /t 2 /nobreak >nul
echo [MyTok] Cloudflare tunnel started.

echo [MyTok] Starting OpenClaw bridge (auto-restart)...
start "MyTok OpenClaw Bridge" /MIN cmd /c "D:\ProjectSource\20-dev\MyTok\bridges\start-openclaw-bridge.bat"

echo [MyTok] Starting Claude Code bridge...
start "MyTok Claude Code Bridge" /MIN cmd /c "node D:\ProjectSource\20-dev\MyTok\bridges\bridge-claude-code.js"

echo [MyTok] Starting Bun server...
cd /d D:\ProjectSource\20-dev\MyTok\backend
bun src/server.js
