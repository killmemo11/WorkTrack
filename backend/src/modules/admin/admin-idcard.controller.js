// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');

async function getIdCard(req, res) {
  const employeeId = req.params.id;
  const [rows] = await pool.query(
    `SELECT e.id, e.employee_id, e.name, e.email,
            d.name AS department_name, p.title AS position_title,
            ep.hire_date, ep.contract_type, ep.avatar_path,
            ep.birth_date, ep.nationality, ep.gender,
            e.employment_status
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN positions p ON e.position_id = p.id
     LEFT JOIN employee_profiles ep ON e.id = ep.employee_id
     WHERE e.id = ?`, [employeeId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
  const emp = rows[0];

  const [[setting]] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'company_name'");
  const companyName = setting?.value || '';

  const photoUrl = emp.avatar_path ? `/${emp.avatar_path}` : null;

  res.json({
    id: emp.id,
    employee_id: emp.employee_id,
    name: emp.name,
    email: emp.email,
    department: emp.department_name || '—',
    position: emp.position_title || '—',
    hire_date: emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
    contract_type: emp.contract_type || '—',
    photo_url: photoUrl,
    nationality: emp.nationality || '—',
    birth_date: emp.birth_date ? new Date(emp.birth_date).toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—',
    gender: emp.gender || '—',
    status: emp.employment_status || 'active',
    company_name: companyName,
  });
}

module.exports = { getIdCard };
