@echo off
setlocal
cd /d "%~dp0"
echo Ferme d'abord la fenetre noire de LANCER.cmd. Tes choix seront conserves.
pause
set NODE_USE_ENV_PROXY=1
node update.mjs
if errorlevel 1 echo Mise a jour echouee. Garde cette fenetre pour lire le message.
pause
