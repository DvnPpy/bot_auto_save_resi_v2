// ==========================================
// MESIN OCR & PEMROSESAN GAMBAR
// ==========================================
const axios = require('axios');
const sharp = require('sharp');
const config = require('./config');

let currentKeyIndex = 0;

// Getter agar GUI bisa menampilkan key aktif (tanpa expose penuh)
const getActiveKeyInfo = () => {
    const total = config.OCR_KEYS.length;
    if (!total) return { index: 0, total: 0, masked: 'N/A' };
    const k = config.OCR_KEYS[currentKeyIndex] || '';
    const masked = k.length > 6
        ? `${k.slice(0, 4)}***${k.slice(-3)}`
        : '***';
    return { index: currentKeyIndex + 1, total, masked };
};

// Kompresi agar di bawah 1 MB tapi tetap tajam untuk OCR
const compressForOCR = async (buffer) => {
    let quality = 95;
    let output = await sharp(buffer)
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();

    while (output.length > 1000000 && quality > 60) {
        quality -= 5;
        output = await sharp(buffer)
            .resize({ width: 1600, withoutEnlargement: true })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
    }
    return output;
};

const extractResiCloud = async (imageBuffer) => {
    if (!config.OCR_KEYS.length) {
        throw new Error('NO_API_KEY: Belum ada OCR_KEYS di config/.env');
    }

    try {
        const optimizedBuffer = await compressForOCR(imageBuffer);
        const base64Image = `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
        const apiKey = config.OCR_KEYS[currentKeyIndex];

        const formData = new URLSearchParams();
        formData.append('apikey', apiKey);
        formData.append('base64Image', base64Image);
        formData.append('OCREngine', '2');
        formData.append('scale', 'true');

        const response = await axios.post(
            'https://api.ocr.space/parse/image',
            formData.toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 25000
            }
        );

        const data = response.data;

        if (data.IsErroredOnProcessing) {
            let msg = '';
            if (data.ErrorMessage) {
                msg = Array.isArray(data.ErrorMessage)
                    ? data.ErrorMessage.join(' ').toLowerCase()
                    : String(data.ErrorMessage).toLowerCase();
            }
            if (msg.includes('limit') || msg.includes('too many')) {
                currentKeyIndex = (currentKeyIndex + 1) % config.OCR_KEYS.length;
                throw new Error('RATE_LIMIT');
            }
        }

        const resis = new Set();
        if (data.ParsedResults && data.ParsedResults.length > 0) {
            const text = data.ParsedResults[0].ParsedText || '';
            // Regex spesialis resi J&T (JP/JX/JD/JO/JZ + 8-15 digit, atau 13xxxx)
            const RESI_REGEX = /\b(J[P|X|D|O|Z][0-9]{8,15}|13[0-9]{10,15})\b/gi;
            const matches = text.match(RESI_REGEX);
            if (matches) matches.forEach(m => resis.add(m.toUpperCase()));
        }
        return resis;

    } catch (error) {
        // Tangkap rate limit dari server (HTTP 429) maupun pesan limit
        if (error.message === 'RATE_LIMIT' ||
            (error.response && error.response.status === 429)) {
            console.log('[!] API Key terkena limit. Rotasi kunci...');
            currentKeyIndex = (currentKeyIndex + 1) % config.OCR_KEYS.length;
            throw new Error('RATE_LIMIT');
        }
        // Timeout / network → kembalikan ke caller untuk retry
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            throw new Error('TIMEOUT');
        }
        console.error('OCR Space Error:', error.message);
        return new Set();
    }
};

module.exports = {
    extractResiCloud,
    compressForOCR,
    getActiveKeyInfo
};
