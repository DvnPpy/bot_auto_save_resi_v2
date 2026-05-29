// ==========================================
// FILE UTAMA: BOT WA RESI J&T (GUI + Detailed Session Logging)
// ==========================================
process.env.TZ = 'Asia/Jakarta';

const {
    default: makeWASocket,
    useMultiFileAuthState,
    downloadMediaMessage,
    getContentType,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const sharp = require('sharp');

// Modul internal
const config = require('./config');
const db = require('./database');
const ocr = require('./ocrEngine');

// ==========================================
// 1. SETUP LOGGING (per sesi booting)
// ==========================================
const logFolder = path.join(__dirname, 'logs');
if (!fs.existsSync(logFolder)) fs.mkdirSync(logFolder, { recursive: true });

const bootTime = db.getWIBDate();
const dateStr = `${String(bootTime.getDate()).padStart(2, '0')}-${String(bootTime.getMonth() + 1).padStart(2, '0')}-${bootTime.getFullYear()}`;
const timeStrFile = `${String(bootTime.getHours()).padStart(2, '0')}-${String(bootTime.getMinutes()).padStart(2, '0')}`;
const sessionLogPath = path.join(logFolder, `bot_log_${dateStr}_${timeStrFile}.txt`);

const saveLogToFile = (message) => {
    try {
        fs.appendFileSync(sessionLogPath, message.replace(/\n\n/g, '\n') + '\n', 'utf8');
    } catch (err) {
        console.error('Gagal menulis log:', err.message);
    }
};

// ==========================================
// 2. SETUP GUI DASHBOARD (Express + Socket.io)
// ==========================================
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer);

// State global yang ditampilkan di GUI
const guiState = {
    status: 'Inisialisasi...',
    statusColor: 'warn',
    pairingCode: '---',
    botNumber: config.BOT_NUMBER || '',
    queue: 0,
    active: 0,
    totalProcessed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    apiKeyInfo: ocr.getActiveKeyInfo()
};

const broadcastState = () => {
    guiState.apiKeyInfo = ocr.getActiveKeyInfo();
    io.emit('state', guiState);
};

