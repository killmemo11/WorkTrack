require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./src/shared/config/database');

(async () => {
  try {
    const [rows] = await pool.query('SELECT * FROM admin_users WHERE is_platform_admin = 1');
    const admin = rows[0];
    console.log('Admin found:', admin.username);
    console.log('PLATFORM_ADMIN_PASSWORD:', process.env.PLATFORM_ADMIN_PASSWORD);
    console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);

    const valid = await bcrypt.compare(process.env.PLATFORM_ADMIN_PASSWORD || 'worktrack_owner_2026', admin.password_hash);
    console.log('Password valid:', valid);

    const token = jwt.sign(
      { id: admin.id, username: admin.username, email: admin.email, type: 'platform_admin', is_platform_admin: true },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'worktrack', audience: 'platform', algorithm: 'HS256' }
    );
    console.log('Token created OK');

    const tokenService = require('./src/shared/services/token.service');
    const refresh = await tokenService.generateRefreshToken(admin.id, 'platform', null);
    console.log('Refresh created OK');

    const { logActivity } = require('./src/shared/services/activity.service');
    await logActivity(null, admin.id, 'test', 'test login');
    console.log('Activity logged OK');

    console.log('ALL OK');
  } catch (e) {
    console.error('ERROR:', e.message);
    console.error('STACK:', e.stack);
  }
  process.exit(0);
})();
