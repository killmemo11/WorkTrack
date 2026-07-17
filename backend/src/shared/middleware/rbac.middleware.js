// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

const permissionCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

async function getUserPermissions(userId, userType, tenantId) {
  const cacheKey = `${userId}:${userType}:${tenantId}`;
  const cached = permissionCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.perms;

  let query, params;
  if (userType === 'admin') {
    query = `
      SELECT p.module, p.action
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ? AND ur.user_type = 'admin' AND p.tenant_id = ?
    `;
    params = [userId, tenantId];
  } else {
    query = `
      SELECT p.module, p.action
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ? AND ur.user_type = 'employee' AND p.tenant_id = ?
    `;
    params = [userId, tenantId];
  }

  const [rows] = await pool.query(query, params);
  const perms = new Set(rows.map(r => `${r.module}.${r.action}`));
  permissionCache.set(cacheKey, { perms, ts: Date.now() });
  return perms;
}

function requirePermission(permKey) {
  return async (req, res, next) => {
    const userId = req.admin?.id || req.employee?.id || req.hr?.id;
    const userType = (req.admin && req.admin.type === 'admin') ? 'admin' : 'employee';
    const tenantId = req.tenantId || 1;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const perms = await getUserPermissions(userId, userType, tenantId);

    // Super check: if user has 'admin.*' (tenant_admin role has all perms)
    const [module] = permKey.split('.');
    if (perms.has(`admin.${module}`) || perms.has('*')) {
      return next();
    }

    if (!perms.has(permKey)) {
      return res.status(403).json({ error: `Permission required: ${permKey}` });
    }

    next();
  };
}

// Check multiple permissions (OR logic - user needs at least one)
function requireAnyPermission(permKeys) {
  return async (req, res, next) => {
    const userId = req.admin?.id || req.employee?.id || req.hr?.id;
    const userType = (req.admin && req.admin.type === 'admin') ? 'admin' : 'employee';
    const tenantId = req.tenantId || 1;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const perms = await getUserPermissions(userId, userType, tenantId);

    const hasAny = permKeys.some(key => perms.has(key));
    if (!hasAny) {
      return res.status(403).json({ error: `One of these permissions required: ${permKeys.join(', ')}` });
    }

    next();
  };
}

// Check all permissions (AND logic - user needs all)
function requireAllPermissions(permKeys) {
  return async (req, res, next) => {
    const userId = req.admin?.id || req.employee?.id || req.hr?.id;
    const userType = (req.admin && req.admin.type === 'admin') ? 'admin' : 'employee';
    const tenantId = req.tenantId || 1;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const perms = await getUserPermissions(userId, userType, tenantId);

    const hasAll = permKeys.every(key => perms.has(key));
    if (!hasAll) {
      return res.status(403).json({ error: 'Missing required permissions' });
    }

    next();
  };
}

// Attach permissions to req for use in controllers
async function attachPermissions(req, res, next) {
  const userId = req.admin?.id || req.employee?.id || req.hr?.id;
  const userType = (req.admin && req.admin.type === 'admin') ? 'admin' : 'employee';
  const tenantId = req.tenantId || 1;

  if (userId) {
    req.userPermissions = await getUserPermissions(userId, userType, tenantId);
  }
  next();
}

function clearPermissionCache(userId, tenantId) {
  if (userId === null || userId === undefined) {
    for (const key of permissionCache.keys()) {
      if (key.endsWith(`:${tenantId}`)) permissionCache.delete(key);
    }
    return;
  }
  const keys = [`${userId}:admin:${tenantId}`, `${userId}:employee:${tenantId}`];
  for (const key of keys) permissionCache.delete(key);
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  attachPermissions,
  getUserPermissions,
  clearPermissionCache,
};