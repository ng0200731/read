@echo off
cls
echo ================================================
echo    IMAGE PATTERN ANALYSIS TOOL v2.0.9
echo ================================================
echo.
echo Choose how to start the web server:
echo.
echo 1. Try Python (python)
echo 2. Try Python Launcher (py)
echo 3. Try Python3 (python3)
echo 4. Open folder to start manually
echo 5. Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto python
if "%choice%"=="2" goto py
if "%choice%"=="3" goto python3
if "%choice%"=="4" goto manual
if "%choice%"=="5" goto exit

:python
echo.
echo Trying: python server.py
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: 'python' command not found
    goto retry
)
echo Starting server with python...
start "" "http://localhost:3000"
python server.py
goto end

:py
echo.
echo Trying: py server.py
py --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: 'py' command not found
    goto retry
)
echo Starting server with py...
start "" "http://localhost:3000"
py server.py
goto end

:python3
echo.
echo Trying: python3 server.py
python3 --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: 'python3' command not found
    goto retry
)
echo Starting server with python3...
start "" "http://localhost:3000"
python3 server.py
goto end

:manual
echo.
echo Opening project folder...
echo.
echo MANUAL INSTRUCTIONS:
echo 1. Install Python from: https://www.python.org/downloads/
echo 2. Make sure to check "Add Python to PATH" during installation
echo 3. Restart this batch file
echo 4. OR use any other web server (like Live Server in VS Code)
echo.
explorer .
pause
goto end

:retry
echo.
echo Try another option or install Python first.
echo.
pause
goto start

:exit
echo Goodbye!
goto end

:end
echo.
echo Server stopped or exited.
pause
