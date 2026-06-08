@echo off
cd /d "%~dp0backend"
echo Running AcademIQ full system check...
python test_all_phases.py
pause
