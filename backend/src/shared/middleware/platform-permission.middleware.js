// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');
const logger = require('../utils/logger');

const CACHE_TTL_MS = 60 * 1000;
const accessCache = new Map();

async function getPlatformAccess(adminId) {
  const cached = accessCache.get(adminId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached;
  }

  const [rows] = await pool.query(
    `SELECT r.name AS role_name, pp.perm_key
     FROM platform_user_roles pur
     JOIN platform_roles r ON r.id = pur.role_id
     LEFT JOIN platform_role_permissions prp ON prp.role_id = r.id
     LEFT JOIN platform_permissions pp ON pp.id = prp.permission_id
     WHERE pur.admin_user_id = ?`,
    [adminId]
  );

  const roles = new Set();
  const permissions = new Set();
  for (const row of rows) {
    if (row.role_name) roles.add(row.role_name);
    if (row.perm_key) permissions.add(row.perm_key);
  }

  const access = { roles, permissions, loadedAt: Date.now() };
  accessCache.set(adminId, access);
  return access;
}

function requirePlatformPermission(permKey) {
  return async (req, res, next) => {
    try {
      const adminId = req.platformAdmin?.id;
      if (!adminId) {
        return res.status(401).json({ error: 'Platform authentication required' });
      }

      const access = await getPlatformAccess(adminId);
      if (access.roles.has('owner') || access.permissions.has(permKey)) {
        return next();
      }

      return res.status(403).json({ error: `Platform permission required: ${permKey}` });
    } catch (err) {
      logger.error('Platform permission check failed:', err);
      return res.status(500).json({ error: 'Failed to verify platform permission' });
    }
  };
}

function clearPlatformAccessCache(adminId) {
  if (adminId === undefined || adminId === null) {
    accessCache.clear();
    return;
  }
  accessCache.delete(adminId);
}

module.exports = {
  getPlatformAccess,
  requirePlatformPermission,
  clearPlatformAccessCache,
};
