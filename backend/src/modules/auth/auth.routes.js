// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { requireReadWrite } = require('../../shared/middleware/readonly.middleware');
const { requireLeaveService } = require('../../shared/middleware/leave-service.middleware');
const { resolveTenant } = require('../../shared/middleware/tenant.middleware');
const { register, verify, login, resendCode, me, logout, forgotPassword, resetPassword, hasEmployees } = require('./auth.controller');
const { updateProfile, changePassword } = require('../profile/profile.controller');
const { getMyLeaves, createLeave, cancelLeave } = require('../leave/leave.controller');
const { getNotifications, getUnreadCount, markAsRead, markAllAsRead } = require('../notification/notification.controller');

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts. Try again later.' } });

router.post('/register', authLimiter, register);
router.post('/verify', authLimiter, verify);
router.post('/login', authLimiter, login);
router.post('/resend-code', authLimiter, resendCode);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/has-employees', hasEmployees);
router.get('/me', authenticate, resolveTenant, me);
router.post('/logout', logout);

router.put('/profile', authenticate, resolveTenant, updateProfile);
router.put('/change-password', authenticate, resolveTenant, changePassword);

router.get('/leaves', authenticate, resolveTenant, requireLeaveService, getMyLeaves);
router.post('/leaves', authenticate, resolveTenant, requireLeaveService, requireReadWrite, createLeave);
router.delete('/leaves/:id', authenticate, resolveTenant, requireLeaveService, cancelLeave);

router.get('/notifications', authenticate, resolveTenant, getNotifications);
router.get('/notifications/unread-count', authenticate, resolveTenant, getUnreadCount);
router.put('/notifications/read-all', authenticate, resolveTenant, markAllAsRead);
router.put('/notifications/:id/read', authenticate, resolveTenant, markAsRead);

module.exports = router;

