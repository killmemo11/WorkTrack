// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');

async function getHolidays(req, res) {
  const [rows] = await pool.query('SELECT * FROM holidays ORDER BY date ASC');
  res.json(rows);
}

async function createHoliday(req, res) {
  const { date, name } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'Date is required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO holidays (date, name) VALUES (?, ?)',
      [date, (name || '').trim()]
    );
    const [rows] = await pool.query('SELECT * FROM holidays WHERE id = ?', [result.insertId]);
    await logActivity(null, req.admin?.id || req.hr?.id || null, 'holiday_created', `Created holiday: ${name || date} (${(name || '').trim() || 'unnamed'})`);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Holiday already exists on this date' });
    }
    throw err;
  }
}

async function deleteHoliday(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT date, name FROM holidays WHERE id = ?', [id]);
  await pool.query('DELETE FROM holidays WHERE id = ?', [id]);
  const label = rows.length > 0 ? `${rows[0].name || ''} (${rows[0].date})` : id;
  await logActivity(null, req.admin?.id || req.hr?.id || null, 'holiday_deleted', `Deleted holiday: ${label}`);
  res.json({ id: parseInt(id) });
}

module.exports = { getHolidays, createHoliday, deleteHoliday };

