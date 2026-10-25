// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');

async function getFullProfile(employeeId, tenantId) {
  const [emp] = await pool.query(
    `SELECT e.*, d.name AS department_name,
            COALESCE(dt.title, p.title) AS position_title,
            g.grade_level, g.name AS grade_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN positions p ON e.position_id = p.id
     LEFT JOIN department_titles dt ON e.title_id = dt.id
     LEFT JOIN grades g ON e.grade_id = g.id
     WHERE e.id = ? AND e.tenant_id = ?`, [employeeId, tenantId]
  );
  if (emp.length === 0) return null;
  const employee = emp[0];

  const [profile] = await pool.query(
    'SELECT * FROM employee_profiles WHERE employee_id = ? AND tenant_id = ?',
    [employeeId, tenantId]
  );
  employee.profile = profile.length > 0 ? profile[0] : null;

  const [documents] = await pool.query(
    `SELECT ed.*, au.username AS uploaded_by_name
     FROM employee_documents ed
     LEFT JOIN admin_users au ON ed.uploaded_by = au.id
     WHERE ed.employee_id = ? AND ed.tenant_id = ? ORDER BY ed.created_at DESC`, [employeeId, tenantId]
  );
  employee.documents = documents;

  const [education] = await pool.query(
    'SELECT * FROM employee_education WHERE employee_id = ? AND tenant_id = ? ORDER BY graduation_year DESC', [employeeId, tenantId]
  );
  employee.education = education;

  const [workHistory] = await pool.query(
    'SELECT * FROM employee_work_history WHERE employee_id = ? AND tenant_id = ? ORDER BY from_date DESC', [employeeId, tenantId]
  );
  employee.workHistory = workHistory;

  const [certifications] = await pool.query(
    'SELECT * FROM employee_certifications WHERE employee_id = ? AND tenant_id = ? ORDER BY issue_date DESC', [employeeId, tenantId]
  );
  employee.certifications = certifications;

  const [medicalFamily] = await pool.query(
    'SELECT * FROM employee_medical_family WHERE employee_id = ? AND tenant_id = ? ORDER BY name', [employeeId, tenantId]
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
     WHERE esl.employee_id = ? AND esl.tenant_id = ?
     ORDER BY esl.created_at DESC`, [employeeId, tenantId]
  );
  employee.statusLog = statusLog;

  const [goals] = await pool.query(
    'SELECT * FROM employee_goals WHERE employee_id = ? ORDER BY sort_order ASC, id ASC', [employeeId]
  );
  employee.goals = goals;

  return employee;
}

async function getOrganizationTree(tenantId) {
  const [departments] = await pool.query(
    'SELECT id, name, manager_email FROM departments WHERE tenant_id = ? ORDER BY name',
    [tenantId]
  );
  const [positions] = await pool.query(
    'SELECT * FROM positions WHERE tenant_id = ? ORDER BY title',
    [tenantId]
  );
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
       AND e.tenant_id = ?
     ORDER BY g.grade_level DESC, d.name, e.name`, [tenantId]
  );
  const [grades] = await pool.query(
    'SELECT id, grade_level, name FROM grades WHERE tenant_id = ? ORDER BY grade_level DESC',
    [tenantId]
  );
  return { departments, positions, employees, grades };
}

async function getHeadcountReport(tenantId) {
  const [byDepartment] = await pool.query(
    `SELECT d.id, d.name, d.max_headcount,
            COUNT(e.id) AS count,
            CASE WHEN d.max_headcount > 0 THEN GREATEST(0, d.max_headcount - COUNT(e.id)) ELSE NULL END AS vacant
     FROM departments d
     LEFT JOIN employees e ON e.department_id = d.id AND (e.is_system IS NULL OR e.is_system = 0)
     WHERE d.tenant_id = ?
     GROUP BY d.id, d.name, d.max_headcount
     ORDER BY d.name`, [tenantId]
  );
  const [byTitle] = await pool.query(
    `SELECT dt.id, dt.title, dt.max_headcount, d.name AS department_name, d.id AS department_id,
            COUNT(e.id) AS count,
            CASE WHEN dt.max_headcount > 0 THEN GREATEST(0, dt.max_headcount - COUNT(e.id)) ELSE NULL END AS vacant
     FROM department_titles dt
     JOIN departments d ON dt.department_id = d.id
     LEFT JOIN employees e ON e.title_id = dt.id AND (e.is_system IS NULL OR e.is_system = 0)
     WHERE dt.tenant_id = ? AND d.tenant_id = ?
     GROUP BY dt.id, dt.title, dt.max_headcount, d.name, d.id
     ORDER BY d.name, dt.sort_order`, [tenantId, tenantId]
  );
  const [byContract] = await pool.query(
    `SELECT COALESCE(ep.contract_type, 'unknown') AS contract_type, COUNT(*) AS count
     FROM employee_profiles ep
     RIGHT JOIN employees e ON ep.employee_id = e.id AND (e.is_system IS NULL OR e.is_system = 0)
     WHERE e.tenant_id = ?
     GROUP BY contract_type
     ORDER BY contract_type`, [tenantId]
  );
  return { byDepartment, byTitle, byContract };
}

async function getHeadcountSummary(tenantId) {
  const [deptStats] = await pool.query(
    `SELECT
       COUNT(DISTINCT d.id) AS total_depts,
       SUM(CASE WHEN d.max_headcount > 0 THEN d.max_headcount ELSE 0 END) AS total_max,
       COALESCE(dept_counts.filled, 0) AS total_filled,
       SUM(CASE WHEN d.max_headcount > 0 THEN GREATEST(0, d.max_headcount - COALESCE(dept_counts.filled, 0)) ELSE 0 END) AS total_vacant,
       SUM(CASE WHEN d.max_headcount > 0 AND COALESCE(dept_counts.filled, 0) >= d.max_headcount THEN 1 ELSE 0 END) AS full_depts
     FROM departments d
     LEFT JOIN (
       SELECT department_id, COUNT(*) AS filled
       FROM employees
       WHERE (is_system IS NULL OR is_system = 0) AND tenant_id = ?
       GROUP BY department_id
     ) dept_counts ON dept_counts.department_id = d.id
     WHERE d.tenant_id = ?`, [tenantId, tenantId]
  );
  return deptStats[0] || { total_depts: 0, total_max: 0, total_filled: 0, total_vacant: 0, full_depts: 0 };
}

module.exports = { getFullProfile, getOrganizationTree, getHeadcountReport, getHeadcountSummary };
