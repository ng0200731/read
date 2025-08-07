@echo off
title Image Pattern Analysis Tool - Launcher
color 0B

:menu
cls
echo ========================================
echo  IMAGE PATTERN ANALYSIS TOOL
echo  VERSION 2.0.1 - LAUNCHER
echo ========================================
echo.
echo  Choose an option:
echo.
echo  [1] Start Server Only
echo  [2] Start Server + Open Browser
echo  [3] Check System Requirements
echo  [4] View Project Files
echo  [5] Kill All Servers on Port 3000
echo  [6] Exit
echo.
echo ========================================

set /p choice=Enter your choice (1-6):

if "%choice%"=="1" goto start_server
if "%choice%"=="2" goto start_full
if "%choice%"=="3" goto check_system
if "%choice%"=="4" goto view_files
if "%choice%"=="5" goto kill_servers
if "%choice%"=="6" goto exit

echo Invalid choice. Please try again.
timeout /t 2 /nobreak >nul
goto menu

:start_server
echo.
echo Starting server only...
call start-app.bat
goto menu

:start_full
echo.
echo Starting server with browser...
call start-app-full.bat
goto menu

:check_system
cls
echo ========================================
echo  SYSTEM REQUIREMENTS CHECK
echo ========================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [X] Python: NOT INSTALLED
) else (
    echo [OK] Python:
    python --version
)

:: Check required files
echo.
echo Required files:
if exist "app.js" (echo [OK] app.js) else (echo [X] app.js)
if exist "index.html" (echo [OK] index.html) else (echo [X] index.html)
if exist "canvas-tools.js" (echo [OK] canvas-tools.js) else (echo [X] canvas-tools.js)
if exist "style.css" (echo [OK] style.css) else (echo [X] style.css)

:: Check port 3000
echo.
echo Port 3000 status:
netstat -an | findstr :3000 >nul
if errorlevel 1 (
    echo [OK] Port 3000: Available
) else (
    echo [WARN] Port 3000: In use
)

echo.
pause
goto menu

:view_files
cls
echo ========================================
echo  PROJECT FILES
echo ========================================
echo.
dir /b *.html *.js *.css *.bat 2>nul
echo.
pause
goto menu

:kill_servers
echo.
echo Killing all processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 2^>nul') do (
    echo Killing process %%a
    taskkill /f /pid %%a >nul 2>&1
)
echo Done.
timeout /t 2 /nobreak >nul
goto menu

:exit
echo.
echo Thank you for using Image Pattern Analysis Tool!
timeout /t 2 /nobreak >nul
exit /b 0
