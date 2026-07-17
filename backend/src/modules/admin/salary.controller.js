// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { addSalaryComponentBody, updateSalaryComponentBody } = require('../../shared/validations/schemas');

async function getSalaryComponents(req, res) {
  const employeeId = req.params.id;
  const [rows] = await pool.query(
    'SELECT * FROM salary_components WHERE employee_id = ? AND is_active = 1 ORDER BY id',
    [employeeId]
  );
  res.json(rows);
}

async function addSalaryComponent(req, res) {
  const { error } = addSalaryComponentBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const employeeId = req.params.id;
  const { component_name, amount } = req.body;
  if (!component_name || !component_name.trim()) return res.status(400).json({ error: 'Component name is required' });
  if (amount === undefined || amount === null || isNaN(amount)) return res.status(400).json({ error: 'Valid amount is required' });
  const [result] = await pool.query(
    'INSERT INTO salary_components (employee_id, component_name, amount) VALUES (?, ?, ?)',
    [employeeId, component_name.trim(), parseFloat(amount)]
  );
  res.status(201).json({ id: result.insertId, message: 'Component added' });
}

async function updateSalaryComponent(req, res) {
  const { error } = updateSalaryComponentBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { id: employeeId, compId } = req.params;
  const { component_name, amount } = req.body;
  const updates = []; const values = [];
  if (component_name !== undefined) { updates.push('component_name = ?'); values.push(component_name.trim()); }
  if (amount !== undefined) { updates.push('amount = ?'); values.push(parseFloat(amount)); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(compId, employeeId);
  await pool.query(
    `UPDATE salary_components SET ${updates.join(', ')} WHERE id = ? AND employee_id = ?`,
    values
  );
  res.json({ message: 'Component updated' });
}

async function deleteSalaryComponent(req, res) {
  const { id: employeeId, compId } = req.params;
  await pool.query('UPDATE salary_components SET is_active = 0 WHERE id = ? AND employee_id = ?', [compId, employeeId]);
  res.json({ message: 'Component deleted' });
}

module.exports = { getSalaryComponents, addSalaryComponent, updateSalaryComponent, deleteSalaryComponent };
