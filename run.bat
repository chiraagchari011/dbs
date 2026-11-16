@echo off
setlocal
cd /d "%~dp0"
title Classroom Allocation Management System

echo =============================================
echo   Classroom Allocation Management System
echo =============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js was not found.
    echo Install Node.js from https://nodejs.org/ and run this file again.
    goto error
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm was not found. Reinstall Node.js with npm included.
    goto error
)

if not exist ".env" (
    copy ".env.example" ".env" >nul
    if errorlevel 1 (
        echo ERROR: Could not create .env from .env.example.
        goto error
    )
    echo Created .env with the default local MongoDB settings.
    echo Edit .env if your MongoDB connection details are different.
    echo.
)

if not exist "node_modules\express" (
    echo Installing project dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Dependency installation failed.
        goto error
    )
)

echo Checking MongoDB and preparing sample records...
call npm run seed
if errorlevel 1 (
    echo.
    echo ERROR: Could not connect to MongoDB.
    echo Start MongoDB or update MONGODB_URI in .env, then try again.
    goto error
)

echo.
echo Starting the application at http://localhost:3000
echo Keep this window open while using the application.
echo Press Ctrl+C to stop the server.
echo.
call npm start
if errorlevel 1 (
    echo.
    echo ERROR: The application stopped with an error. Read the message above.
    goto error
)
goto end

:error
echo.
pause
exit /b 1

:end
endlocal
