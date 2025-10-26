# Flutter Build Script for Windows/WSL
# This script builds the Flutter APK from Windows by calling WSL commands

param(
    [string]$Version = "1.0.0-beta"
)

$WSL_PROJECT_PATH = "/home/iivroomvroomii/udvikling/lonberegning-system/mobile"

Write-Host "🚀 Building Lønberegning Mobile App v$Version" -ForegroundColor Green
Write-Host "=" * 50

# Clean previous builds
Write-Host "`n🧹 Cleaning previous builds..." -ForegroundColor Cyan
wsl -e bash -c "cd $WSL_PROJECT_PATH && flutter clean"

# Get dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Cyan
wsl -e bash -c "cd $WSL_PROJECT_PATH && flutter pub get"

# Build APK
Write-Host "`n🔨 Building Android APK..." -ForegroundColor Cyan
wsl -e bash -c "cd $WSL_PROJECT_PATH && flutter build apk --release"

# Check if build was successful
if (Test-Path "\\wsl.localhost\Ubuntu\home\iivroomvroomii\udvikling\lonberegning-system\mobile\build\app\outputs\flutter-apk\app-release.apk") {
    Write-Host "`n✅ Build successful!" -ForegroundColor Green

    # Create releases directory
    New-Item -ItemType Directory -Force -Path "\\wsl.localhost\Ubuntu\home\iivroomvroomii\udvikling\lonberegning-system\mobile\releases" | Out-Null

    # Copy APK with version name
    Copy-Item "\\wsl.localhost\Ubuntu\home\iivroomvroomii\udvikling\lonberegning-system\mobile\build\app\outputs\flutter-apk\app-release.apk" `
              "\\wsl.localhost\Ubuntu\home\iivroomvroomii\udvikling\lonberegning-system\mobile\releases\lonberegning-v$Version.apk"

    $apkSize = (Get-Item "\\wsl.localhost\Ubuntu\home\iivroomvroomii\udvikling\lonberegning-system\mobile\releases\lonberegning-v$Version.apk").Length / 1MB
    Write-Host "APK size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Green

    Write-Host "`n📱 APK Ready for Distribution!" -ForegroundColor Green
    Write-Host "================================"
    Write-Host "File: releases/lonberegning-v$Version.apk"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Create GitHub tag:" -ForegroundColor White
    Write-Host "   git tag -a v$Version -m 'Release version $Version'"
    Write-Host "   git push origin v$Version"
    Write-Host ""
    Write-Host "2. Go to: https://github.com/IIVroomVroomII/lonberegner/releases/new"
    Write-Host "   - Upload: releases/lonberegning-v$Version.apk"
    Write-Host "   - Mark as pre-release"
    Write-Host ""
    Write-Host "3. Download link:"
    Write-Host "   https://github.com/IIVroomVroomII/lonberegner/releases/download/v$Version/lonberegning-v$Version.apk"

} else {
    Write-Host "`n❌ Build failed! APK not found." -ForegroundColor Red
    exit 1
}

Write-Host "`n✨ Done!" -ForegroundColor Green
