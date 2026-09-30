@echo off
rem Baut die Compendien neu: Python-Quellen -> JSON -> LevelDB (mit der Node-Laufzeit von Foundry).
cd /d "%~dp0\.."
python tools\build_sources.py || exit /b 1
set ELECTRON_RUN_AS_NODE=1
if "%FOUNDRY_EXE%"=="" set FOUNDRY_EXE=C:\Program Files\Foundry Virtual Tabletop\Foundry Virtual Tabletop.exe
"%FOUNDRY_EXE%" tools\build-packs.mjs