// HTML Dashboard (Update UI Danger Zone)
const guiHTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Dashboard Bot Resi J&T</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0f1419;--panel:#171c25;--panel-2:#1d232e;--border:#2a313d;
  --text:#e6edf3;--muted:#8b949e;--accent:#ffb454;--ok:#7fd962;
  --err:#ff6b6b;--warn:#ffd866;--info:#5ccfe6;
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Space Grotesk',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:24px;}
.wrap{max-width:1280px;margin:0 auto;}
header{display:flex;justify-content:space-between;align-items:center;padding-bottom:18px;border-bottom:1px solid var(--border);margin-bottom:24px;}
h1{font-size:22px;letter-spacing:-0.5px;display:flex;align-items:center;gap:10px;}
.dot{width:10px;height:10px;border-radius:50%;background:var(--err);box-shadow:0 0 12px var(--err);transition:all .3s;}
.dot.ok{background:var(--ok);box-shadow:0 0 12px var(--ok);}
.dot.warn{background:var(--warn);box-shadow:0 0 12px var(--warn);}
.badge{background:var(--panel);padding:6px 12px;border-radius:6px;font-size:12px;color:var(--muted);font-family:'JetBrains Mono',monospace;border:1px solid var(--border);}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:14px;margin-bottom:18px;}
.card{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px 18px;}
.card .label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;}
.card .value{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:var(--accent);}
.card .value.ok{color:var(--ok);} .card .value.err{color:var(--err);} .card .value.info{color:var(--info);}
.row{display:grid;grid-template-columns:340px 1fr;gap:18px;}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:20px;}
.panel h2{font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px;font-weight:600;}
.pairing-box{background:var(--bg);border:1px dashed var(--accent);border-radius:8px;padding:18px;text-align:center;margin-bottom:14px;}
.pairing-code{font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:700;color:var(--accent);letter-spacing:4px;}
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;}
.field label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;}
.field input{background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px 12px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;}
.field input:focus{border-color:var(--accent);}
.btns{display:flex;flex-direction:column;gap:8px;}
button{background:var(--accent);color:#0f1419;border:0;padding:11px 14px;border-radius:6px;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:13px;cursor:pointer;transition:transform .1s,filter .15s;}
button:hover{filter:brightness(1.1);} button:active{transform:scale(0.98);}
button.ghost{background:transparent;color:var(--text);border:1px solid var(--border);}
button.ghost:hover{background:var(--panel-2);border-color:var(--accent);}
button.danger{background:var(--err);color:#fff;}
.danger-zone{margin-top:24px;padding-top:16px;border-top:1px dashed var(--err);}
.danger-zone-title{font-size:11px;color:var(--err);letter-spacing:1px;margin-bottom:10px;font-weight:700;}
.log-box{background:#0a0e13;border:1px solid var(--border);border-radius:8px;height:560px;overflow-y:auto;padding:14px;font-family:'JetBrains Mono',monospace;font-size:12.5px;line-height:1.7;}
.log-box::-webkit-scrollbar{width:6px;} .log-box::-webkit-scrollbar-thumb{background:var(--border);border-radius:6px;}
.log-entry{padding:3px 6px;border-radius:4px;border-left:2px solid transparent;}
.log-info{color:var(--info);border-color:var(--info);}
.log-success{color:var(--ok);border-color:var(--ok);}
.log-warn{color:var(--warn);border-color:var(--warn);}
.log-error{color:var(--err);border-color:var(--err);background:rgba(255,107,107,0.05);}
footer{margin-top:24px;text-align:center;color:var(--muted);font-size:11px;letter-spacing:1px;}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr);}.row{grid-template-columns:1fr;}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1><span id="dot" class="dot"></span> Bot Resi J&T · Dashboard</h1>
    <div>
      <span class="badge" id="bootInfo">Session: ${dateStr} ${timeStrFile}</span>
    </div>
  </header>

  <div class="grid">
    <div class="card"><div class="label">Status Node</div><div class="value" id="statusValue">Loading...</div></div>
    <div class="card"><div class="label">Queue Aktif</div><div class="value info" id="queueValue">0</div></div>
    <div class="card"><div class="label">Total Sukses</div><div class="value ok" id="successValue">0</div></div>
    <div class="card"><div class="label">Total Gagal</div><div class="value err" id="failedValue">0</div></div>
  </div>

  <div class="row">
    <aside class="panel">
      <h2>Konfigurasi Koneksi</h2>
      <div class="pairing-box">
        <div style="font-size:10px;color:var(--muted);letter-spacing:1.5px;margin-bottom:6px;">PAIRING CODE</div>
        <div class="pairing-code" id="pairingCode">---</div>
      </div>
      <div class="field">
        <label>Nomor Bot WhatsApp</label>
        <input id="botNumber" placeholder="cth: 628123456789" data-testid="bot-number-input" />
      </div>
      <div class="btns">
        <button id="btnRequestPair" data-testid="request-pairing-btn">Request Pairing Code</button>
        <button id="btnRestart" class="ghost" data-testid="restart-btn">Restart Bot</button>
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);font-size:11px;color:var(--muted);line-height:1.7;">
        <div>API Key OCR: <span id="apiInfo" style="color:var(--accent);font-family:'JetBrains Mono',monospace;">-</span></div>
        <div>Tasks aktif: <span id="activeTasks" style="color:var(--info);font-family:'JetBrains Mono',monospace;">0</span></div>
      </div>
      
      <div class="danger-zone">
        <div class="danger-zone-title">DANGER ZONE</div>
        <button id="btnNewSession" class="danger" style="width:100%;" data-testid="new-session-btn">New Session (Logout)</button>
      </div>
    </aside>

    <main class="panel">
      <h2>Live Activity Log · disimpan ke logs/bot_log_${dateStr}_${timeStrFile}.txt</h2>
      <div class="log-box" id="logBox" data-testid="log-box"></div>
    </main>
  </div>

  <footer>BOT RESI J&T · Powered by Baileys + OCR.Space · Engine v1.3</footer>
</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io();
const logBox = document.getElementById('logBox');
const dot = document.getElementById('dot');

socket.on('log', (data) => {
  const div = document.createElement('div');
  div.className = 'log-entry ' + data.type;
  div.textContent = data.msg;
  logBox.appendChild(div);
  if (logBox.children.length > 800) logBox.removeChild(logBox.firstChild);
  logBox.scrollTop = logBox.scrollHeight;
});

socket.on('state', (s) => {
  document.getElementById('statusValue').textContent = s.status;
  document.getElementById('statusValue').className = 'value ' + (s.statusColor === 'ok' ? 'ok' : s.statusColor === 'err' ? 'err' : 'info');
  document.getElementById('pairingCode').textContent = s.pairingCode || '---';
  document.getElementById('queueValue').textContent = s.queue;
  document.getElementById('successValue').textContent = s.totalSuccess;
  document.getElementById('failedValue').textContent = s.totalFailed;
  document.getElementById('activeTasks').textContent = s.active + ' / ' + (s.maxConcurrent || '?');
  const info = s.apiKeyInfo || {index:0,total:0,masked:'-'};
  document.getElementById('apiInfo').textContent = info.masked + ' (' + info.index + '/' + info.total + ')';
  dot.className = 'dot ' + (s.statusColor === 'ok' ? 'ok' : s.statusColor === 'warn' ? 'warn' : '');
  if (!document.activeElement || document.activeElement.id !== 'botNumber') {
    document.getElementById('botNumber').value = s.botNumber || '';
  }
});

