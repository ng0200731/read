@echo off
title Image Pattern Analysis Tool - Server
color 0A

echo ========================================
echo  IMAGE PATTERN ANALYSIS TOOL
echo  VERSION 2.0.1
echo ========================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

:: Display Python version
echo Python version:
python --version
echo.

:: Check if we're in the correct directory
if not exist "app.js" (
    echo ERROR: app.js not found in current directory
    echo Please run this batch file from the project root directory
    pause
    exit /b 1
)

if not exist "index.html" (
    echo ERROR: index.html not found in current directory
    echo Please run this batch file from the project root directory
    pause
    exit /b 1
)

:: Display current directory
echo Current directory: %CD%
echo.

:: Kill any existing Python HTTP servers on port 3000
echo Checking for existing servers on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Killing existing process %%a
    taskkill /f /pid %%a >nul 2>&1
)

:: Wait a moment for processes to close
timeout /t 2 /nobreak >nul

echo Starting HTTP server on port 3000...
echo.
echo ========================================
echo  SERVER STARTING
echo ========================================
echo  URL: http://localhost:3000
echo  Press Ctrl+C to stop the server
echo ========================================
echo.

:: Start the Python HTTP server
python -m http.server 3000

:: If we get here, the server was stopped
echo.
echo ========================================
echo  SERVER STOPPED
echo ========================================
echo.
pause
