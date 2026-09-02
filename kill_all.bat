@echo off
echo ===================================================
echo   Stopping SENTIO Services & Processes
echo ===================================================

echo [1/3] Stopping Docker containers...
docker compose down 2>nul

echo [2/3] Terminating Python / Uvicorn processes...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM pythonw.exe /T 2>nul
taskkill /F /IM uvicorn.exe /T 2>nul

echo [3/3] Terminating Node.js processes...
taskkill /F /IM node.exe /T 2>nul

echo.
echo All SENTIO processes (Docker, Python, Node) terminated.
echo ===================================================
