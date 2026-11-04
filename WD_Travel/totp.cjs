const {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes
} = require('node:crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_DIGITS = 6;
const TOTP_STEP_SECONDS = 30;
// Acepta el código actual y el anterior/siguiente para tolerar desfase de reloj.
const TOTP_WINDOW_STEPS = 1;
const ISSUER = 'WD Travel';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(text) {
  const clean = String(text).replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Secreto TOTP inválido.');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

function generateHotp(secretBuffer, counter) {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secretBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24)
    | (hmac[offset + 1] << 16)
    | (hmac[offset + 2] << 8)
    | hmac[offset + 3];
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

// Devuelve el número de paso (time step) que coincide con el código, o null.
function verifyTotp(secretBase32, code, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;

  const secret = base32Decode(secretBase32);
  const currentStep = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  for (let offset = -TOTP_WINDOW_STEPS; offset <= TOTP_WINDOW_STEPS; offset += 1) {
    const step = currentStep + offset;
    if (generateHotp(secret, step) === code) return step;
  }
  return null;
}

function buildOtpauthUrl(email, secretBase32) {
  const label = encodeURIComponent(`${ISSUER}:${email}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

// El secreto se guarda cifrado (AES-256-GCM) para que la base de datos no lo exponga.
function getEncryptionKey(rawKey) {
  return createHash('sha256').update(rawKey).digest();
}

function encryptSecret(secretBase32, rawKey) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(rawKey), iv);
  const encrypted = Buffer.concat([cipher.update(secretBase32, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(payload, rawKey) {
  const [ivHex, tagHex, dataHex] = String(payload).split(':');
  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(rawKey), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final()
  ]).toString('utf8');
}

module.exports = {
  buildOtpauthUrl,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  verifyTotp
};
