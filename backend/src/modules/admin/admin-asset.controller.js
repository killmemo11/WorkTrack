// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { createAssetBody, updateAssetBody, assignAssetBody, returnAssetBody, markDamagedBody, disposeAssetBody } = require('../../shared/validations/schemas');

async function getAssets(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const { category, status, q } = req.query;

  let where = [];
  let params = [];
  if (category) { where.push('ac.category = ?'); params.push(category); }
  if (status) { where.push('ac.status = ?'); params.push(status); }
  if (q) { where.push('(ac.name LIKE ? OR ac.serial_number LIKE ? OR ac.brand LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT ac.*,
       (SELECT aa.id FROM asset_assignments aa WHERE aa.asset_id = ac.id AND aa.return_date IS NULL ORDER BY aa.id DESC LIMIT 1) AS current_assignment_id,
       (SELECT e.name FROM asset_assignments aa JOIN employees e ON aa.employee_id = e.id WHERE aa.asset_id = ac.id AND aa.return_date IS NULL ORDER BY aa.id DESC LIMIT 1) AS assigned_to_name,
       (SELECT e.id FROM asset_assignments aa JOIN employees e ON aa.employee_id = e.id WHERE aa.asset_id = ac.id AND aa.return_date IS NULL ORDER BY aa.id DESC LIMIT 1) AS assigned_to_id
     FROM asset_catalog ac
     ${whereClause}
     ORDER BY ac.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM asset_catalog ac ${whereClause}`, params
  );

  res.json({
    assets: rows,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
}

async function getAsset(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT ac.*,
       (SELECT aa.id FROM asset_assignments aa WHERE aa.asset_id = ac.id AND aa.return_date IS NULL ORDER BY aa.id DESC LIMIT 1) AS current_assignment_id,
       (SELECT e.name FROM asset_assignments aa JOIN employees e ON aa.employee_id = e.id WHERE aa.asset_id = ac.id AND aa.return_date IS NULL ORDER BY aa.id DESC LIMIT 1) AS assigned_to_name,
       (SELECT e.id FROM asset_assignments aa JOIN employees e ON aa.employee_id = e.id WHERE aa.asset_id = ac.id AND aa.return_date IS NULL ORDER BY aa.id DESC LIMIT 1) AS assigned_to_id
     FROM asset_catalog ac WHERE ac.id = ?`, [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Asset not found' });
  res.json(rows[0]);
}

async function createAsset(req, res) {
  const { error } = createAssetBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const adminId = req.admin?.id || req.hr?.id || null;
  const { name, category, serial_number, brand, model, purchase_date, purchase_price, notes } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Asset name is required' });

  const [result] = await pool.query(
    'INSERT INTO asset_catalog (name, category, serial_number, brand, model, purchase_date, purchase_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name.trim(), category || 'other', serial_number || null, brand || null, model || null, purchase_date || null, purchase_price || null, notes || null]
  );

  await pool.query(
    'INSERT INTO asset_history (asset_id, action, performed_by, description) VALUES (?, ?, ?, ?)',
    [result.insertId, 'created', adminId, `Asset "${name}" created`]
  );

  logActivity(null, adminId, 'asset_created', `Created asset: ${name}`);
  res.status(201).json({ id: result.insertId, message: 'Asset created' });
}

async function updateAsset(req, res) {
  const { error } = updateAssetBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { name, category, serial_number, brand, model, purchase_date, purchase_price, status, notes } = req.body;

  const [existing] = await pool.query('SELECT * FROM asset_catalog WHERE id = ?', [id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Asset not found' });

  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (category !== undefined) { fields.push('category = ?'); values.push(category); }
  if (serial_number !== undefined) { fields.push('serial_number = ?'); values.push(serial_number || null); }
  if (brand !== undefined) { fields.push('brand = ?'); values.push(brand || null); }
  if (model !== undefined) { fields.push('model = ?'); values.push(model || null); }
  if (purchase_date !== undefined) { fields.push('purchase_date = ?'); values.push(purchase_date || null); }
  if (purchase_price !== undefined) { fields.push('purchase_price = ?'); values.push(purchase_price || null); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }
  if (notes !== undefined) { fields.push('notes = ?'); values.push(notes || null); }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  values.push(id);
  await pool.query(`UPDATE asset_catalog SET ${fields.join(', ')} WHERE id = ?`, values);

  await pool.query(
    'INSERT INTO asset_history (asset_id, action, performed_by, description) VALUES (?, ?, ?, ?)',
    [id, 'updated', adminId, `Asset "${existing[0].name}" updated`]
  );

  logActivity(null, adminId, 'asset_updated', `Updated asset: ${existing[0].name}`);
  res.json({ message: 'Asset updated' });
}

async function deleteAsset(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const [existing] = await pool.query('SELECT * FROM asset_catalog WHERE id = ?', [id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Asset not found' });
  if (existing[0].status === 'assigned') return res.status(400).json({ error: 'Cannot delete assigned asset. Return it first.' });

  await pool.query('DELETE FROM asset_catalog WHERE id = ?', [id]);
  logActivity(null, adminId, 'asset_deleted', `Deleted asset: ${existing[0].name}`);
  res.json({ message: 'Asset deleted' });
}

async function assignAsset(req, res) {
  const { error } = assignAssetBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { employee_id, expected_return_date, condition_at_assign, notes } = req.body;

  if (!employee_id) return res.status(400).json({ error: 'Employee ID is required' });

  const [asset] = await pool.query('SELECT * FROM asset_catalog WHERE id = ?', [id]);
  if (asset.length === 0) return res.status(404).json({ error: 'Asset not found' });
  if (asset[0].status !== 'available') return res.status(400).json({ error: 'Asset is not available. Current status: ' + asset[0].status });

  const [emp] = await pool.query('SELECT id, name FROM employees WHERE id = ?', [employee_id]);
  if (emp.length === 0) return res.status(404).json({ error: 'Employee not found' });

  const [result] = await pool.query(
    'INSERT INTO asset_assignments (asset_id, employee_id, assigned_date, expected_return_date, condition_at_assign, notes, assigned_by) VALUES (?, ?, CURDATE(), ?, ?, ?, ?)',
    [id, employee_id, expected_return_date || null, condition_at_assign || null, notes || null, adminId]
  );

  await pool.query("UPDATE asset_catalog SET status = 'assigned' WHERE id = ?", [id]);

  await pool.query(
    'INSERT INTO asset_history (asset_id, action, employee_id, performed_by, description) VALUES (?, ?, ?, ?, ?)',
    [id, 'assigned', employee_id, adminId, `Asset "${asset[0].name}" assigned to ${emp[0].name}`]
  );

  logActivity(employee_id, adminId, 'asset_assigned', `Assigned asset "${asset[0].name}" to ${emp[0].name}`);
  res.status(201).json({ id: result.insertId, message: 'Asset assigned' });
}

async function returnAsset(req, res) {
  const { error } = returnAssetBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { condition_on_return, return_notes } = req.body;

  const [asset] = await pool.query('SELECT * FROM asset_catalog WHERE id = ?', [id]);
  if (asset.length === 0) return res.status(404).json({ error: 'Asset not found' });
  if (asset[0].status !== 'assigned') return res.status(400).json({ error: 'Asset is not currently assigned' });

  const [assignment] = await pool.query(
    'SELECT aa.*, e.name AS employee_name FROM asset_assignments aa JOIN employees e ON aa.employee_id = e.id WHERE aa.asset_id = ? AND aa.return_date IS NULL ORDER BY aa.id DESC LIMIT 1',
    [id]
  );
  if (assignment.length === 0) return res.status(400).json({ error: 'No active assignment found' });

  await pool.query(
    'UPDATE asset_assignments SET return_date = CURDATE(), condition_on_return = ?, return_notes = ?, received_by = ? WHERE id = ?',
    [condition_on_return || null, return_notes || null, adminId, assignment[0].id]
  );

  await pool.query("UPDATE asset_catalog SET status = 'available' WHERE id = ?", [id]);

  await pool.query(
    'INSERT INTO asset_history (asset_id, action, employee_id, performed_by, description) VALUES (?, ?, ?, ?, ?)',
    [id, 'returned', assignment[0].employee_id, adminId, `Asset "${asset[0].name}" returned by ${assignment[0].employee_name}`]
  );

  logActivity(null, adminId, 'asset_returned', `Returned asset "${asset[0].name}" from ${assignment[0].employee_name}`);
  res.json({ message: 'Asset returned' });
}

async function markDamaged(req, res) {
  const { error } = markDamagedBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { notes } = req.body;

  const [asset] = await pool.query('SELECT * FROM asset_catalog WHERE id = ?', [id]);
  if (asset.length === 0) return res.status(404).json({ error: 'Asset not found' });

  await pool.query("UPDATE asset_catalog SET status = 'damaged', notes = CONCAT(IFNULL(notes,''), IF(notes IS NOT NULL AND ? IS NOT NULL, ' | ', ''), ?) WHERE id = ?",
    [notes, notes || null, id]);

  await pool.query(
    'INSERT INTO asset_history (asset_id, action, performed_by, description) VALUES (?, ?, ?, ?)',
    [id, 'damaged', adminId, notes ? `Asset "${asset[0].name}" marked as damaged: ${notes}` : `Asset "${asset[0].name}" marked as damaged`]
  );

  logActivity(null, adminId, 'asset_damaged', `Marked asset "${asset[0].name}" as damaged`);
  res.json({ message: 'Asset marked as damaged' });
}

async function disposeAsset(req, res) {
  const { error } = disposeAssetBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { notes } = req.body;

  const [asset] = await pool.query('SELECT * FROM asset_catalog WHERE id = ?', [id]);
  if (asset.length === 0) return res.status(404).json({ error: 'Asset not found' });
  if (asset[0].status === 'assigned') return res.status(400).json({ error: 'Cannot dispose assigned asset. Return it first.' });

  await pool.query("UPDATE asset_catalog SET status = 'disposed', notes = CONCAT(IFNULL(notes,''), IF(notes IS NOT NULL AND ? IS NOT NULL, ' | ', ''), ?) WHERE id = ?",
    [notes, notes || null, id]);

  await pool.query(
    'INSERT INTO asset_history (asset_id, action, performed_by, description) VALUES (?, ?, ?, ?)',
    [id, 'disposed', adminId, notes ? `Asset "${asset[0].name}" disposed: ${notes}` : `Asset "${asset[0].name}" disposed`]
  );

  logActivity(null, adminId, 'asset_disposed', `Disposed asset: ${asset[0].name}`);
  res.json({ message: 'Asset disposed' });
}

async function getAssetHistory(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT ah.*, e.name AS employee_name, au.username AS performed_by_name
     FROM asset_history ah
     LEFT JOIN employees e ON ah.employee_id = e.id
     LEFT JOIN admin_users au ON ah.performed_by = au.id
     WHERE ah.asset_id = ?
     ORDER BY ah.created_at DESC`, [id]
  );
  res.json(rows);
}

async function getMyAssets(req, res) {
  const employeeId = req.employee.id;
  const [rows] = await pool.query(
    `SELECT ac.*, aa.assigned_date, aa.expected_return_date, aa.condition_at_assign, aa.notes AS assignment_notes, aa.id AS assignment_id
     FROM asset_assignments aa
     JOIN asset_catalog ac ON aa.asset_id = ac.id
     WHERE aa.employee_id = ? AND aa.return_date IS NULL
     ORDER BY aa.assigned_date DESC`, [employeeId]
  );
  res.json(rows);
}

async function getMyAssetHistory(req, res) {
  const employeeId = req.employee.id;
  const [rows] = await pool.query(
    `SELECT ac.name AS asset_name, ah.action, ah.description, ah.created_at
     FROM asset_history ah
     JOIN asset_catalog ac ON ah.asset_id = ac.id
     WHERE ah.employee_id = ?
     ORDER BY ah.created_at DESC`, [employeeId]
  );
  res.json(rows);
}

module.exports = {
  getAssets, getAsset, createAsset, updateAsset, deleteAsset,
  assignAsset, returnAsset, markDamaged, disposeAsset,
  getAssetHistory, getMyAssets, getMyAssetHistory,
};
