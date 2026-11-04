# PRISMA CLIENT FIX FOR WINDOWS (PowerShell)
Write-Host "================================" -ForegroundColor Cyan
Write-Host "PRISMA CLIENT FIX FOR WINDOWS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "1. Clean Prisma client files" -ForegroundColor Yellow
Write-Host "2. Regenerate Prisma client" -ForegroundColor Yellow
Write-Host "3. Show you how to restart" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: Make sure you've stopped your dev server (Ctrl+C) before running this!" -ForegroundColor Red
Write-Host ""
Read-Host "Press Enter to continue"

Write-Host ""
Write-Host "[Step 1/3] Cleaning old Prisma client..." -ForegroundColor Cyan

$prismaPath = "node_modules\.prisma"
if (Test-Path $prismaPath) {
    Write-Host "Deleting $prismaPath..." -ForegroundColor Yellow
    Remove-Item -Path $prismaPath -Recurse -Force
    Write-Host "✅ Cleaned!" -ForegroundColor Green
} else {
    Write-Host "No .prisma folder found (that's okay)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[Step 2/3] Regenerating Prisma client..." -ForegroundColor Cyan

try {
    npx prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Prisma client regenerated successfully!" -ForegroundColor Green
    } else {
        throw "Prisma generate failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: Prisma generate failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible causes:" -ForegroundColor Yellow
    Write-Host "1. Dev server is still running (MUST be stopped first)" -ForegroundColor Yellow
    Write-Host "2. File permissions issue" -ForegroundColor Yellow
    Write-Host "3. Node modules corrupted" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Try:" -ForegroundColor Cyan
    Write-Host "1. Stop ALL node processes in Task Manager" -ForegroundColor Cyan
    Write-Host "2. Run this script again" -ForegroundColor Cyan
    Write-Host "3. If still fails, delete node_modules and run: npm install" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[Step 3/3] Next steps:" -ForegroundColor Cyan
Write-Host "1. Start your dev server: npm run dev" -ForegroundColor White
Write-Host "2. Wait for it to compile" -ForegroundColor White
Write-Host "3. Refresh your browser at /dashboard/clinical/emr" -ForegroundColor White
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ FIX COMPLETE!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
