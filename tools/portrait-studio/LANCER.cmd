@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Installe Node.js 24 LTS depuis https://nodejs.org puis relance ce fichier.
  pause
  exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)" >nul 2>nul
if errorlevel 1 (
  echo Mets Node.js a jour vers la version 24 LTS depuis https://nodejs.org.
  pause
  exit /b 1
)
set NODE_USE_ENV_PROXY=1
node server.mjs --open
pause
