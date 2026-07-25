const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXCLUDED_PATHS = new Set([
  '/api/contact',
  '/api/magic-link/request-magic-link',
  '/api/magic-link/verify-and-set-password',
  '/api/public/send-verification-code',
  '/api/public/verify-email-code',
  '/api/public/tenant-signup',
  '/api/public/payment-info',
  '/api/public/track-request',
  '/api/platform/auth/login',
  '/api/auth/login',
  '/api/admin/auth/login',
  '/api/auth/refresh',
  '/api/auth/register',
  '/api/auth/verify',
  '/api/auth/resend-code',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/api/apply',
  '/api/interviews/respond',
]);

function csrfProtection(req, res, next) {
  // Skip safe methods (GET/HEAD/OPTIONS) — they don't mutate state
  if (SAFE_METHODS.has(req.method)) {
    // Set CSRF cookie on safe methods so the client can read it
    if (!req.cookies[CSRF_COOKIE_NAME]) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 1000, // 1 hour
      });
    }
    return next();
  }

  // Skip excluded paths (public endpoints, login, etc.)
  const basePath = req.path.split('?')[0];
  if (EXCLUDED_PATHS.has(basePath) || [...EXCLUDED_PATHS].some(p => basePath.startsWith(p))) {
    return next();
  }

  // For state-changing methods (POST/PUT/PATCH/DELETE), validate CSRF
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  // Use timing-safe comparison
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }

  next();
}

module.exports = { csrfProtection, CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
