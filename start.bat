@echo off
cls
echo ================================================
echo    IMAGE PATTERN ANALYSIS TOOL
echo ================================================
echo.
echo Starting web server...
echo.

REM Check if Python is available
py --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

REM Check if required files exist
if not exist "index.html" (
    echo ERROR: index.html not found
    echo Please run this from the project directory
    pause
    exit /b 1
)

if not exist "app.js" (
    echo ERROR: app.js not found
    echo Please run this from the project directory
    pause
    exit /b 1
)

REM Start the Python HTTP server
echo Python found - starting server...
echo.
echo ================================================
echo  Server will start on: http://localhost:3000
echo  Press Ctrl+C to stop the server
echo ================================================
echo.

REM Start server and open browser
start "" "http://localhost:3000"
py server.py

REM If we get here, server stopped
echo.
echo Server stopped.
pause
