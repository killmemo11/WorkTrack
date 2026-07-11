// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Asset & Resignation domain routes — extracted from routes.factory.js
const {
  getAssets, getAsset, createAsset, updateAsset, deleteAsset,
  assignAsset, returnAsset, markDamaged, disposeAsset,
  getAssetHistory,
} = require('../../modules/admin/admin-asset.controller');
const {
  getAllResignations, adminApproveResignation, adminRejectResignation,
} = require('../../modules/admin/admin-resignation.controller');
const {
  getAdminNotifications, getAdminUnreadCount, markAdminAsRead, markAllAdminAsRead,
} = require('../../modules/notification/notification.controller');

function mountAssetRoutes(router) {
  router.get('/assets', getAssets);
  router.get('/assets/:id', getAsset);
  router.post('/assets', createAsset);
  router.put('/assets/:id', updateAsset);
  router.delete('/assets/:id', deleteAsset);
  router.post('/assets/:id/assign', assignAsset);
  router.post('/assets/:id/return', returnAsset);
  router.post('/assets/:id/damaged', markDamaged);
  router.post('/assets/:id/dispose', disposeAsset);
  router.get('/assets/:id/history', getAssetHistory);

  router.get('/resignations', getAllResignations);
  router.put('/resignations/:id/approve', adminApproveResignation);
  router.put('/resignations/:id/reject', adminRejectResignation);

  router.get('/notifications', getAdminNotifications);
  router.get('/notifications/unread-count', getAdminUnreadCount);
  router.put('/notifications/read-all', markAllAdminAsRead);
  router.put('/notifications/:id/read', markAdminAsRead);
}

module.exports = { mountAssetRoutes };
