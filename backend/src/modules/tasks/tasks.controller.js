const pool = require('../../shared/config/database');

const MANAGER_ROLES = ['manager', 'admin', 'ceo'];

async function canAssign(req, targetEmployeeId) {
  const empId = req.employee.id;

  // Admin/CEO can assign to anyone
  if (req.employee.role === 'admin' || req.employee.role === 'ceo') return true;

  // Manager: target must be in same department
  if (req.employee.role === 'manager') {
    const [target] = await pool.query('SELECT department_id FROM employees WHERE id = ?', [targetEmployeeId]);
    if (target.length && target[0].department_id === req.employee.department_id) return true;
  }

  // Supervisor: target must have supervisor_id = current employee
  const [profile] = await pool.query(
    'SELECT employee_id FROM employee_profiles WHERE supervisor_id = ? AND employee_id = ?',
    [empId, targetEmployeeId]
  );
  if (profile.length) return true;

  return false;
}

async function createTask(req, res) {
  const { title, description, assigned_to, priority, due_date } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!assigned_to) return res.status(400).json({ error: 'assigned_to is required' });

  if (!await canAssign(req, assigned_to)) {
    return res.status(403).json({ error: 'You can only assign tasks to your team members' });
  }

  const [result] = await pool.query(
    'INSERT INTO tasks (title, description, assigned_by, assigned_to, priority, due_date, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title.trim(), description || null, req.employee.id, assigned_to, priority || 'medium', due_date || null, req.tenantId || null]
  );

  const [task] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
  res.status(201).json(task[0]);
}

