@echo off
echo ========================================
echo ULTIMATE PRISMA + NEXT.JS CACHE FIX
echo ========================================
echo.
echo This will DELETE:
echo 1. Next.js cache (.next folder)
echo 2. Prisma client (node_modules\.prisma)
echo 3. Turbopack cache (.turbopack)
echo 4. And regenerate everything
echo.
echo MAKE SURE YOUR DEV SERVER IS STOPPED (Ctrl+C)!
echo.
pause

echo.
echo [1/5] Deleting Next.js cache...
if exist ".next" (
    rmdir /s /q ".next"
    echo ✅ Deleted .next
) else (
    echo ⚠️ No .next folder found
)

echo.
echo [2/5] Deleting Turbopack cache...
if exist ".turbopack" (
    rmdir /s /q ".turbopack"
    echo ✅ Deleted .turbopack
) else (
    echo ⚠️ No .turbopack folder found
)

echo.
echo [3/5] Deleting Prisma client...
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma"
    echo ✅ Deleted node_modules\.prisma
) else (
    echo ⚠️ No .prisma folder found
)

echo.
echo [4/5] Regenerating Prisma client...
call npx prisma generate

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ FAILED! Prisma generate failed!
    echo.
    echo This usually means:
    echo 1. Node is still running (check Task Manager)
    echo 2. Permission issue (try running as Administrator)
    echo.
    echo Press Ctrl+Shift+Esc to open Task Manager
    echo End all node.exe processes
    echo Then run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Prisma client regenerated!

echo.
echo [5/5] Next Steps:
echo ========================================
echo 1. Start your dev server: npm run dev
echo 2. Wait for full compilation (may take 1-2 min first time)
echo 3. Refresh browser at /dashboard/clinical/emr
echo ========================================
echo.
echo ✅ ALL CACHES CLEARED! Ready to start fresh!
echo.
pause