document.getElementById('btnRequestPair').addEventListener('click', async () => {
  const n = document.getElementById('botNumber').value.trim();
  if (!n) { alert('Isi nomor bot WhatsApp dulu'); return; }
  const res = await fetch('/api/request-pairing', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ number:n }) });
  const j = await res.json();
  if (!j.ok) alert(j.error || 'Gagal');
});

document.getElementById('btnNewSession').addEventListener('click', async () => {
  if (!confirm('Yakin logout & hapus session? Setelah ini perlu pairing ulang.')) return;
  const res = await fetch('/api/new-session', { method:'POST' });
  const j = await res.json();
  if (!j.ok) alert(j.error || 'Gagal');
});

document.getElementById('btnRestart').addEventListener('click', async () => {
  if (!confirm('Restart bot? Koneksi WA akan dibuka ulang.')) return;
  const res = await fetch('/api/restart', { method:'POST' });
  const j = await res.json();
  if (!j.ok) alert(j.error || 'Gagal');
});
</script>
</body>
</html>`;

app.get('/', (_req, res) => res.send(guiHTML));
app.get('/api/state', (_req, res) => res.json(guiState));
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.post('/api/request-pairing', async (req, res) => {
    try {
        const number = String(req.body?.number || '').replace(/[^0-9]/g, '');
        if (!number) return res.status(400).json({ ok: false, error: 'Nomor wajib diisi' });
        config.setBotNumber(number);
        guiState.botNumber = number;
        logTime(`🔧 Nomor bot diatur via GUI: ${number}`, 'log-info');
        broadcastState();
        await requestPairingNow();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/new-session', async (_req, res) => {
    try {
        logTime('🧨 Memulai NEW SESSION (logout & hapus auth)...', 'log-warn');
        await closeSocket();
        const authPath = path.join(__dirname, config.AUTH_FOLDER);
        if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
        logTime('✅ Session lama dihapus, memulai koneksi baru...', 'log-success');
        guiState.pairingCode = '---';
        guiState.status = 'Menunggu pairing baru...';
        guiState.statusColor = 'warn';
        broadcastState();
        setTimeout(() => connectToWhatsApp(), 1000);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.post('/api/restart', async (_req, res) => {
    try {
        logTime('🔄 Restart koneksi via GUI...', 'log-warn');
        await closeSocket();
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

httpServer.listen(config.GUI_PORT, '0.0.0.0', () => {
    console.log(`🌐 GUI Dashboard aktif di: http://localhost:${config.GUI_PORT}`);
    if (config.AUTO_OPEN_BROWSER && process.platform === 'win32') {
        exec(`start http://localhost:${config.GUI_PORT}`);
    } else if (config.AUTO_OPEN_BROWSER && process.platform === 'darwin') {
        exec(`open http://localhost:${config.GUI_PORT}`);
    }
});

// ==========================================
// 3. Fungsi Logging Universal
// ==========================================
const logTime = (msg, type = 'log-info') => {
    const d = db.getWIBDate();
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    const formatted = `[${time} WIB] ${msg}`;
    console.log(formatted);
    io.emit('log', { msg: formatted, type });
    saveLogToFile(formatted);
};

io.on('connection', (socket) => {
    socket.emit('state', { ...guiState, maxConcurrent: config.MAX_CONCURRENT });
    socket.emit('log', { msg: `[INFO] Dashboard tersambung. Session log: ${path.basename(sessionLogPath)}`, type: 'log-info' });
});

// ==========================================
// 4. MESIN INTI BOT WHATSAPP
// ==========================================
const delay = (ms) => new Promise(r => setTimeout(r, ms));

const generateUniqueCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '2.';
    for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
};

// [PEMBARUAN] Fungsi ini sekarang mengirim broadcast ke SEMUA admin (termasuk Super Admin)
const broadcastToAdmins = async (sock, message) => {
    try {
        const allAdmins = new Set(db.adminList.map(n => n.includes('@') ? n : `${n}@s.whatsapp.net`));
        allAdmins.add(config.SUPER_ADMIN);
        
        for (const adminJid of allAdmins) {
            await sock.sendMessage(adminJid, { text: message }).catch(() => {});
        }
    } catch (err) {
        logTime(`❌ Gagal mengirim notifikasi admin: ${err.message}`, 'log-error');
    }
};

const withTimeout = (promise, ms) => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('TIMEOUT_INTERNAL: Proses memakan waktu terlalu lama (di atas 60 detik)')), ms);
        promise
            .then(res => { clearTimeout(timer); resolve(res); })
            .catch(err => { clearTimeout(timer); reject(err); });
    });
};

let queue = [];
let activeTasks = 0;
let rangeStartIds = {};
let sockRef = null;
let pairingRequested = false;
let isIntentionalDisconnect = false;

const updateStats = () => {
    guiState.queue = queue.length;
    guiState.active = activeTasks;
    broadcastState();
};

