const crypto = require('crypto');
const pool = require('../config/database');

const REFRESH_EXPIRY_DAYS = 1;

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function generateRefreshToken(userId, userType, tenantId) {
  const rawToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    'INSERT INTO refresh_tokens (token_hash, user_id, user_type, tenant_id, expires_at) VALUES (?, ?, ?, ?, ?)',
    [tokenHash, userId, userType, tenantId || null, expiresAt]
  );

  return rawToken;
}

async function verifyRefreshToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const [rows] = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0 AND expires_at > NOW() LIMIT 1',
    [tokenHash]
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  return { userId: row.user_id, userType: row.user_type, tenantId: row.tenant_id };
}

async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await pool.query('UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?', [tokenHash]);
}

async function revokeAllUserTokens(userId, userType) {
  await pool.query(
    'UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND user_type = ?',
    [userId, userType]
  );
}

async function cleanupExpiredTokens() {
  await pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = 1');
}

module.exports = {
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens,
};
