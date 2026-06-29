// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');

async function getChecklistTemplates(req, res) {
  const { type } = req.query;
  let where = '1=1'; let params = [];
  if (type) { where = 'type = ?'; params.push(type); }
  const [templates] = await pool.query(`SELECT * FROM checklist_templates WHERE ${where} ORDER BY name`, params);
  if (templates.length > 0) {
    const ids = templates.map(t => t.id);
    const [allItems] = await pool.query(
      `SELECT * FROM checklist_items WHERE template_id IN (${ids.map(() => '?').join(',')}) ORDER BY template_id, order_index`,
      ids
    );
    const itemsByTemplate = {};
    for (const item of allItems) {
      if (!itemsByTemplate[item.template_id]) itemsByTemplate[item.template_id] = [];
      itemsByTemplate[item.template_id].push(item);
    }
    for (const t of templates) {
      t.items = itemsByTemplate[t.id] || [];
    }
  }
  res.json(templates);
}

async function createChecklistTemplate(req, res) {
  const adminId = req.admin?.id || req.hr?.id || null;
  const { name, type, department_id } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
  const [result] = await pool.query(
    'INSERT INTO checklist_templates (name, type, department_id) VALUES (?, ?, ?)',
    [name.trim(), type, department_id || null]
  );
  logActivity(null, adminId, 'checklist_template_created', `Created ${type} template: ${name}`);
  res.status(201).json({ id: result.insertId, message: 'Template created' });
}