const processQueue = () => {
    if (!sockRef) return;
    if (activeTasks < 0) activeTasks = 0;
    if (activeTasks >= config.MAX_CONCURRENT || queue.length === 0) {
        updateStats();
        return;
    }

    activeTasks++;
    updateStats();
    const msg = queue.shift();

    (async () => {
        try {
            await withTimeout((async () => {
                const remoteJid = msg.key.remoteJid;
                const senderNum = (msg.key.participant || remoteJid).split('@')[0];

                logTime(`📥 Memulai proses foto dari +${senderNum}...`, 'log-info');
                await sockRef.sendMessage(remoteJid, { react: { text: '⏳', key: msg.key } }).catch(() => {});

                const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                if (buffer) {
                    await handleImage(msg, buffer, senderNum);
                } else {
                    logTime(`⚠️ Gagal mendownload buffer gambar dari +${senderNum}`, 'log-warn');
                }
            })(), 60000); 

        } catch (err) {
            logTime(`❌ ERROR ANTREAN MEDIA: ${err.message}`, 'log-error');
            if (sockRef) {
                await sockRef.sendMessage(msg.key.remoteJid, { react: { text: '🚨', key: msg.key } }).catch(() => {});
            }
        } finally {
            activeTasks--;
            guiState.totalProcessed++;
            updateStats();
            processQueue(); 
        }
    })();
    
    processQueue();
};

const handleImage = async (msg, imageBuffer, senderNum) => {
    const remoteJid = msg.key.remoteJid;
    try {
        logTime(`🔍 Mengirim foto dari +${senderNum} ke OCR Engine 2...`, 'log-info');
        const finalResis = await ocr.extractResiCloud(imageBuffer);

        const d = db.getWIBDate();
        const namaBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        const folderName = `POD_${String(d.getDate()).padStart(2, '0')}_${namaBulan[d.getMonth()]}_${d.getFullYear()}`;
        const fullFolderPath = path.join(config.SAVE_PATH, folderName);

        if (!fs.existsSync(fullFolderPath)) {
            fs.mkdirSync(fullFolderPath, { recursive: true });
            logTime(`📁 Membuat folder baru: ${folderName}`, 'log-info');
        }

        let targetQuality = 98;
        let compressedImageBuffer = await sharp(imageBuffer)
            .jpeg({ quality: targetQuality, mozjpeg: true, chromaSubsampling: '4:4:4' })
            .toBuffer();

        while (compressedImageBuffer.length > 2000000 && targetQuality > 75) {
            targetQuality -= 3;
            compressedImageBuffer = await sharp(imageBuffer)
                .jpeg({ quality: targetQuality, mozjpeg: true, chromaSubsampling: '4:4:4' })
                .toBuffer();
        }

        if (finalResis.size > 0) {
            const listResi = Array.from(finalResis).join(', ');
            logTime(`✅ Sukses membaca resi dari +${senderNum} | Hasil: ${listResi}`, 'log-success');

            for (const resi of finalResis) {
                const fPath = path.join(fullFolderPath, `${resi}.jpg`);
                fs.writeFileSync(fPath, compressedImageBuffer);
                fs.utimesSync(fPath, d, d);
                logTime(`💾 Tersimpan: ${resi}.jpg (${(compressedImageBuffer.length / 1024 / 1024).toFixed(2)} MB)`, 'log-success');
            }

            guiState.totalSuccess++;
            if (sockRef) await sockRef.sendMessage(remoteJid, { react: { text: '👌', key: msg.key } }).catch(() => {});

        } else {
            if (!msg.isRetry) {
                msg.isRetry = true;
                logTime(`⚠️ Resi dari +${senderNum} tidak terdeteksi. Diretry sekali...`, 'log-warn');
                if (sockRef) await sockRef.sendMessage(remoteJid, { react: { text: '🔄', key: msg.key } }).catch(() => {});
                queue.push(msg);
                processQueue();
            } else {
                const timestampId = Date.now();
                const failedFileName = `AA_GAGAL_BACA_${timestampId}.jpg`;
                const failedPath = path.join(fullFolderPath, failedFileName);

                fs.writeFileSync(failedPath, compressedImageBuffer);
                fs.utimesSync(failedPath, d, d);

                guiState.totalFailed++;
                logTime(`❌ Gagal total dari +${senderNum}. Disimpan: ${failedFileName}`, 'log-error');
                if (sockRef) await sockRef.sendMessage(remoteJid, { react: { text: '❓', key: msg.key } }).catch(() => {});
            }
        }
    } catch (e) {
        if (e.message === 'RATE_LIMIT') {
            logTime(`⚠️ API Limit! Foto dari +${senderNum} ditunda 10 menit.`, 'log-warn');
            if (sockRef) await sockRef.sendMessage(remoteJid, { react: { text: '⏱️', key: msg.key } }).catch(() => {});
            setTimeout(() => {
                queue.push(msg);
                processQueue();
            }, 10 * 60 * 1000);
        } else {
            logTime(`🚨 ERROR proses gambar +${senderNum}: ${e.message}`, 'log-error');
            if (sockRef) await sockRef.sendMessage(remoteJid, { react: { text: '🚨', key: msg.key } }).catch(() => {});
        }
    } finally {
        updateStats();
    }
};

