@echo off
cd /d "%~dp0"
if exist ".git\index.lock" del /f /q ".git\index.lock"
echo Pushing site changes (Vercel will auto-deploy)...
git add -A
git commit -m "Update Cutco site"
git push
echo.
echo Done. Watch the deploy at vercel.com (Ready in ~20s).
pause