async function updateChecklistTemplate(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { name, type, department_id, is_active } = req.body;
  const fields = []; const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (type !== undefined) { fields.push('type = ?'); values.push(type); }
  if (department_id !== undefined) { fields.push('department_id = ?'); values.push(department_id || null); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields' });
  values.push(id);
  await pool.query(`UPDATE checklist_templates SET ${fields.join(', ')} WHERE id = ?`, values);
  logActivity(null, adminId, 'checklist_template_updated', `Updated template #${id}`);
  res.json({ message: 'Template updated' });
}

async function deleteChecklistTemplate(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  await pool.query('DELETE FROM checklist_templates WHERE id = ?', [id]);
  logActivity(null, adminId, 'checklist_template_deleted', `Deleted template #${id}`);
  res.json({ message: 'Template deleted' });
}

async function addChecklistItem(req, res) {
  const { template_id } = req.params;
  const { task_name, assigned_to, order_index, is_required, days_offset } = req.body;
  if (!task_name) return res.status(400).json({ error: 'Task name is required' });
  const [result] = await pool.query(
    'INSERT INTO checklist_items (template_id, task_name, assigned_to, order_index, is_required, days_offset) VALUES (?, ?, ?, ?, ?, ?)',
    [template_id, task_name, assigned_to || 'admin', order_index || 0, is_required !== undefined ? is_required : 1, days_offset || 0]
  );
  res.status(201).json({ id: result.insertId, message: 'Item added' });
}

async function updateChecklistItem(req, res) {
  const { item_id } = req.params;
  const { task_name, assigned_to, order_index, is_required, days_offset } = req.body;
  const fields = []; const values = [];
  if (task_name !== undefined) { fields.push('task_name = ?'); values.push(task_name); }
  if (assigned_to !== undefined) { fields.push('assigned_to = ?'); values.push(assigned_to); }
  if (order_index !== undefined) { fields.push('order_index = ?'); values.push(order_index); }
  if (is_required !== undefined) { fields.push('is_required = ?'); values.push(is_required); }
  if (days_offset !== undefined) { fields.push('days_offset = ?'); values.push(days_offset); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields' });
  values.push(item_id);
  await pool.query(`UPDATE checklist_items SET ${fields.join(', ')} WHERE id = ?`, values);
  res.json({ message: 'Item updated' });
}

async function deleteChecklistItem(req, res) {
  const { item_id } = req.params;
  await pool.query('DELETE FROM checklist_items WHERE id = ?', [item_id]);
  res.json({ message: 'Item deleted' });
}

async function startEmployeeChecklist(req, res) {
  const employeeId = req.params.id;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { template_id } = req.body;
  if (!template_id) return res.status(400).json({ error: 'Template ID is required' });

  const [existing] = await pool.query(
    'SELECT id FROM employee_checklists WHERE employee_id = ? AND template_id = ? AND status = ?',
    [employeeId, template_id, 'in_progress']
  );
  if (existing.length > 0) return res.status(400).json({ error: 'An active checklist already exists for this template' });

  const [result] = await pool.query(
    'INSERT INTO employee_checklists (employee_id, template_id, started_date) VALUES (?, ?, CURDATE())',
    [employeeId, template_id]
  );
  const checklistId = result.insertId;

  const [items] = await pool.query('SELECT * FROM checklist_items WHERE template_id = ? ORDER BY order_index', [template_id]);
  if (items.length > 0) {
    const values = items.map(item => `(${checklistId}, ${item.id}, 'pending')`).join(',');
    await pool.query(
      `INSERT INTO employee_checklist_tasks (checklist_id, item_id, status) VALUES ${values}`
    );
  }

  logActivity(employeeId, adminId, 'checklist_started', `Started checklist template #${template_id}`);
  res.status(201).json({ id: checklistId, message: 'Checklist started' });
}

async function getEmployeeChecklists(req, res) {
  const employeeId = req.params.id;
  const [rows] = await pool.query(
    `SELECT ec.*, ct.name AS template_name, ct.type
     FROM employee_checklists ec
     JOIN checklist_templates ct ON ec.template_id = ct.id
     WHERE ec.employee_id = ?
     ORDER BY ec.created_at DESC`, [employeeId]
  );
  res.json(rows);
}

async function getChecklistDetail(req, res) {
  const { checklist_id } = req.params;
  const [chk] = await pool.query(
    `SELECT ec.*, ct.name AS template_name, ct.type
     FROM employee_checklists ec
     JOIN checklist_templates ct ON ec.template_id = ct.id
     WHERE ec.id = ?`, [checklist_id]
  );
  if (chk.length === 0) return res.status(404).json({ error: 'Checklist not found' });
  const [tasks] = await pool.query(
    `SELECT eck.*, ci.task_name, ci.assigned_to, ci.order_index, ci.is_required,
            e.name AS assigned_to_employee_name, au.username AS completed_by_name
     FROM employee_checklist_tasks eck
     JOIN checklist_items ci ON eck.item_id = ci.id
     LEFT JOIN employees e ON eck.assigned_to_employee_id = e.id
     LEFT JOIN admin_users au ON eck.completed_by = au.id
     WHERE eck.checklist_id = ?
     ORDER BY ci.order_index`, [checklist_id]
  );
  res.json({ checklist: chk[0], tasks });
}

async function completeTask(req, res) {
  const { checklist_id, task_id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { notes } = req.body;

  await pool.query(
    "UPDATE employee_checklist_tasks SET status = 'completed', completed_date = CURDATE(), notes = ?, completed_by = ? WHERE id = ? AND checklist_id = ?",
    [notes || null, adminId, task_id, checklist_id]
  );

  // Check if all tasks completed → update checklist status
  const [pending] = await pool.query(
    "SELECT COUNT(*) as cnt FROM employee_checklist_tasks WHERE checklist_id = ? AND status != 'completed'", [checklist_id]
  );
  if (pending[0].cnt === 0) {
    await pool.query("UPDATE employee_checklists SET status = 'completed' WHERE id = ?", [checklist_id]);
  }

  logActivity(null, adminId, 'checklist_task_completed', `Completed task #${task_id} in checklist #${checklist_id}`);
  res.json({ message: 'Task completed' });
}

async function getMyPendingTasks(req, res) {
  const employeeId = req.employee.id;
  const [rows] = await pool.query(
    `SELECT eck.*, ci.task_name, ci.assigned_to, ec.employee_id AS target_employee_id,
            e.name AS target_employee_name, ct.name AS template_name, ct.type
     FROM employee_checklist_tasks eck
     JOIN employee_checklists ec ON eck.checklist_id = ec.id
     JOIN checklist_items ci ON eck.item_id = ci.id
     JOIN checklist_templates ct ON ec.template_id = ct.id
     JOIN employees e ON ec.employee_id = e.id
     WHERE (eck.assigned_to_employee_id = ? OR (eck.assigned_to_employee_id IS NULL AND ci.assigned_to = 'admin'))
       AND eck.status = 'pending'
     ORDER BY ec.created_at ASC`, [employeeId]
  );
  res.json(rows);
}

module.exports = {
  getChecklistTemplates, createChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate,
  addChecklistItem, updateChecklistItem, deleteChecklistItem,
  startEmployeeChecklist, getEmployeeChecklists, getChecklistDetail, completeTask,
  getMyPendingTasks,
};
