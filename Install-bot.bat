@echo off
title Setup ^& Run Bot J^&T
cd /d "%~dp0"
color 0A

echo ===================================================
echo       SISTEM AUTO-SETUP ^& RUN BOT RESI J^&T
echo ===================================================
echo.
echo [DETAIL] Memulai pengecekan sistem...
echo.

:: 1. TAHAP GIT
echo [TAHAP 1] Memeriksa ketersediaan mesin Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Git tidak ditemukan. NPM sangat membutuhkan Git.
    echo [>] Mengunduh Git installer dari server resmi, Mohon tunggu...
    curl -L -o git_setup.exe https://github.com/git-for-windows/git/releases/download/v2.45.1.windows.1/Git-2.45.1-64-bit.exe
    
    echo [>] Menginstal Git ke sistem... 
    echo [!] PERHATIAN: Jika muncul pop-up Windows YES/NO, klik YES
    start /wait git_setup.exe /SILENT /NORESTART
    del git_setup.exe
    
    echo [V] Git berhasil diinstal!
    set "PATH=%PATH%;C:\Program Files\Git\cmd"
    echo [V] Git berhasil dihubungkan ke Terminal aktif.
) else (
    echo [V] Mesin Git sudah terdeteksi dan aman.
)

echo.
:: 2. TAHAP NPM
echo [TAHAP 2] Menginstal Modul Bot...
echo [>] Menarik library WhatsApp dan pendukung lainnya...
call npm install

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [X] FATAL ERROR: Instalasi modul gagal! Pastikan internet stabil.
    pause
    exit /b
)
echo [V] Semua modul terpasang sempurna!

echo.
:: 3. TAHAP RUNNING
echo [TAHAP 3] Menyalakan Bot...
echo ===================================================
echo [ONLINE] Akses Dashboard di: http://localhost:31912
echo ===================================================
node index.js

echo.
echo [!] Bot telah dimatikan.
pause