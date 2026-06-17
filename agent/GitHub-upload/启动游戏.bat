@echo off
setlocal
cd /d "%~dp0"

set "GAME_DIR=%~dp0"
set "BACKEND_DIR=%~dp0..\michangsheng-backend"

echo Starting backend API...
if not exist "%BACKEND_DIR%\backend-node.mjs" goto no_backend

where python >nul 2>nul
if errorlevel 1 goto start_node_backend

if not exist "%BACKEND_DIR%\main.py" goto start_node_backend
start "MCS Backend API" /D "%BACKEND_DIR%" cmd /k python -m pip install -r requirements.txt ^&^& python -m uvicorn main:app --host 127.0.0.1 --port 8000
goto start_frontend

:start_node_backend
where node >nul 2>nul
if errorlevel 1 goto no_node
start "MCS Backend API" /D "%BACKEND_DIR%" cmd /k node backend-node.mjs
goto start_frontend

:no_backend
echo Backend files not found: "%BACKEND_DIR%"
goto start_frontend

:no_node
echo Node.js was not found. Please install Node.js or make sure it is in PATH.
pause
exit /b 1

:start_frontend
echo Starting frontend...
if exist node_modules goto run_frontend
call npm.cmd install

:run_frontend
call npm.cmd run dev -- --open
pause
