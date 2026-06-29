// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');

async function getFullProfile(employeeId) {
  const [emp] = await pool.query(
    `SELECT e.*, d.name AS department_name,
            COALESCE(dt.title, p.title) AS position_title,
            g.grade_level, g.name AS grade_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN positions p ON e.position_id = p.id
     LEFT JOIN department_titles dt ON e.title_id = dt.id
     LEFT JOIN grades g ON e.grade_id = g.id
     WHERE e.id = ?`, [employeeId]
  );
  if (emp.length === 0) return null;
  const employee = emp[0];

  const [profile] = await pool.query('SELECT * FROM employee_profiles WHERE employee_id = ?', [employeeId]);
  employee.profile = profile.length > 0 ? profile[0] : null;

  const [documents] = await pool.query(
    `SELECT ed.*, au.username AS uploaded_by_name
     FROM employee_documents ed
     LEFT JOIN admin_users au ON ed.uploaded_by = au.id
     WHERE ed.employee_id = ? ORDER BY ed.created_at DESC`, [employeeId]
  );
  employee.documents = documents;

  const [education] = await pool.query(
    'SELECT * FROM employee_education WHERE employee_id = ? ORDER BY graduation_year DESC', [employeeId]
  );
  employee.education = education;

  const [workHistory] = await pool.query(
    'SELECT * FROM employee_work_history WHERE employee_id = ? ORDER BY from_date DESC', [employeeId]
  );
  employee.workHistory = workHistory;

  const [certifications] = await pool.query(
    'SELECT * FROM employee_certifications WHERE employee_id = ? ORDER BY issue_date DESC', [employeeId]
  );
  employee.certifications = certifications;

  const [medicalFamily] = await pool.query(
    'SELECT * FROM employee_medical_family WHERE employee_id = ? ORDER BY name', [employeeId]
  );
  employee.medicalFamily = medicalFamily;

  const [statusLog] = await pool.query(
    `SELECT esl.*, fp.title AS from_position, tp.title AS to_position,
            fd.name AS from_department, td.name AS to_department,
            au.username AS performed_by_name
     FROM employee_status_log esl
     LEFT JOIN positions fp ON esl.from_position_id = fp.id
     LEFT JOIN positions tp ON esl.to_position_id = tp.id
     LEFT JOIN departments fd ON esl.from_department_id = fd.id
     LEFT JOIN departments td ON esl.to_department_id = td.id
     LEFT JOIN admin_users au ON esl.performed_by = au.id
     WHERE esl.employee_id = ?
     ORDER BY esl.created_at DESC`, [employeeId]
  );
  employee.statusLog = statusLog;

  return employee;
}

async function getOrganizationTree() {
  const [departments] = await pool.query('SELECT id, name, manager_email FROM departments ORDER BY name');
  const [positions] = await pool.query('SELECT * FROM positions ORDER BY title');
  const [employees] = await pool.query(
    `SELECT e.id, e.name, e.email, e.employee_id, e.role, e.department_id, e.position_id, e.grade_id,
            COALESCE(dt.title, p.title) AS position_title, d.name AS department_name,
            g.grade_level, g.name AS grade_name,
            ep.supervisor_id, ep.avatar_path
     FROM employees e
     LEFT JOIN positions p ON e.position_id = p.id
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN grades g ON e.grade_id = g.id
     LEFT JOIN employee_profiles ep ON e.id = ep.employee_id
     LEFT JOIN department_titles dt ON e.title_id = dt.id
     WHERE e.is_active = 1 AND (e.employment_status IS NULL OR e.employment_status != 'resigned')
     ORDER BY g.grade_level DESC, d.name, e.name`
  );
  const [grades] = await pool.query('SELECT id, grade_level, name FROM grades ORDER BY grade_level DESC');
  return { departments, positions, employees, grades };
}

async function getHeadcountReport() {
  const [byDepartment] = await pool.query(
    `SELECT d.id, d.name, COUNT(e.id) AS count
     FROM departments d
     LEFT JOIN employees e ON e.department_id = d.id AND (e.is_system IS NULL OR e.is_system = 0)
     GROUP BY d.id, d.name
     ORDER BY d.name`
  );
  const [byPosition] = await pool.query(
    `SELECT p.id, p.title, d.name AS department_name, COUNT(e.id) AS count
     FROM positions p
     LEFT JOIN departments d ON p.department_id = d.id
     LEFT JOIN employees e ON e.position_id = p.id AND (e.is_system IS NULL OR e.is_system = 0)
     GROUP BY p.id, p.title, d.name
     ORDER BY p.title`
  );
  const [byContract] = await pool.query(
    `SELECT COALESCE(ep.contract_type, 'unknown') AS contract_type, COUNT(*) AS count
     FROM employee_profiles ep
     RIGHT JOIN employees e ON ep.employee_id = e.id AND (e.is_system IS NULL OR e.is_system = 0)
     GROUP BY contract_type
     ORDER BY contract_type`
  );
  return { byDepartment, byPosition, byContract };
}

module.exports = { getFullProfile, getOrganizationTree, getHeadcountReport };
