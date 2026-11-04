@echo off
echo ================================
echo PRISMA CLIENT FIX FOR WINDOWS
echo ================================
echo.
echo This script will:
echo 1. Clean Prisma client files
echo 2. Regenerate Prisma client
echo 3. Show you how to restart
echo.
echo IMPORTANT: Make sure you've stopped your dev server (Ctrl+C) before running this!
echo.
pause

echo.
echo [Step 1/3] Cleaning old Prisma client...
if exist "node_modules\.prisma" (
    echo Deleting node_modules\.prisma...
    rmdir /s /q "node_modules\.prisma"
    echo ✅ Cleaned!
) else (
    echo No .prisma folder found (that's okay)
)

echo.
echo [Step 2/3] Regenerating Prisma client...
call npx prisma generate

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERROR: Prisma generate failed!
    echo.
    echo Possible causes:
    echo 1. Dev server is still running (MUST be stopped first)
    echo 2. File permissions issue
    echo 3. Node modules corrupted
    echo.
    echo Try:
    echo 1. Stop ALL node processes in Task Manager
    echo 2. Run this script again
    echo 3. If still fails, delete node_modules and run: npm install
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Prisma client regenerated successfully!
echo.
echo [Step 3/3] Next steps:
echo 1. Start your dev server: npm run dev
echo 2. Wait for it to compile
echo 3. Refresh your browser at /dashboard/clinical/emr
echo.
echo ================================
echo ✅ FIX COMPLETE!
echo ================================
echo.
pause
