@echo off
title Bot Resi J^&T - Port 31912
cd /d "%~dp0"

echo ===================================================
echo SISTEM RUNNER BOT RESI J^&T
echo Dashboard dapat diakses di http://localhost:31912
echo ===================================================
echo.

:: Proteksi aman: Cek apakah folder modul sudah ada
if not exist "node_modules\" (
    echo [ERROR] Folder node_modules tidak ditemukan!
    echo Anda harus menjalankan "install.bat" sukses terlebih dahulu.
    echo.
    pause
    exit /b
)

:: Jalankan core bot utama
node index.js

echo.
echo Bot telah berhenti berjalan secara aman.
pause