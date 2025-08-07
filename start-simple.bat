@echo off
title Image Pattern Analysis Tool
color 0A

echo ========================================
echo  IMAGE PATTERN ANALYSIS TOOL v1.2.0
echo ========================================
echo.

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed
    echo Please install Python and try again
    pause
    exit /b 1
)

echo Python found:
python --version
echo.

echo Checking required files...
if not exist "app.js" (
    echo ERROR: app.js not found
    pause
    exit /b 1
)
if not exist "index.html" (
    echo ERROR: index.html not found
    pause
    exit /b 1
)

echo All files found.
echo.

echo Cleaning up any existing servers...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ========================================
echo  Starting server on http://localhost:3000
echo  Press Ctrl+C to stop
echo ========================================
echo.

timeout /t 2 /nobreak >nul

start http://localhost:3000

python -m http.server 3000

echo.
echo Server stopped.
pause
