const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { resolveTenant } = require('../../shared/middleware/tenant.middleware');
const { requirePermission } = require('../../shared/middleware/rbac.middleware');
const { createTask, listTasks, getTask, updateTask, updateTaskStatus, deleteTask } = require('./tasks.controller');

router.use(authenticate);
router.use(resolveTenant);

router.post('/', requirePermission('tasks.create'), createTask);
router.get('/', listTasks);
router.get('/:id', getTask);
router.put('/:id', requirePermission('tasks.update'), updateTask);
router.patch('/:id/status', requirePermission('tasks.update'), updateTaskStatus);
router.delete('/:id', requirePermission('tasks.delete'), deleteTask);

module.exports = router;
