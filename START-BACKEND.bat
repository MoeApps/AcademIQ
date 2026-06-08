@echo off
title AcademIQ Backend
cd /d "%~dp0backend"
echo Starting AcademIQ backend on http://localhost:8000
echo Keep this window OPEN while using the app.
echo.
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause
