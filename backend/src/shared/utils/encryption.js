const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey() {
  const key = process.env.PLATFORM_ENCRYPTION_KEY || process.env.JWT_SECRET || 'worktrack-default-key-change-me';
  return crypto.createHash('sha256').update(key).digest();
}

function encrypt(text) {
  if (!text) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return '';
  if (!encryptedText.includes(':')) return encryptedText;
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) return encryptedText;
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText;
  }
}

module.exports = { encrypt, decrypt };
