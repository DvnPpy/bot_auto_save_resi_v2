// ==========================================
// MANAJEMEN DATABASE JSON & PENYIMPANAN FOTO
// ==========================================
const fs = require('fs');
const path = require('path');
const config = require('./config');

process.env.TZ = 'Asia/Jakarta';

// Helper waktu WIB (Asia/Jakarta)
const getWIBDate = () =>
    new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

// Pastikan folder penyimpanan tersedia
if (!fs.existsSync(config.SAVE_PATH)) {
    try { fs.mkdirSync(config.SAVE_PATH, { recursive: true }); } catch (e) { /* abaikan */ }
}

// ===== Memori Chat (history per JID) =====
let chatMemory = {};
if (fs.existsSync(config.HISTORY_FILE)) {
    try {
        const rawData = fs.readFileSync(config.HISTORY_FILE, 'utf-8');
        chatMemory = JSON.parse(rawData || '{}');
    } catch (e) {
        console.log('⚠️ Database history korup, memulai ulang memory.');
        chatMemory = {};
    }
}

// Simpan dengan auto-pruning agar tidak meledak
const saveHistory = () => {
    try {
        for (const jid in chatMemory) {
            if (chatMemory[jid].length > config.MAX_MESSAGES) {
                chatMemory[jid] = chatMemory[jid].slice(-config.MAX_MESSAGES);
            }
        }
        fs.writeFileSync(config.HISTORY_FILE, JSON.stringify(chatMemory), 'utf-8');
    } catch (e) {
        console.error('Gagal menyimpan history:', e.message);
    }
};

// ===== Memori Admin =====
let adminList = [];
if (fs.existsSync(config.ADMIN_FILE)) {
    try { adminList = JSON.parse(fs.readFileSync(config.ADMIN_FILE, 'utf-8')); } catch (e) { /* abaikan */ }
}
const saveAdmins = () => {
    try { fs.writeFileSync(config.ADMIN_FILE, JSON.stringify(adminList), 'utf-8'); }
    catch (e) { console.error('Gagal menyimpan admins:', e.message); }
};

// ===== Pembersih Folder POD_ Otomatis (60 hari) =====
const cleanOldFolders = () => {
    try {
        const batasMs = config.RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const baseDir = path.resolve(config.SAVE_PATH);
        if (!fs.existsSync(baseDir)) return;

        // Bersihkan di base SAVE_PATH
        for (const f of fs.readdirSync(baseDir)) {
            const full = path.join(baseDir, f);
            try {
                const stat = fs.statSync(full);
                if (stat.isDirectory() && f.startsWith('POD_') &&
                    (Date.now() - stat.mtimeMs) > batasMs) {
                    fs.rmSync(full, { recursive: true, force: true });
                    console.log(`🧹 Folder lama dihapus: ${f}`);
                }
            } catch (e) { /* skip file rusak */ }
        }

        // Backward-compat: bersihkan di root juga (jika dulu disimpan di cwd)
        for (const f of fs.readdirSync('./')) {
            try {
                const stat = fs.statSync(f);
                if (stat.isDirectory() && f.startsWith('POD_') &&
                    (Date.now() - stat.mtimeMs) > batasMs) {
                    fs.rmSync(f, { recursive: true, force: true });
                    console.log(`🧹 Folder lama (root) dihapus: ${f}`);
                }
            } catch (e) { /* skip */ }
        }
    } catch (err) {
        console.error('Gagal scan folder lama:', err.message);
    }
};

// Cek tiap 12 jam
setInterval(cleanOldFolders, 12 * 60 * 60 * 1000);
// Eksekusi pertama setelah 30 detik booting
setTimeout(cleanOldFolders, 30 * 1000);

module.exports = {
    chatMemory,
    saveHistory,
    adminList,
    saveAdmins,
    getWIBDate,
    cleanOldFolders
};
