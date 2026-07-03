@echo off
cd /d "%~dp0"

title World Cup Predictor - Local Start

echo ========================================
echo  World Cup Predictor - Local Start
echo ========================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js is not installed.
  echo Install Node.js 18 or newer, then run this again.
  echo After installing Node.js, close and reopen PowerShell/CMD.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%v in ('node -v') do set NODE_VERSION=%%v
set NODE_MAJOR=%NODE_VERSION:v=%
if %NODE_MAJOR% LSS 18 (
  echo Your Node.js version is too old.
  node -v
  echo Install Node.js 18 or newer.
  pause
  exit /b 1
)

if not exist .env (
  echo Creating .env from .env.example...
  copy .env.example .env >nul
)

if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

echo.
echo Starting server...
echo Keep this window open.
echo Open this in your browser: http://localhost:3000
echo.
call npm start
pause
