// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');

async function getDepartments(req, res) {
  const [rows] = await pool.query('SELECT * FROM departments ORDER BY name ASC');
  res.json(rows);
}

async function createDepartment(req, res) {
  const { name, manager_email, c_level_email, parent_department_id } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Department name is required' });
  }
  const newMgrEmail = (manager_email || '').trim();
  const newCleEmail = (c_level_email || '').trim();
  const newParentId = parent_department_id ? parseInt(parent_department_id, 10) || null : null;
  const [result] = await pool.query(
    'INSERT INTO departments (name, manager_email, c_level_email, parent_department_id) VALUES (?, ?, ?, ?)',
    [name.trim(), newMgrEmail, newCleEmail, newParentId]
  );
  if (newMgrEmail) {
    await pool.query(
      "UPDATE employees SET role = 'manager' WHERE email = ? AND role != 'admin' AND role != 'ceo'",
      [newMgrEmail]
    );
  }
  if (newCleEmail) {
    await pool.query(
      "UPDATE employees SET role = 'ceo', department_id = ? WHERE email = ? AND role != 'admin'",
      [result.insertId, newCleEmail]
    );
  }
  const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [result.insertId]);
  const adminId = req.admin?.id || req.hr?.id || null;
  await logActivity(null, adminId, 'department_created', `Created department: ${name.trim()} (manager: ${newMgrEmail || '—'}, c-level: ${newCleEmail || '—'})`);
  res.status(201).json(rows[0]);
}

