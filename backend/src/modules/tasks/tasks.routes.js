const express = require('express');
const router = express.Router();
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { resolveTenant } = require('../../shared/middleware/tenant.middleware');
const { createTask, listTasks, getTask, updateTask, updateTaskStatus, deleteTask } = require('./tasks.controller');

router.use(authenticate);
router.use(resolveTenant);

router.post('/', createTask);
router.get('/', listTasks);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', deleteTask);

module.exports = router;
