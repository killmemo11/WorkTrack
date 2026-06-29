// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { requireReadWrite } = require('../../shared/middleware/readonly.middleware');
const { requireLeaveService } = require('../../shared/middleware/leave-service.middleware');
const { register, verify, login, resendCode, me, logout, forgotPassword, resetPassword } = require('./auth.controller');
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
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);

router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

router.get('/leaves', authenticate, requireLeaveService, getMyLeaves);
router.post('/leaves', authenticate, requireLeaveService, requireReadWrite, createLeave);
router.delete('/leaves/:id', authenticate, requireLeaveService, cancelLeave);

router.get('/notifications', authenticate, getNotifications);
router.get('/notifications/unread-count', authenticate, getUnreadCount);
router.put('/notifications/read-all', authenticate, markAllAsRead);
router.put('/notifications/:id/read', authenticate, markAsRead);

module.exports = router;

