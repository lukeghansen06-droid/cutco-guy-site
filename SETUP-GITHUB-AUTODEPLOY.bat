@echo off
cd /d "%~dp0"
echo ============================================================
echo   Cutco site  -  GitHub auto-deploy setup
echo   (run this once; it pushes this folder to GitHub)
echo ============================================================
echo.
git init
git config user.email "lukehansen01@gmail.com"
git config user.name "Luke Hansen"
git add .
git commit -m "Cutco site: futuristic dashboard + Vercel analytics"
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/lukeghansen06-droid/cutco-guy-site.git
git push -u origin main
echo.
echo ============================================================
echo   If you see no red errors above, the push worked.
echo   Tell Claude "pushed" and it will connect Vercel.
echo ============================================================
pause
