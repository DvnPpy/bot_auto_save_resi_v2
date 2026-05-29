# 📦 Bot WhatsApp Auto-Save Resi J&T Express

Bot WhatsApp otomatis untuk membaca dan menyimpan foto resi (AWB) J&T Express menggunakan OCR.Space, dengan dashboard GUI real-time berbasis Express + Socket.io.

## ✨ Fitur

- **Auto OCR resi J&T** (JP/JX/JD/JO/JZ + 13xxxx) dari foto via OCR.Space Engine 2
- **Auto-rename** file gambar sesuai nomor resi → `NOMORRESI.jpg`
- **Folder harian otomatis**: `POD_DD_Bulan_YYYY/`
- **Dashboard GUI Real-Time** (Express + Socket.io) di port `3000`
  - Live activity log dengan auto-scroll
  - Pairing code display (update via WebSocket)
  - **Input nomor bot dari browser** (tanpa edit kode)
  - Tombol **New Session** (logout & pairing ulang)
  - Tombol **Restart Bot** (reconnect)
  - Statistik real-time: queue, sukses, gagal
- **Sistem Antrean (Queue)** asinkron dengan `MAX_CONCURRENT=2` untuk hindari rate limit
- **Rotasi API Key OCR** otomatis saat rate limit (HTTP 429 / "limit"/"too many")
- **Auto-retry** sekali jika OCR pertama gagal baca → reaksi 🔄
- **Auto-pruning** chat memory & **auto-cleanup** folder POD_ > 60 hari
- **Logging mendetail** per sesi: `logs/bot_log_DD-MM-YYYY_HH-MM.txt` (zona WIB)
- **Auto-open browser** di Windows/macOS
- **Sistem command** (`!help`, `!ulang`, `!mulai`, `!ulang rentang`, `!ulang semua`, `!addadmin`, `!update`)
- **Boot animation** progress bar (0% → 100%) ke Super Admin

## 📁 Struktur File

```
wa-bot/
├── config.js            # Pusat pengaturan (load dari .env)
├── database.js          # JSON storage + auto-cleanup folder
├── ocrEngine.js         # OCR.Space + kompresi sharp
├── index.js             # Core bot, GUI, queue, command
├── package.json
├── .env.example         # Template konfigurasi
├── .env                 # File konfigurasi aktif (jangan commit!)
└── README.md
```

## 🚀 Setup & Run

### 1. Install dependencies

```bash
cd wa-bot
yarn install
```

### 2. Konfigurasi `.env`

Salin dan edit:

```bash
cp .env.example .env
nano .env
```

Yang **wajib** diisi:

| Variable | Keterangan |
|---|---|
| `BOT_NUMBER` | Nomor WA bot (cth `628123456789`). Boleh kosong, isi via GUI |
| `SUPER_ADMIN` | JID Super Admin (cth `628xxx@s.whatsapp.net`) |
| `OCR_KEYS` | API key OCR.Space, pisahkan koma untuk multi-key rotasi |

### 3. Jalankan bot

```bash
yarn start
# atau
node index.js
```

### 4. Buka Dashboard

```
http://localhost:3000
```

- Di Windows/macOS akan auto-open browser
- Di Linux, buka manual

### 5. Pairing

**Opsi A — via Dashboard (recommended):**
1. Buka `http://localhost:3000`
2. Masukkan nomor bot di field "Nomor Bot WhatsApp"
3. Klik **Request Pairing Code**
4. Buka WhatsApp di HP → Linked Devices → Link with phone number → masukkan kode

**Opsi B — via .env:**
1. Set `BOT_NUMBER=628xxxxx` di `.env`
2. Restart bot
3. Pairing code muncul di console & dashboard

## 💬 Perintah Bot

| Perintah | Akses | Deskripsi |
|---|---|---|
| Kirim foto resi | Semua | Auto-baca & simpan |
| `!help` / `!menu` | Semua | Tampilkan panduan |
| `!ulang` (reply foto) | Semua | Scan ulang 1 foto |
| `!mulai` (reply foto) | Semua | Tandai titik awal rentang |
| `!ulang rentang` (reply foto) | Semua | Scan dari titik awal s/d foto ini |
| `!ulang semua` (reply foto) | Semua | Scan dari foto ini s/d terbaru |
| `!addadmin 628xxx` atau reply | Super Admin | Tambah admin |
| `!update` | Admin | `git pull` & restart bot |

## 🔄 Manajemen Koneksi (via GUI)

- **Request Pairing Code** — minta kode pairing ulang dengan nomor baru
- **New Session (Logout)** — hapus folder `baileys_auth/` & request pairing baru
- **Restart Bot** — reconnect tanpa hapus auth

## 📂 Output

```
POD_STORAGE/
└── POD_14_Februari_2026/
    ├── JP1234567890123.jpg     # OCR sukses
    ├── JX9876543210987.jpg
    └── AA_GAGAL_BACA_1739509200000.jpg  # OCR gagal 2x
```

## 🔧 Konfigurasi Lanjutan

Edit `.env`:

```env
MAX_CONCURRENT=2           # Concurrent OCR (kurangi jika sering kena limit)
MAX_MESSAGES=2000          # Max chat history per JID
RETENTION_DAYS=60          # Auto-delete folder POD_ > X hari
GUI_PORT=3000              # Port dashboard
AUTO_OPEN_BROWSER=true     # Auto-open di Windows/macOS
```

## 🚨 Troubleshooting

| Masalah | Solusi |
|---|---|
| Pairing code tidak muncul | Pastikan `BOT_NUMBER` benar (tanpa `+`), tunggu 3 detik setelah restart |
| `RATE_LIMIT` terus-menerus | Tambah API key OCR di `OCR_KEYS` (pisah koma) |
| Bot crash / disconnect | Auto-reconnect aktif. Cek `logs/` jika problem persists |
| Port 3000 dipakai | Ubah `GUI_PORT` di `.env` |
| Logged out | Klik **New Session** di dashboard |

## 📜 Logs

Setiap sesi booting menghasilkan file log baru:
```
logs/bot_log_14-02-2026_09-30.txt
```

## 🔐 Keamanan

- File `baileys_auth/`, `.env`, `history_resi.json`, `admins.json` **JANGAN** commit ke Git
- `.gitignore` sudah disiapkan

## 📦 Tech Stack

- **Baileys** (`@whiskeysockets/baileys`) — WhatsApp Web protocol
- **Express + Socket.io** — Dashboard real-time
- **Sharp** — Kompresi gambar (mozjpeg, chroma 4:4:4)
- **Axios** — HTTP client untuk OCR.Space
- **OCR.Space Engine 2** — Text recognition
- **Pino** — Silent logger

---

**Developed by delfin** · For J&T Express resi automation
