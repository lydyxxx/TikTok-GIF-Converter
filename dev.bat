@echo off
setlocal

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "BACKEND_DIR=%ROOT_DIR%\backend"

set "FRONTEND_TITLE=telegrambot-frontend-dev"
set "BACKEND_TITLE=telegrambot-backend-dev"
set "FRONTEND_PORT=5173"
set "BACKEND_PORT=3001"

echo [INFO] Restarting frontend and backend...

call :restart_process "%FRONTEND_TITLE%" "%FRONTEND_DIR%" "npm run dev" "%FRONTEND_PORT%"
call :restart_process "%BACKEND_TITLE%" "%BACKEND_DIR%" "npm run dev" "%BACKEND_PORT%"

echo [OK] Frontend and backend restart commands sent.
echo [INFO] Frontend window title: %FRONTEND_TITLE%
echo [INFO] Backend window title: %BACKEND_TITLE%
exit /b 0

:restart_process
set "WINDOW_TITLE=%~1"
set "WORK_DIR=%~2"
set "RUN_CMD=%~3"
set "PORT=%~4"

if not exist "%WORK_DIR%" (
  echo [X] Directory not found: %WORK_DIR%
  exit /b 1
)

echo [INFO] Checking existing process: %WINDOW_TITLE%
taskkill /F /T /FI "WINDOWTITLE eq %WINDOW_TITLE%" >nul 2>&1

if not "%PORT%"=="" (
  echo [INFO] Checking port %PORT%
  for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
    taskkill /F /T /PID %%P >nul 2>&1
  )
)

echo [INFO] Starting %WINDOW_TITLE% in %WORK_DIR%
start "%WINDOW_TITLE%" cmd /k "cd /d ""%WORK_DIR%"" && %RUN_CMD%"
exit /b 0