const getRealMessage = (msg) => {
    if (!msg.message) return null;
    const type = getContentType(msg.message);
    if (type === 'ephemeralMessage') return msg.message.ephemeralMessage.message;
    if (type === 'viewOnceMessageV2') return msg.message.viewOnceMessageV2.message;
    if (type === 'documentWithCaptionMessage') return msg.message.documentWithCaptionMessage.message;
    return msg.message;
};

const isMediaMsg = (msg) => {
    const realMsg = getRealMessage(msg);
    if (!realMsg) return false;
    const type = getContentType(realMsg);
    return type === 'imageMessage' || type === 'documentMessage';
};

const closeSocket = async () => {
    isIntentionalDisconnect = true;
    if (sockRef) {
        try { sockRef.end(undefined); } catch (e) { /* abaikan */ }
        try { sockRef.ws?.close?.(); } catch (e) { /* abaikan */ }
        sockRef = null;
    }
    pairingRequested = false;
};

const requestPairingNow = async () => {
    if (!sockRef) {
        logTime('⚠️ Socket belum siap, memulai koneksi dulu...', 'log-warn');
        connectToWhatsApp();
        return;
    }
    if (sockRef.authState?.creds?.registered) {
        logTime('⚠️ Bot sudah teregistrasi. Klik "New Session" dulu jika ingin pairing ulang.', 'log-warn');
        return;
    }
    const num = (config.BOT_NUMBER || '').replace(/[^0-9]/g, '');
    if (!num) {
        logTime('❌ Nomor bot belum diatur', 'log-error');
        return;
    }
    try {
        const code = await sockRef.requestPairingCode(num);
        const formatted = code.match(/.{1,4}/g)?.join('-') || code;
        logTime(`🔐 PAIRING CODE: ${formatted} (untuk nomor ${num})`, 'log-warn');
        guiState.pairingCode = formatted;
        guiState.status = 'Menunggu login di HP...';
        guiState.statusColor = 'warn';
        broadcastState();
    } catch (e) {
        logTime(`❌ Gagal request pairing: ${e.message}`, 'log-error');
    }
};

