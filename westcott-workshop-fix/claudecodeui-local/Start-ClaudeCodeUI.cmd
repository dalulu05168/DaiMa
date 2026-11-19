@echo off
setlocal
set "APP_ROOT=%~dp0"
set "NODE_EXE=%APP_ROOT%runtime\node.exe"
if not exist "%NODE_EXE%" if exist "%APP_ROOT%node-path.txt" set /p NODE_EXE=<"%APP_ROOT%node-path.txt"
if not exist "%NODE_EXE%" (
  where node.exe >nul 2>nul || goto error
  set "NODE_EXE=node.exe"
)
"%NODE_EXE%" "%APP_ROOT%start-local.cjs" %*
if not errorlevel 1 exit /b 0
:error
echo Could not start Claude Code UI. Check the details above.
pause
exit /b 1
