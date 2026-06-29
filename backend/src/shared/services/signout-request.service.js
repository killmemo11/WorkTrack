// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

async function determineApprover(employeeId) {
  const [empRows] = await pool.query(
    'SELECT e.email, e.department_id, d.manager_email, d.c_level_email FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE e.id = ?',
    [employeeId]
  );
  if (empRows.length === 0) return { type: 'admin', approverId: null };

  const emp = empRows[0];
  const empEmail = emp.email ? emp.email.trim().toLowerCase() : '';

  if (emp.manager_email && emp.manager_email.trim().toLowerCase() !== empEmail) {
    const mgrEmail = emp.manager_email.trim().toLowerCase();
    const [mgrRows] = await pool.query('SELECT id FROM employees WHERE LOWER(TRIM(email)) = ?', [mgrEmail]);
    if (mgrRows.length > 0) {
      return { type: 'manager', approverId: mgrRows[0].id };
    }
  }

  if (emp.c_level_email && emp.c_level_email.trim().toLowerCase() !== empEmail) {
    const ceEmail = emp.c_level_email.trim().toLowerCase();
    const [ceRows] = await pool.query('SELECT id FROM employees WHERE LOWER(TRIM(email)) = ?', [ceEmail]);
    if (ceRows.length > 0) {
      return { type: 'c_level', approverId: ceRows[0].id };
    }
  }

  return { type: 'admin', approverId: null };
}

module.exports = { determineApprover };
