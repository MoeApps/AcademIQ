# Run from AcademIQ-main: .\run_backend.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
Set-Location backend
Write-Host "Installing dependencies..."
pip install -r requirements.txt
Write-Host "Starting API at http://127.0.0.1:8000 ..."
python -m uvicorn app.backend:app --reload --host 127.0.0.1 --port 8000
