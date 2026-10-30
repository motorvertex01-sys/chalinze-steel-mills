@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install the current LTS version from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo First-time setup: installing website dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

if not exist "dist\index.html" (
  echo Building the website for the first time...
  call npm run build
  if errorlevel 1 (
    echo The website build failed. Check the error above.
    pause
    exit /b 1
  )
)

call npm run start
if errorlevel 1 (
  echo The website did not start. Check the error above.
  pause
  exit /b 1
)