async function updateDepartment(req, res) {
  const { id } = req.params;
  const { name, manager_email, c_level_email, parent_department_id } = req.body;

  const [oldRows] = await pool.query('SELECT manager_email, c_level_email FROM departments WHERE id = ?', [id]);
  const oldMgrEmail = oldRows.length > 0 ? (oldRows[0].manager_email || '').trim() : '';
  const oldCleEmail = oldRows.length > 0 ? (oldRows[0].c_level_email || '').trim() : '';

  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (manager_email !== undefined) { fields.push('manager_email = ?'); values.push((manager_email || '').trim()); }
  if (c_level_email !== undefined) { fields.push('c_level_email = ?'); values.push((c_level_email || '').trim()); }
  if (parent_department_id !== undefined) { fields.push('parent_department_id = ?'); values.push(parent_department_id ? parseInt(parent_department_id, 10) || null : null); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  await pool.query(`UPDATE departments SET ${fields.join(', ')} WHERE id = ?`, values);

  const newMgrEmail = manager_email !== undefined ? (manager_email || '').trim() : oldMgrEmail;
  const newCleEmail = c_level_email !== undefined ? (c_level_email || '').trim() : oldCleEmail;

  // Update manager role
  if (newMgrEmail) {
    await pool.query(
      "UPDATE employees SET role = 'manager' WHERE email = ? AND role != 'admin' AND role != 'ceo'",
      [newMgrEmail]
    );
  }
  if (manager_email !== undefined && oldMgrEmail && oldMgrEmail !== newMgrEmail) {
    const [otherDepts] = await pool.query(
      'SELECT id FROM departments WHERE manager_email = ? AND id != ?',
      [oldMgrEmail, id]
    );
    if (otherDepts.length === 0) {
      await pool.query(
        "UPDATE employees SET role = 'employee' WHERE email = ? AND role = 'manager'",
        [oldMgrEmail]
      );
    }
  }

  // Update C-Level role
  if (newCleEmail) {
    await pool.query(
      "UPDATE employees SET role = 'ceo', department_id = ? WHERE email = ? AND role != 'admin'",
      [id, newCleEmail]
    );
  }
  if (c_level_email !== undefined && oldCleEmail && oldCleEmail !== newCleEmail) {
    // Don't demote if this user is the global CEO
    const [ceoSetting] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'ceo_email'");
    const ceoEmail = ceoSetting.length > 0 ? ceoSetting[0].value.trim().toLowerCase() : '';
    if (oldCleEmail.toLowerCase() !== ceoEmail) {
      const [otherDepts] = await pool.query(
        'SELECT id FROM departments WHERE c_level_email = ? AND id != ?',
        [oldCleEmail, id]
      );
      if (otherDepts.length === 0) {
        await pool.query(
          "UPDATE employees SET role = 'employee' WHERE email = ? AND role = 'ceo'",
          [oldCleEmail]
        );
      }
    }
  }

  const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Department not found' });
  const adminId = req.admin?.id || req.hr?.id || null;
  await logActivity(null, adminId, 'department_updated', `Updated department #${id}: ${fields.join(', ')}`);
  res.json(rows[0]);
}

async function deleteDepartment(req, res) {
  const { id } = req.params;

  const [deptRows] = await pool.query('SELECT manager_email, c_level_email FROM departments WHERE id = ?', [id]);
  const oldMgrEmail = deptRows.length > 0 ? (deptRows[0].manager_email || '').trim() : '';
  const oldCleEmail = deptRows.length > 0 ? (deptRows[0].c_level_email || '').trim() : '';

  await pool.query('UPDATE employees SET department_id = NULL WHERE department_id = ?', [id]);
  await pool.query('DELETE FROM departments WHERE id = ?', [id]);

  if (oldMgrEmail) {
    const [otherDepts] = await pool.query(
      'SELECT id FROM departments WHERE manager_email = ?',
      [oldMgrEmail]
    );
    if (otherDepts.length === 0) {
      await pool.query(
        "UPDATE employees SET role = 'employee' WHERE email = ? AND role = 'manager'",
        [oldMgrEmail]
      );
    }
  }

  if (oldCleEmail) {
    // Don't demote if this user is the global CEO
    const [ceoSetting] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'ceo_email'");
    const ceoEmail = ceoSetting.length > 0 ? ceoSetting[0].value.trim().toLowerCase() : '';
    if (oldCleEmail.toLowerCase() !== ceoEmail) {
      const [otherDepts] = await pool.query(
        'SELECT id FROM departments WHERE c_level_email = ?',
        [oldCleEmail]
      );
      if (otherDepts.length === 0) {
        await pool.query(
          "UPDATE employees SET role = 'employee' WHERE email = ? AND role = 'ceo'",
          [oldCleEmail]
        );
      }
    }
  }

  const adminId = req.admin?.id || req.hr?.id || null;
  await logActivity(null, adminId, 'department_deleted', `Deleted department #${id}`);
  res.json({ message: 'Department deleted' });
}

async function downloadTemplate(req, res) {
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();
  const data = [['Name', 'Manager Email', 'C-Level Email', 'Parent Dept Name']];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 30 }, { wch: 35 }, { wch: 35 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Departments');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="departments_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

async function importDepartments(req, res) {
  const XLSX = require('xlsx');
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const file = req.file;
  const wb = XLSX.read(file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const dataRows = rows.filter((r, i) => i > 0 && r && r.some((c) => c && c.toString().trim()));
  if (dataRows.length === 0) {
    return res.status(400).json({ error: 'No data rows found. Fill in the template and try again.' });
  }
  const header = rows[0];
  const nameIdx = header.findIndex((h) => h && h.toString().toLowerCase().includes('name'));
  const mgrIdx = header.findIndex((h) => h && h.toString().toLowerCase().includes('manager'));
  const cleIdx = header.findIndex((h) => h && h.toString().toLowerCase().includes('c-level'));
  const parentIdx = header.findIndex((h) => h && h.toString().toLowerCase().includes('parent dept'));
  if (nameIdx === -1) {
    return res.status(400).json({ error: 'Could not find "Name" column. Use the provided template.' });
  }
  let created = 0;
  let skipped = 0;
  let emptyRows = 0;
  let errors = [];
  const toCreate = [];
  const managerEmails = [];
  const cLevelEmails = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const nameVal = row && row[nameIdx] ? row[nameIdx].toString().trim() : '';
    if (!nameVal) { emptyRows++; continue; }
    const name = nameVal;
    const managerEmail = mgrIdx >= 0 && row[mgrIdx] ? row[mgrIdx].toString().trim() : '';
    const cLevelEmail = cleIdx >= 0 && row[cleIdx] ? row[cleIdx].toString().trim() : '';
    const parentName = parentIdx >= 0 && row[parentIdx] ? row[parentIdx].toString().trim() : '';
    toCreate.push({ name, managerEmail, cLevelEmail, parentName });
  }

  // Batch check existing names
  if (toCreate.length > 0) {
    const names = toCreate.map(r => r.name);
    const [existing] = await pool.query(
      `SELECT name FROM departments WHERE name IN (${names.map(() => '?').join(',')})`,
      names
    );
    const existingSet = new Set(existing.map(r => r.name));

    const batch = [];
    for (const r of toCreate) {
      if (existingSet.has(r.name)) { skipped++; continue; }
      batch.push(r);
    }

    // Bulk INSERT new departments
    if (batch.length > 0) {
      // Resolve parent department names to IDs
      const parentNames = [...new Set(batch.filter(r => r.parentName).map(r => r.parentName))];
      const parentMap = {};
      if (parentNames.length > 0) {
        const [parents] = await pool.query(
          `SELECT id, name FROM departments WHERE name IN (${parentNames.map(() => '?').join(',')})`,
          parentNames
        );
        for (const p of parents) parentMap[p.name] = p.id;
      }
      const values = batch.map(() => '(?, ?, ?, ?)').join(',');
      const params = batch.flatMap(r => [r.name, r.managerEmail || null, r.cLevelEmail || null, parentMap[r.parentName] || null]);
      await pool.query(
        `INSERT INTO departments (name, manager_email, c_level_email, parent_department_id) VALUES ${values}`,
        params
      );
      created = batch.length;

      // Collect manager/C-level emails for role updates
      for (const r of batch) {
        if (r.managerEmail) managerEmails.push(r.managerEmail);
        if (r.cLevelEmail) cLevelEmails.push(r.cLevelEmail);
      }
    }
  }

  // Batch update manager roles
  if (managerEmails.length > 0) {
    const uniqueMgr = [...new Set(managerEmails)];
    await pool.query(
      `UPDATE employees SET role = 'manager' WHERE email IN (${uniqueMgr.map(() => '?').join(',')}) AND role != 'admin' AND role != 'ceo'`,
      uniqueMgr
    );
  }

  // Batch update C-level roles — need to find department IDs for each email
  if (cLevelEmails.length > 0) {
    const uniqueCle = [...new Set(cLevelEmails)];
    for (const email of uniqueCle) {
      const [dept] = await pool.query('SELECT id FROM departments WHERE c_level_email = ?', [email]);
      if (dept.length > 0) {
        await pool.query(
          "UPDATE employees SET role = 'ceo', department_id = ? WHERE email = ? AND role != 'admin'",
          [dept[0].id, email]
        );
      }
    }
  }
  let msg = `Imported ${created} department(s). ${skipped} skipped (already exist).`;
  if (emptyRows > 0) msg += ` ${emptyRows} empty row(s) ignored.`;
  if (errors.length > 0) msg += ` ${errors.length} error(s).`;
  const adminId = req.admin?.id || req.hr?.id || null;
  await logActivity(null, adminId, 'departments_imported', `Imported ${created} department(s) from file (${skipped} skipped, ${errors.length} errors)`);
  res.json({ message: msg, created, skipped, empty_rows: emptyRows, total_data_rows: dataRows.length, errors: errors.length > 0 ? errors : undefined });
}

module.exports = { getDepartments, createDepartment, updateDepartment, deleteDepartment, downloadTemplate, importDepartments };
