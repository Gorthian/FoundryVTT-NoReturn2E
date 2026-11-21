@echo off
rem Baut die Compendien lokal: packs-src\*.json -> packs\ (LevelDB) mit dem Foundry-CLI.
rem Voraussetzung: Node.js 20+. Foundry sollte beim Bauen geschlossen sein, falls das System dort installiert ist.
rem Optional: "python tools\build_sources.py" erzeugt zuvor packs-src neu aus den Python-Quelldaten (tools\src).
cd /d "%~dp0\.."
if not exist node_modules call npm install || exit /b 1
call npm run build || exit /b 1