async function listTasks(req, res) {
  const empId = req.employee.id;
  const { mine, page = 1, limit = 20, status, priority, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const pageSize = parseInt(limit);

  let whereClause = '';
  const params = [];

  // Tenant isolation: always filter by tenant_id if set
  if (req.tenantId) {
    whereClause = 'WHERE t.tenant_id = ?';
    params.push(req.tenantId);
  }

  if (mine === 'true') {
    whereClause += whereClause ? ' AND t.assigned_to = ?' : 'WHERE t.assigned_to = ?';
    params.push(empId);
  } else if (MANAGER_ROLES.includes(req.employee.role)) {
    whereClause += whereClause ? ' AND (t.assigned_by = ? OR t.assigned_to IN (SELECT id FROM employees WHERE department_id = ?))' : 'WHERE (t.assigned_by = ? OR t.assigned_to IN (SELECT id FROM employees WHERE department_id = ?))';
    params.push(empId, req.employee.department_id);
  } else {
    whereClause += whereClause ? ' AND t.assigned_to = ?' : 'WHERE t.assigned_to = ?';
    params.push(empId);
  }

  if (status) {
    whereClause += ' AND t.status = ?';
    params.push(status);
  }
  if (priority) {
    whereClause += ' AND t.priority = ?';
    params.push(priority);
  }
  if (search) {
    whereClause += ' AND t.title LIKE ?';
    params.push(`%${search}%`);
  }

  const [rows] = await pool.query(
    `SELECT t.*, 
      assigned_by_emp.name AS assigned_by_name,
      assigned_to_emp.name AS assigned_to_name
     FROM tasks t
     JOIN employees assigned_by_emp ON t.assigned_by = assigned_by_emp.id
     JOIN employees assigned_to_emp ON t.assigned_to = assigned_to_emp.id
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  res.json(rows);
}

async function getTask(req, res) {
  const [rows] = await pool.query(
    `SELECT t.*, 
      assigned_by_emp.name AS assigned_by_name,
      assigned_to_emp.name AS assigned_to_name
     FROM tasks t
     JOIN employees assigned_by_emp ON t.assigned_by = assigned_by_emp.id
     JOIN employees assigned_to_emp ON t.assigned_to = assigned_to_emp.id
     WHERE t.id = ? AND (t.tenant_id = ? OR t.tenant_id IS NULL)`,
    [req.params.id, req.tenantId || null]
  );
  if (!rows.length) return res.status(404).json({ error: 'Task not found' });

  const task = rows[0];
  if (task.assigned_to !== req.employee.id && task.assigned_by !== req.employee.id && !MANAGER_ROLES.includes(req.employee.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json(task);
}

async function updateTask(req, res) {
  const { title, description, priority, due_date, notes } = req.body;
  const tenantFilter = req.tenantId ? ' AND (t.tenant_id = ? OR t.tenant_id IS NULL)' : '';
  const tenantParams = req.tenantId ? [req.params.id, req.tenantId] : [req.params.id];
  const [rows] = await pool.query(`SELECT * FROM tasks t WHERE t.id = ?${tenantFilter}`, tenantParams);
  if (!rows.length) return res.status(404).json({ error: 'Task not found' });

  const task = rows[0];
  if (task.assigned_by !== req.employee.id && !MANAGER_ROLES.includes(req.employee.role)) {
    return res.status(403).json({ error: 'Only the creator can edit this task' });
  }

  await pool.query(
    'UPDATE tasks SET title = ?, description = ?, priority = ?, due_date = ?, notes = ? WHERE id = ?',
    [
      title || task.title,
      description !== undefined ? description : task.description,
      priority || task.priority,
      due_date !== undefined ? due_date : task.due_date,
      notes !== undefined ? notes : task.notes,
      req.params.id
    ]
  );

  const [updated] = await pool.query(
    `SELECT t.*, 
      assigned_by_emp.name AS assigned_by_name,
      assigned_to_emp.name AS assigned_to_name
     FROM tasks t
     JOIN employees assigned_by_emp ON t.assigned_by = assigned_by_emp.id
     JOIN employees assigned_to_emp ON t.assigned_to = assigned_to_emp.id
     WHERE t.id = ?`,
    [req.params.id]
  );
  res.json(updated[0]);
}

async function updateTaskStatus(req, res) {
  const { status } = req.body;
  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const tenantFilter = req.tenantId ? ' AND (t.tenant_id = ? OR t.tenant_id IS NULL)' : '';
  const tenantParams = req.tenantId ? [req.params.id, req.tenantId] : [req.params.id];
  const [rows] = await pool.query(`SELECT * FROM tasks t WHERE t.id = ?${tenantFilter}`, tenantParams);
  if (!rows.length) return res.status(404).json({ error: 'Task not found' });

  const task = rows[0];
  if (task.assigned_to !== req.employee.id && task.assigned_by !== req.employee.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  await pool.query('UPDATE tasks SET status = ? WHERE id = ?', [status, req.params.id]);

  const [updated] = await pool.query(
    `SELECT t.*, 
      assigned_by_emp.name AS assigned_by_name,
      assigned_to_emp.name AS assigned_to_name
     FROM tasks t
     JOIN employees assigned_by_emp ON t.assigned_by = assigned_by_emp.id
     JOIN employees assigned_to_emp ON t.assigned_to = assigned_to_emp.id
     WHERE t.id = ?`,
    [req.params.id]
  );
  res.json(updated[0]);
}

async function deleteTask(req, res) {
  const tenantFilter = req.tenantId ? ' AND (t.tenant_id = ? OR t.tenant_id IS NULL)' : '';
  const tenantParams = req.tenantId ? [req.params.id, req.tenantId] : [req.params.id];
  const [rows] = await pool.query(`SELECT * FROM tasks t WHERE t.id = ?${tenantFilter}`, tenantParams);
  if (!rows.length) return res.status(404).json({ error: 'Task not found' });

  const task = rows[0];
  if (task.assigned_by !== req.employee.id && !MANAGER_ROLES.includes(req.employee.role)) {
    return res.status(403).json({ error: 'Only the creator can delete this task' });
  }

  await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ message: 'Task deleted' });
}

module.exports = { createTask, listTasks, getTask, updateTask, updateTaskStatus, deleteTask };
