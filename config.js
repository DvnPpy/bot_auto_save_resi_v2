// ==========================================
// PUSAT PENGATURAN BOT
// ==========================================
// Konfigurasi dimuat dari .env (jika ada) lalu di-fallback ke default.
// Hal ini memudahkan deploy di server berbeda tanpa edit kode.
// ==========================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const RUNTIME_FILE = path.join(__dirname, 'runtime_state.json');

// Helper baca konfigurasi runtime (nomor bot yang diatur via GUI)
const readRuntime = () => {
    try {
        if (fs.existsSync(RUNTIME_FILE)) {
            return JSON.parse(fs.readFileSync(RUNTIME_FILE, 'utf-8') || '{}');
        }
    } catch (e) { /* abaikan */ }
    return {};
};

const writeRuntime = (data) => {
    try {
        const current = readRuntime();
        const merged = { ...current, ...data };
        fs.writeFileSync(RUNTIME_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    } catch (e) { /* abaikan */ }
};

const runtime = readRuntime();

const parseKeys = (raw) =>
    String(raw || '')
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

module.exports = {
    BOT_NUMBER: runtime.BOT_NUMBER || process.env.BOT_NUMBER || '',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'botresi123',
    SUPER_ADMIN: process.env.SUPER_ADMIN || '6285849234912@s.whatsapp.net',
    OCR_KEYS: parseKeys(process.env.OCR_KEYS) .length
        ? parseKeys(process.env.OCR_KEYS)
        : ['K86974445588957', 'K83673440788957'],
    SAVE_PATH: process.env.SAVE_PATH || './POD_STORAGE',
    DEVELOPER_CREDIT: process.env.DEVELOPER_CREDIT || 'Di-developer oleh delfin',
    HISTORY_FILE: process.env.HISTORY_FILE || './history_resi.json',
    ADMIN_FILE: process.env.ADMIN_FILE || './admins.json',
    MAX_MESSAGES: parseInt(process.env.MAX_MESSAGES || '2000', 10),
    MAX_CONCURRENT: parseInt(process.env.MAX_CONCURRENT || '1', 10),
    GUI_PORT: parseInt(process.env.GUI_PORT || '31912', 10),
    AUTO_OPEN_BROWSER: String(process.env.AUTO_OPEN_BROWSER || 'true').toLowerCase() === 'true',
    RETENTION_DAYS: parseInt(process.env.RETENTION_DAYS || '60', 10),
    AUTH_FOLDER: process.env.AUTH_FOLDER || 'baileys_auth',
    RUNTIME_FILE,
    // Helper agar nomor bot dapat diubah saat runtime (dari GUI)
    setBotNumber(number) {
        writeRuntime({ BOT_NUMBER: number });
        this.BOT_NUMBER = number;
    }
};
