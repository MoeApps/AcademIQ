@echo off
title AcademIQ Website
cd /d "%~dp0front-end"
echo Starting AcademIQ website on http://localhost:3000
echo Keep this window OPEN while using the app.
echo.
npm run dev
pause