// ==========================================
// 5. Koneksi Baileys
// ==========================================
async function connectToWhatsApp() {
    logTime('Mempersiapkan mesin WhatsApp Baileys...', 'log-info');
    guiState.status = 'Menghubungkan...';
    guiState.statusColor = 'warn';
    broadcastState();

    const { state, saveCreds } = await useMultiFileAuthState(config.AUTH_FOLDER);
    const { version, isLatest } = await fetchLatestBaileysVersion();
    logTime(`Menggunakan WA Web v${version.join('.')} (Latest: ${isLatest})`, 'log-info');

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome'),
        keepAliveIntervalMs: 30000
    });
    sockRef = sock;
    pairingRequested = false;

    if (!sock.authState.creds.registered) {
        guiState.status = 'Belum teregistrasi';
        guiState.statusColor = 'warn';
        broadcastState();
        if (config.BOT_NUMBER) {
            setTimeout(async () => {
                if (pairingRequested) return;
                pairingRequested = true;
                await requestPairingNow();
            }, 3000);
        } else {
            logTime('⚠️ Nomor bot belum diatur. Isi di Dashboard lalu klik "Request Pairing Code".', 'log-warn');
        }
    } else {
        guiState.status = 'Auth ditemukan, login...';
        broadcastState();
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect } = u;

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const loggedOut = reason === DisconnectReason.loggedOut;
            const notRegistered = !sock.authState.creds.registered;
            const noBotNumber = !config.BOT_NUMBER;

            if (isIntentionalDisconnect) {
                logTime('🛑 Sistem melakukan Restart / New Session. Mengatur ulang...', 'log-warn');
                isIntentionalDisconnect = false;
                setTimeout(() => connectToWhatsApp(), 2000);
            } else if (loggedOut) {
                logTime('🔌 Logged out. Klik "New Session" untuk pairing baru.', 'log-warn');
                guiState.status = 'Logged out';
            } else if (notRegistered && noBotNumber) {
                logTime('⏸️ Belum registered & nomor bot kosong. Menunggu input dari GUI...', 'log-warn');
                guiState.status = 'Menunggu nomor bot...';
            } else {
                logTime(`🔄 Koneksi terputus (${reason || '?'}). Reconnect dalam 5 detik...`, 'log-warn');
                guiState.status = 'Reconnecting...';
                setTimeout(() => connectToWhatsApp(), 5000);
            }
            guiState.statusColor = 'warn';
            guiState.pairingCode = '---';
            broadcastState();
        } else if (connection === 'open') {
            guiState.status = 'Online & Siap';
            guiState.statusColor = 'ok';
            guiState.pairingCode = 'TERHUBUNG';
            broadcastState();
            logTime('✅ Koneksi WhatsApp terbuka! Memulai booting internal...', 'log-success');

            activeTasks = 0;
            setTimeout(() => processQueue(), 2000); 

            const startTime = Date.now();
            const timeStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

            try {
                // [PEMBARUAN] Broadcast bar loading booting ke SEMUA ADMIN sekaligus
                const allAdmins = new Set(db.adminList.map(n => n.includes('@') ? n : `${n}@s.whatsapp.net`));
                allAdmins.add(config.SUPER_ADMIN);

                let bootMsgs = [];
                for (const adminJid of allAdmins) {
                    try {
                        let sentMsg = await sockRef.sendMessage(adminJid, {
                            text: `🔄 *SISTEM BOOTING DIMULAI*\n\n_Waktu Mulai: ${timeStr} WIB_\n[░░░░░░░░░░] 0% - Membuka Jaringan...`
                        });
                        if (sentMsg) bootMsgs.push({ jid: adminJid, key: sentMsg.key });
                    } catch (e) {}
                }

                const updateAlert = async (text) => {
                    await delay(1500);
                    if (sockRef) {
                        for (const bMsg of bootMsgs) {
                            await sockRef.sendMessage(bMsg.jid, { text, edit: bMsg.key }).catch(() => {});
                        }
                    }
                };

                await updateAlert('🔄 *SISTEM BOOTING*\n\n[▓▓▓░░░░░░░] 30% - Sinkronisasi Data...');
                db.saveHistory();

                await updateAlert('🔄 *SISTEM BOOTING*\n\n[▓▓▓▓▓▓░░░░] 60% - Optimasi Memori...');
                await updateAlert('🔄 *SISTEM BOOTING*\n\n[▓▓▓▓▓▓▓▓░░] 80% - Engine OCR Siap...');

                const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
                await updateAlert(`✅ *BOT BERHASIL AKTIF!*\n\n[▓▓▓▓▓▓▓▓▓▓] 100% - Sistem Optimal\nSiap memproses foto resi.\n\n⏱️ Durasi: *${durationSeconds} detik*`);

                logTime(`🚀 Bot sepenuhnya siap! Waktu booting: ${durationSeconds}s`, 'log-success');

            } catch (error) {
                logTime(`⚠️ Gagal proses pesan booting: ${error.message}`, 'log-warn');
            }
        }
    });

    sock.ev.on('messages.upsert', async m => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            if (!msg.message || msg.key.fromMe) continue;

            const remoteJid = msg.key.remoteJid;
            const senderNum = (msg.key.participant || msg.key.remoteJid).split('@')[0].split(':')[0];
            const isAdmin = db.adminList.includes(senderNum) || senderNum === config.SUPER_ADMIN.split('@')[0];

            if (!db.chatMemory[remoteJid]) db.chatMemory[remoteJid] = [];
            db.chatMemory[remoteJid].push(msg);
            db.saveHistory();

            const realMsg = getRealMessage(msg) || {};
            const textLower = (realMsg.conversation || realMsg.extendedTextMessage?.text || '').toLowerCase();
            const quotedId = realMsg.extendedTextMessage?.contextInfo?.stanzaId;

            // ===== !help / !menu =====
            // [PEMBARUAN] Membatasi akses !help hanya untuk Admin
            if (textLower === '!help' || textLower === '!menu') {
                if (isAdmin) {
                    logTime(`ℹ️ +${senderNum} meminta menu (Akses Admin)`, 'log-info');
                    const menuText = `*🤖 MENU BOT AUTO-SAVE RESI 🤖*

*Penggunaan Otomatis:*
Kirim foto resi J&T, bot otomatis baca & simpan ke folder lokal.

*Perintah dengan Reply Foto:*
• *!ulang* ➔ Scan ulang foto tersebut.
• *!mulai* ➔ Tandai foto sebagai titik awal.
• *!ulang rentang* ➔ Scan dari titik awal sampai foto ini.
• *!ulang semua* ➔ Scan dari foto ini sampai history paling baru.

*Perintah Admin:*
• *!addadmin <sandi>* ➔ Tambah diri sendiri sebagai admin.
• *!addadmin 628xxx* ➔ (Khusus Super Admin) Menambah orang lain.
• *!update* ➔ Tarik update dari GitHub & restart.
• *!reboot* ➔ Hard Restart Node.js (PM2).
• *!help* ➔ Tampilkan menu ini.

${config.DEVELOPER_CREDIT}`;
                    if (sockRef) {
                        await sockRef.sendMessage(remoteJid, { react: { text: 'ℹ️', key: msg.key } }).catch(() => {});
                        await sockRef.sendMessage(remoteJid, { text: menuText }, { quoted: msg }).catch(() => {});
                    }
                } else {
                    logTime(`ℹ️ +${senderNum} mencoba akses menu (Ditolak: Bukan Admin)`, 'log-info');
                    const tutorialText = `⚠️ *AKSES DITOLAK*\n\nFitur bot ini dan menu bantuan hanya dapat diakses oleh *Admin*.\n\nJika Anda memiliki Kata Sandi, silakan daftarkan diri Anda dengan format:\n\n*!addadmin <kata_sandi>*\n\nContoh:\n*!addadmin rahasia123*`;
                    if (sockRef) {
                        await sockRef.sendMessage(remoteJid, { react: { text: '🔒', key: msg.key } }).catch(() => {});
                        await sockRef.sendMessage(remoteJid, { text: tutorialText }, { quoted: msg }).catch(() => {});
                    }
                }
                continue;
            }

            // ===== !addadmin =====
            if (textLower.startsWith('!addadmin')) {
                const args = textLower.split(' ');
                const isSuperAdmin = senderNum === config.SUPER_ADMIN.split('@')[0];
                const inputSandi = args[1];

                if (!isSuperAdmin) {
                    if (inputSandi && inputSandi === config.ADMIN_PASSWORD) {
                        if (!db.adminList.includes(senderNum)) {
                            db.adminList.push(senderNum);
                            db.saveAdmins();
                            logTime(`✅ +${senderNum} menjadi Admin menggunakan password`, 'log-success');
                            if (sockRef) {
                                await sockRef.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } }).catch(() => {});
                                await sockRef.sendMessage(remoteJid, { text: `✅ Sukses! Nomor Anda sekarang menjadi Admin.` }, { quoted: msg });
                            }
                        } else {
                            if (sockRef) await sockRef.sendMessage(remoteJid, { text: `⚠️ Anda sudah menjadi Admin.` }, { quoted: msg });
                        }
                    } else {
                        logTime(`⚠️ +${senderNum} ditolak akses admin (sandi salah)`, 'log-warn');
                        if (sockRef) await sockRef.sendMessage(remoteJid, { text: '❌ Password salah atau format tidak tepat.\n\nContoh: *!addadmin rahasia123*' }, { quoted: msg });
                    }
                    continue;
                }

                let newAdmin = args[1];
                if (!newAdmin && msg.message.extendedTextMessage?.contextInfo?.participant) {
                    newAdmin = msg.message.extendedTextMessage.contextInfo.participant.split('@')[0];
                }

                if (newAdmin) {
                    if (newAdmin === config.ADMIN_PASSWORD) {
                        if (sockRef) await sockRef.sendMessage(remoteJid, { text: `⚠️ Anda sudah menjadi Super Admin.` }, { quoted: msg });
                        continue;
                    }
                    newAdmin = newAdmin.replace(/[^0-9]/g, '');
                    if (!db.adminList.includes(newAdmin)) {
                        db.adminList.push(newAdmin);
                        db.saveAdmins();
                        logTime(`✅ Super Admin menambahkan +${newAdmin} sebagai Admin`, 'log-success');
                        if (sockRef) {
                            await sockRef.sendMessage(remoteJid, { react: { text: '✅', key: msg.key } }).catch(() => {});
                            await sockRef.sendMessage(remoteJid, { text: `✅ Sukses! Nomor ${newAdmin} sekarang Admin.` });
                        }
                    } else {
                        if (sockRef) await sockRef.sendMessage(remoteJid, { text: `⚠️ Nomor ${newAdmin} sudah Admin.` });
                    }
                } else {
                    if (sockRef) await sockRef.sendMessage(remoteJid, { text: '❌ Format: *!addadmin 628xxx* atau reply chat orangnya.' });
                }
                continue;
            }

            // ===== Media tanpa command =====
            if (isMediaMsg(msg) && !textLower.startsWith('!')) {
                logTime(`📸 Foto baru dari +${senderNum}, masuk antrean`, 'log-info');
                queue.push(msg);
                processQueue();
            }

            // ===== Reply command =====
            if (quotedId && sockRef) {
                const history = db.chatMemory[remoteJid] || [];
                try {
                    if (textLower === '!mulai') {
                        rangeStartIds[remoteJid] = quotedId;
                        logTime(`🚩 Titik awal ditetapkan oleh +${senderNum}`, 'log-info');
                        await sockRef.sendMessage(remoteJid, { react: { text: '🚩', key: msg.key } }).catch(() => {});
                    }
                    else if (textLower === '!ulang') {
                        const target = history.find(m => m.key.id === quotedId);
                        if (target) {
                            logTime(`🔄 +${senderNum} jalankan !ulang 1 foto`, 'log-info');
                            await sockRef.sendMessage(remoteJid, { react: { text: '🔄', key: msg.key } }).catch(() => {});
                            queue.push(target);
                            processQueue();
                        } else {
                            await sockRef.sendMessage(remoteJid, { react: { text: '❓', key: msg.key } }).catch(() => {});
                        }
                    }
                    else if (textLower === '!ulang rentang') {
                        if (rangeStartIds[remoteJid]) {
                            const sIdx = history.findIndex(m => m.key.id === rangeStartIds[remoteJid]);
                            const eIdx = history.findIndex(m => m.key.id === quotedId);
                            if (sIdx !== -1 && eIdx !== -1) {
                                logTime(`🔄 +${senderNum} jalankan !ulang rentang`, 'log-info');
                                await sockRef.sendMessage(remoteJid, { react: { text: '🔄', key: msg.key } }).catch(() => {});
                                for (let i = Math.min(sIdx, eIdx); i <= Math.max(sIdx, eIdx); i++) {
                                    if (isMediaMsg(history[i])) queue.push(history[i]);
                                }
                                processQueue();
                            } else {
                                await sockRef.sendMessage(remoteJid, { react: { text: '❓', key: msg.key } }).catch(() => {});
                            }
                            delete rangeStartIds[remoteJid];
                        } else {
                            await sockRef.sendMessage(remoteJid, { react: { text: '🚩', key: msg.key } }).catch(() => {});
                            await sockRef.sendMessage(remoteJid, { text: '❌ Tentukan titik awal dulu: reply foto + ketik !mulai' }, { quoted: msg });
                        }
                    }
                    else if (textLower === '!ulang semua') {
                        const sIdx = history.findIndex(m => m.key.id === quotedId);
                        if (sIdx !== -1) {
                            logTime(`🔄 +${senderNum} jalankan !ulang semua`, 'log-info');
                            await sockRef.sendMessage(remoteJid, { react: { text: '🔄', key: msg.key } }).catch(() => {});
                            for (let i = sIdx; i < history.length; i++) {
                                if (isMediaMsg(history[i])) queue.push(history[i]);
                            }
                            processQueue();
                        } else {
                            await sockRef.sendMessage(remoteJid, { react: { text: '❓', key: msg.key } }).catch(() => {});
                        }
                    }
                    else if (textLower.startsWith('!')) {
                        await sockRef.sendMessage(remoteJid, { react: { text: '❓', key: msg.key } }).catch(() => {});
                    }
                } catch (err) {
                    logTime(`🚨 Command Error +${senderNum}: ${err.message}`, 'log-error');
                    await sockRef.sendMessage(remoteJid, { react: { text: '🚨', key: msg.key } }).catch(() => {});
                }
            }

            // ===== !update (admin only) =====
            if (isAdmin && textLower === '!update' && sockRef) {
                logTime(`🚀 +${senderNum} jalankan !update dari GitHub...`, 'log-warn');
                await sockRef.sendMessage(remoteJid, { react: { text: '🚀', key: msg.key } }).catch(() => {});
                exec('git pull https://github.com/DvnPpy/bot_auto_save_resi_v2.git main', (err, stdout, stderr) => {
                    const out = stdout || stderr || (err ? err.message : '(no output)');
                    logTime(`✅ Git Pull selesai: ${out.trim()}`, 'log-success');
                    sockRef.sendMessage(remoteJid, { text: `✅ Update Berhasil!\n\n${out}` }).catch(() => {});
                    setTimeout(() => process.exit(0), 2000);
                });
            }

            // ===== !reboot (admin only) - Membutuhkan PM2 =====
            if (isAdmin && textLower === '!reboot' && sockRef) {
                logTime(`🔄 +${senderNum} melakukan Hard Restart program...`, 'log-warn');
                await sockRef.sendMessage(remoteJid, { react: { text: '🔄', key: msg.key } }).catch(() => {});
                await sockRef.sendMessage(remoteJid, { text: '🔄 Sistem Node.js sedang di-restart. Bot akan kembali online dalam beberapa detik...' }).catch(() => {});
                setTimeout(() => process.exit(0), 2000); 
            }
        }
    });
}

// Start
connectToWhatsApp();

// ==========================================
// 6. PENGAMAN SISTEM & ERROR CATCHER
// ==========================================
const safeShutdown = (label) => {
    try {
        logTime(`[!] ${label} terdeteksi. Menyimpan data...`, 'log-warn');
        db.saveHistory();
        db.saveAdmins();
    } catch (e) {
        console.error('Gagal save saat shutdown:', e.message);
    }
};

process.on('SIGINT', () => {
    safeShutdown('SIGINT (Ctrl+C)');
    process.exit(0);
});

process.on('SIGTERM', () => {
    safeShutdown('SIGTERM');
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    const errorMsg = `[CRASH] uncaughtException:\nPesan: ${err.message}\nStack: ${err.stack}`;
    logTime(errorMsg, 'log-error');
    safeShutdown('uncaughtException');
    setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
    const errorMsg = `[WARN] unhandledRejection: ${reason}`;
    logTime(errorMsg, 'log-warn');
});