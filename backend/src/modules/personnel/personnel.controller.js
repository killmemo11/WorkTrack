// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { getFullProfile, getOrganizationTree, getHeadcountReport, getHeadcountSummary } = require('./personnel.service');
const { formatUpdatedFieldChanges, formatUpdatedFieldsSummary } = require('../../shared/utils/activity-log.util');
const { checkHeadcountCapacity, recalcDepartmentMaxHeadcount } = require('../../shared/utils/headcount.util');
const XLSX = require('xlsx');
const path = require('path');

async function getPositions(req, res) {
  const [rows] = await pool.query(
    `SELECT p.*, d.name AS department_name
     FROM positions p
     LEFT JOIN departments d ON p.department_id = d.id
     ORDER BY p.title`
  );
  res.json(rows);
}

async function getEmployeeDashboard(req, res) {
  const employeeId = req.employee.id;
  
  try {
    // Get employee basic info
    const [employeeRows] = await pool.query(
      `SELECT e.*, d.name AS department_name, p.title AS position_title
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN positions p ON e.position_id = p.id
       WHERE e.id = ?`,
      [employeeId]
    );
    const employee = employeeRows[0];
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get today's attendance
    const [todayAttendance] = await pool.query(
      `SELECT * FROM attendance_records 
       WHERE employee_id = ? AND date = CURDATE()`,
      [employeeId]
    );

    // Get attendance statistics for this month
    const [monthStats] = await pool.query(
      `SELECT 
         COUNT(*) as total_days,
         SUM(CASE WHEN status = 'signed_in' THEN 1 ELSE 0 END) as present_days,
         SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as leave_days,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days
       FROM attendance_records 
       WHERE employee_id = ? AND MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())`,
      [employeeId]
    );

    // Get leave balance
    const [leaveBalance] = await pool.query(
      `SELECT 
         SUM(CASE WHEN type = 'annual' THEN balance ELSE 0 END) as annual_balance,
         SUM(CASE WHEN type = 'sick' THEN balance ELSE 0 END) as sick_balance,
         SUM(CASE WHEN type = 'unpaid' THEN balance ELSE 0 END) as unpaid_balance
       FROM leave_balances 
       WHERE employee_id = ?`,
      [employeeId]
    );

    // Get upcoming tasks (if tasks module exists)
    let upcomingTasks = [];
    try {
      const [tasks] = await pool.query(
        `SELECT * FROM tasks 
         WHERE assigned_to = ? AND status IN ('pending', 'in_progress') 
         AND due_date >= CURDATE()
         ORDER BY due_date LIMIT 5`,
        [employeeId]
      );
      upcomingTasks = tasks;
    } catch (err) {
      // Tasks table might not exist yet
    }

    // Get recent notifications
    let recentNotifications = [];
    try {
      const [notifications] = await pool.query(
        `SELECT * FROM notifications 
         WHERE employee_id = ? 
         ORDER BY created_at DESC LIMIT 5`,
        [employeeId]
      );
      recentNotifications = notifications;
    } catch (err) {
      // Notifications table might not exist yet
    }

    res.json({
      employee: {
        name: employee.name,
        email: employee.email,
        department: employee.department_name,
        position: employee.position_title,
        avatar: employee.avatar
      },
      today: {
        attendance: todayAttendance || null,
        status: todayAttendance?.status || 'not_signed_in'
      },
      monthlyStats: {
        totalDays: monthStats[0].total_days || 0,
        presentDays: monthStats[0].present_days || 0,
        leaveDays: monthStats[0].leave_days || 0,
        absentDays: monthStats[0].absent_days || 0,
        attendanceRate: monthStats[0].total_days ? 
          Math.round((monthStats[0].present_days / monthStats[0].total_days) * 100) : 0
      },
      leaveBalance: {
        annual: leaveBalance[0].annual_balance || 0,
        sick: leaveBalance[0].sick_balance || 0,
        unpaid: leaveBalance[0].unpaid_balance || 0
      },
      upcomingTasks,
      recentNotifications
    });
  } catch (err) {
    console.error('Error fetching employee dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}

async function createPosition(req, res) {
  const { title, department_id, description, technical } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Position title is required' });
  }
  const [result] = await pool.query(
    'INSERT INTO positions (title, department_id, description, technical) VALUES (?, ?, ?, ?)',
    [title.trim(), department_id || null, description || null, technical ? 1 : 0]
  );
  logActivity(null, req.admin?.id || req.hr?.id || null, 'position_created', `Created position: ${title}`);
  res.status(201).json({ id: result.insertId, message: 'Position created' });
}

async function updatePosition(req, res) {
  const { id } = req.params;
  const { title, department_id, description, technical } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Position title is required' });
  }
  await pool.query(
    'UPDATE positions SET title = ?, department_id = ?, description = ?, technical = ? WHERE id = ?',
    [title.trim(), department_id || null, description || null, technical ? 1 : 0, id]
  );
  logActivity(null, req.admin?.id || req.hr?.id || null, 'position_updated', `Updated position: ${title}`);
  res.json({ message: 'Position updated' });
}

async function deletePosition(req, res) {
  const { id } = req.params;
  const [pos] = await pool.query('SELECT title FROM positions WHERE id = ?', [id]);
  if (pos.length === 0) return res.status(404).json({ error: 'Position not found' });
  await pool.query('DELETE FROM positions WHERE id = ?', [id]);
  logActivity(null, req.admin?.id || req.hr?.id || null, 'position_deleted', `Deleted position: ${pos[0].title}`);
  res.json({ message: 'Position deleted' });
}

async function getEmployeeProfile(req, res) {
  const employeeId = req.params.id;
  const profile = await getFullProfile(employeeId);
  if (!profile) return res.status(404).json({ error: 'Employee not found' });
  res.json(profile);
}

async function updateEmployeeProfile(req, res) {
  const employeeId = req.params.id;
  const adminId = req.admin?.id || req.hr?.id || null;
  const data = req.body;

  const [emp] = await pool.query('SELECT id, department_id, title_id FROM employees WHERE id = ?', [employeeId]);
  if (emp.length === 0) return res.status(404).json({ error: 'Employee not found' });

  // Validate headcount when changing department or title
  if (data.department_id !== undefined && Number(data.department_id) !== Number(emp[0].department_id)) {
    const capacity = await checkHeadcountCapacity({ department_id: data.department_id, exclude_employee_id: Number(employeeId) });
    if (!capacity.hasCapacity) {
      return res.status(400).json({ error: `Cannot move employee — department at capacity (${capacity.deptAvailable} remaining).` });
    }
  }
  if (data.title_id !== undefined && Number(data.title_id) !== Number(emp[0].title_id)) {
    const capacity = await checkHeadcountCapacity({ title_id: data.title_id, exclude_employee_id: Number(employeeId) });
    if (!capacity.hasCapacity) {
      return res.status(400).json({ error: `Cannot reassign title — title at capacity (${capacity.titleAvailable} remaining).` });
    }
  }

  const empFields = ['department_id', 'position_id', 'phone', 'grade_id', 'title_id'];
  const profileFields = [
    'hire_date', 'contract_type', 'contract_end_date', 'work_type',
    'supervisor_id', 'nationality', 'birth_date', 'birth_place', 'gender',
    'marital_status', 'military_status', 'id_number', 'national_id_place', 'mother_name', 'id_expiry',
    'passport_number', 'passport_expiry', 'insurance_number',
    'medical_insurance_number',
    'avatar_path',
    'bank_name', 'bank_account', 'address',
    'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
  ];

  // Fetch old data for change tracking
  let oldEmpData = {};
  const empUpdates = [];
  const empParams = [];
  for (const f of empFields) {
    if (data[f] !== undefined) {
      empUpdates.push(`${f} = ?`);
      empParams.push(data[f] || null);
    }
  }
  if (empUpdates.length > 0) {
    const [oldEmp] = await pool.query(
      `SELECT ${empFields.join(', ')} FROM employees WHERE id = ?`, [employeeId]
    );
    oldEmpData = oldEmp[0] || {};
    empParams.push(employeeId);
    await pool.query(`UPDATE employees SET ${empUpdates.join(', ')} WHERE id = ?`, empParams);
  }

  // Fetch old profile data
  let oldProfileData = {};
  const profileData = {};
  for (const field of profileFields) {
    if (data[field] !== undefined) profileData[field] = data[field] || null;
  }

  if (Object.keys(profileData).length > 0) {
    const [oldProfile] = await pool.query(
      `SELECT ${profileFields.join(', ')} FROM employee_profiles WHERE employee_id = ?`, [employeeId]
    );
    oldProfileData = oldProfile[0] || {};

    const [existing] = await pool.query('SELECT id FROM employee_profiles WHERE employee_id = ?', [employeeId]);
    if (existing.length > 0) {
      const setClause = Object.keys(profileData).map(k => `${k} = ?`).join(', ');
      await pool.query(
        `UPDATE employee_profiles SET ${setClause} WHERE employee_id = ?`,
        [...Object.values(profileData), employeeId]
      );
    } else {
      const keys = Object.keys(profileData);
      const values = Object.values(profileData);
      await pool.query(
        `INSERT INTO employee_profiles (employee_id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`,
        [employeeId, ...values]
      );
    }
  }

  // Build change description
  const allChangedFields = [...new Set([
    ...empUpdates.map(f => f.split(' =')[0]),
    ...Object.keys(profileData),
  ])];

  const newData = { ...oldEmpData, ...oldProfileData };
  for (const f of empFields) {
    if (data[f] !== undefined) newData[f] = data[f] || null;
  }
  for (const f of profileFields) {
    if (data[f] !== undefined) newData[f] = data[f] || null;
  }

  const oldData = { ...oldEmpData, ...oldProfileData };
  const changeDescription = formatUpdatedFieldChanges(oldData, newData, allChangedFields);
  const updatedFieldsSummary = formatUpdatedFieldsSummary(allChangedFields);

  logActivity(employeeId, adminId, 'profile_updated',
    changeDescription
      ? `Updated personnel profile: ${changeDescription}`
      : `Updated personnel profile: ${updatedFieldsSummary || 'profile data'}`);

  res.json({ message: 'Profile updated' });
}

async function uploadDocument(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const employeeId = req.params.id;
  const { doc_type, doc_name, notes } = req.body;
  const adminId = req.admin?.id || req.hr?.id || null;
  const filePath = 'uploads/personnel/' + req.file.filename;

  await pool.query(
    'INSERT INTO employee_documents (employee_id, doc_type, doc_name, file_path, notes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
    [employeeId, doc_type || 'other', doc_name || req.file.originalname, filePath, notes || null, adminId]
  );
  logActivity(employeeId, adminId, 'document_uploaded', `Uploaded document: ${doc_name || req.file.originalname}`);
  res.status(201).json({ message: 'Document uploaded' });
}

async function deleteDocument(req, res) {
  const { id: employeeId, docId } = req.params;
  const [doc] = await pool.query('SELECT * FROM employee_documents WHERE id = ? AND employee_id = ?', [docId, employeeId]);
  if (doc.length === 0) return res.status(404).json({ error: 'Document not found' });
  await pool.query('DELETE FROM employee_documents WHERE id = ?', [docId]);
  logActivity(employeeId, req.admin?.id || req.hr?.id || null, 'document_deleted', `Deleted document: ${doc[0].doc_name}`);
  res.json({ message: 'Document deleted' });
}

async function uploadInsuranceCard(req, res) {
  const employeeId = req.params.id;
  const adminId = req.admin?.id || req.hr?.id || null;
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const filePath = 'uploads/personnel/' + req.file.filename;
  const [existing] = await pool.query('SELECT id FROM employee_profiles WHERE employee_id = ?', [employeeId]);
  if (existing.length > 0) {
    await pool.query('UPDATE employee_profiles SET insurance_card_image = ? WHERE employee_id = ?', [filePath, employeeId]);
  } else {
    await pool.query('INSERT INTO employee_profiles (employee_id, insurance_card_image) VALUES (?, ?)', [employeeId, filePath]);
  }
  logActivity(employeeId, adminId, 'insurance_card_uploaded', 'Uploaded insurance card image');
  res.json({ message: 'Insurance card uploaded', path: filePath });
}

async function uploadAvatar(req, res) {
  const employeeId = req.params.id;
  const adminId = req.admin?.id || req.hr?.id || null;
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const filePath = 'uploads/personnel/' + req.file.filename;
  const [existing] = await pool.query('SELECT id FROM employee_profiles WHERE employee_id = ?', [employeeId]);
  if (existing.length > 0) {
    await pool.query('UPDATE employee_profiles SET avatar_path = ? WHERE employee_id = ?', [filePath, employeeId]);
  } else {
    await pool.query('INSERT INTO employee_profiles (employee_id, avatar_path) VALUES (?, ?)', [employeeId, filePath]);
  }
  logActivity(employeeId, adminId, 'avatar_uploaded', 'Uploaded profile avatar');
  res.json({ message: 'Avatar uploaded', path: filePath });
}

async function addEducation(req, res) {
  const employeeId = req.params.id;
  const { degree, institution, field_of_study, graduation_year, grade } = req.body;
  if (!degree || !institution) return res.status(400).json({ error: 'Degree and institution are required' });
  const [result] = await pool.query(
    'INSERT INTO employee_education (employee_id, degree, institution, field_of_study, graduation_year, grade) VALUES (?, ?, ?, ?, ?, ?)',
    [employeeId, degree, institution, field_of_study || null, graduation_year || null, grade || null]
  );
  res.status(201).json({ id: result.insertId, message: 'Education added' });
}

async function updateEducation(req, res) {
  const { id: employeeId, eduId } = req.params;
  const { degree, institution, field_of_study, graduation_year, grade } = req.body;
  await pool.query(
    'UPDATE employee_education SET degree = ?, institution = ?, field_of_study = ?, graduation_year = ?, grade = ? WHERE id = ? AND employee_id = ?',
    [degree, institution, field_of_study || null, graduation_year || null, grade || null, eduId, employeeId]
  );
  res.json({ message: 'Education updated' });
}

async function deleteEducation(req, res) {
  const { id: employeeId, eduId } = req.params;
  await pool.query('DELETE FROM employee_education WHERE id = ? AND employee_id = ?', [eduId, employeeId]);
  res.json({ message: 'Education deleted' });
}

async function addWorkHistory(req, res) {
  const employeeId = req.params.id;
  const { company, position, from_date, to_date, reason_leaving } = req.body;
  if (!company || !position) return res.status(400).json({ error: 'Company and position are required' });
  const [result] = await pool.query(
    'INSERT INTO employee_work_history (employee_id, company, position, from_date, to_date, reason_leaving) VALUES (?, ?, ?, ?, ?, ?)',
    [employeeId, company, position, from_date || null, to_date || null, reason_leaving || null]
  );
  res.status(201).json({ id: result.insertId, message: 'Work history added' });
}

async function updateWorkHistory(req, res) {
  const { id: employeeId, whId } = req.params;
  const { company, position, from_date, to_date, reason_leaving } = req.body;
  await pool.query(
    'UPDATE employee_work_history SET company = ?, position = ?, from_date = ?, to_date = ?, reason_leaving = ? WHERE id = ? AND employee_id = ?',
    [company, position, from_date || null, to_date || null, reason_leaving || null, whId, employeeId]
  );
  res.json({ message: 'Work history updated' });
}

async function deleteWorkHistory(req, res) {
  const { id: employeeId, whId } = req.params;
  await pool.query('DELETE FROM employee_work_history WHERE id = ? AND employee_id = ?', [whId, employeeId]);
  res.json({ message: 'Work history deleted' });
}

async function addCertification(req, res) {
  const employeeId = req.params.id;
  const { name, issuing_authority, issue_date, expiry_date, credential_url } = req.body;
  if (!name) return res.status(400).json({ error: 'Certification name is required' });
  const [result] = await pool.query(
    'INSERT INTO employee_certifications (employee_id, name, issuing_authority, issue_date, expiry_date, credential_url) VALUES (?, ?, ?, ?, ?, ?)',
    [employeeId, name, issuing_authority || null, issue_date || null, expiry_date || null, credential_url || null]
  );
  res.status(201).json({ id: result.insertId, message: 'Certification added' });
}

async function deleteCertification(req, res) {
  const { id: employeeId, certId } = req.params;
  await pool.query('DELETE FROM employee_certifications WHERE id = ? AND employee_id = ?', [certId, employeeId]);
  res.json({ message: 'Certification deleted' });
}

async function addMedicalFamily(req, res) {
  const employeeId = req.params.id;
  const { name, relation, medical_insurance_number } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const [result] = await pool.query(
    'INSERT INTO employee_medical_family (employee_id, name, relation, medical_insurance_number) VALUES (?, ?, ?, ?)',
    [employeeId, name, relation || null, medical_insurance_number || null]
  );
  const famId = result.insertId;
  if (req.file) {
    const filePath = 'uploads/personnel/' + req.file.filename;
    await pool.query('UPDATE employee_medical_family SET insurance_card_image = ? WHERE id = ?', [filePath, famId]);
  }
  res.status(201).json({ id: famId, message: 'Family member added' });
}

async function updateMedicalFamily(req, res) {
  const { id: employeeId, famId } = req.params;
  const { name, relation, medical_insurance_number } = req.body;
  await pool.query(
    'UPDATE employee_medical_family SET name = ?, relation = ?, medical_insurance_number = ? WHERE id = ? AND employee_id = ?',
    [name, relation || null, medical_insurance_number || null, famId, employeeId]
  );
  if (req.file) {
    const filePath = 'uploads/personnel/' + req.file.filename;
    await pool.query('UPDATE employee_medical_family SET insurance_card_image = ? WHERE id = ?', [filePath, famId]);
  }
  res.json({ message: 'Family member updated' });
}

async function deleteMedicalFamily(req, res) {
  const { id: employeeId, famId } = req.params;
  await pool.query('DELETE FROM employee_medical_family WHERE id = ? AND employee_id = ?', [famId, employeeId]);
  res.json({ message: 'Family member deleted' });
}

async function uploadMedicalFamilyCard(req, res) {
  const { id: employeeId, famId } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const filePath = 'uploads/personnel/' + req.file.filename;
  await pool.query('UPDATE employee_medical_family SET insurance_card_image = ? WHERE id = ? AND employee_id = ?', [filePath, famId, employeeId]);
  logActivity(employeeId, adminId, 'family_card_uploaded', 'Uploaded family insurance card');
  res.json({ message: 'Card image uploaded', path: filePath });
}

async function changeEmployeeStatus(req, res) {
  const employeeId = req.params.id;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { action, to_position_id, to_department_id, effective_date, reason } = req.body;

  if (!action) return res.status(400).json({ error: 'Action is required' });

  const [emp] = await pool.query('SELECT position_id, department_id, title_id FROM employees WHERE id = ?', [employeeId]);
  if (emp.length === 0) return res.status(404).json({ error: 'Employee not found' });

  // Validate headcount when transferring to a new department or title
  if (to_department_id && Number(to_department_id) !== Number(emp[0].department_id)) {
    const capacity = await checkHeadcountCapacity({ department_id: to_department_id, exclude_employee_id: Number(employeeId) });
    if (!capacity.hasCapacity) {
      return res.status(400).json({ error: `Cannot transfer — department at capacity (${capacity.deptAvailable} remaining).` });
    }
  }
  if (to_position_id && Number(to_position_id) !== Number(emp[0].title_id)) {
    const capacity = await checkHeadcountCapacity({ title_id: to_position_id, exclude_employee_id: Number(employeeId) });
    if (!capacity.hasCapacity) {
      return res.status(400).json({ error: `Cannot transfer — title at capacity (${capacity.titleAvailable} remaining).` });
    }
  }

  const from_position_id = emp[0].position_id;
  const from_department_id = emp[0].department_id;

  await pool.query(
    `INSERT INTO employee_status_log (employee_id, action, from_position_id, to_position_id, from_department_id, to_department_id, effective_date, reason, performed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [employeeId, action, from_position_id, to_position_id || null, from_department_id, to_department_id || null, effective_date || null, reason || null, adminId]
  );

  if (to_position_id) {
    await pool.query('UPDATE employees SET position_id = ? WHERE id = ?', [to_position_id, employeeId]);
  }
  if (to_department_id) {
    await pool.query('UPDATE employees SET department_id = ? WHERE id = ?', [to_department_id, employeeId]);
  }

  logActivity(employeeId, adminId, 'status_change', `${action} for employee #${employeeId}`);
  res.json({ message: 'Status change recorded' });
}

async function getEmployeeTimeline(req, res) {
  const employeeId = req.params.id;
  const [rows] = await pool.query(
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
  res.json(rows);
}

async function getMyProfile(req, res) {
  const profile = await getFullProfile(req.employee.id);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
}

async function updateMyProfile(req, res) {
  const employeeId = req.employee.id;
  const data = req.body;

  const allowedFields = ['phone', 'address', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'];
  const employeeUpdates = {};
  if (data.phone !== undefined) employeeUpdates.phone = data.phone || null;

  if (Object.keys(employeeUpdates).length > 0) {
    await pool.query('UPDATE employees SET ? WHERE id = ?', [employeeUpdates, employeeId]);
  }

  const profileFields = ['address', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'];
  const profileData = {};
  for (const field of profileFields) {
    if (data[field] !== undefined) profileData[field] = data[field] || null;
  }

  if (Object.keys(profileData).length > 0) {
    const [existing] = await pool.query('SELECT id FROM employee_profiles WHERE employee_id = ?', [employeeId]);
    if (existing.length > 0) {
      const setClause = Object.keys(profileData).map(k => `${k} = ?`).join(', ');
      await pool.query(`UPDATE employee_profiles SET ${setClause} WHERE employee_id = ?`, [...Object.values(profileData), employeeId]);
    } else {
      const keys = Object.keys(profileData);
      const vals = Object.values(profileData);
      await pool.query(`INSERT INTO employee_profiles (employee_id, ${keys.join(', ')}) VALUES (?, ${keys.map(() => '?').join(', ')})`, [employeeId, ...vals]);
    }
  }

  res.json({ message: 'Profile updated' });
}

async function getMyDocuments(req, res) {
  const [rows] = await pool.query(
    'SELECT id, doc_type, doc_name, notes, created_at FROM employee_documents WHERE employee_id = ? ORDER BY created_at DESC',
    [req.employee.id]
  );
  res.json(rows);
}

async function getOrganization(req, res) {
  const tree = await getOrganizationTree();
  res.json(tree);
}

async function getHeadcount(req, res) {
  const report = await getHeadcountReport();
  const summary = await getHeadcountSummary();
  res.json({ ...report, summary });
}

const EXPORT_COLS = [
  'employee_id', 'name', 'email', 'phone', 'department', 'position',
  'hire_date', 'contract_type', 'contract_end_date', 'work_type',
  'nationality', 'birth_date', 'birth_place', 'gender', 'marital_status', 'military_status',
  'id_number', 'national_id_place', 'mother_name', 'id_expiry', 'passport_number', 'passport_expiry', 'insurance_number',
  'medical_insurance_number',
  'bank_name', 'bank_account', 'address',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
  'supervisor',
];

const DATE_FIELDS = ['hire_date', 'contract_end_date', 'birth_date', 'id_expiry', 'passport_expiry'];

function excelSerialToDate(serial) {
  if (typeof serial !== 'number') return serial;
  const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function exportProfiles(req, res) {
  const [rows] = await pool.query(`
    SELECT e.employee_id, e.name, e.email, e.phone,
           d.name AS department, p.title AS position,
           ep.hire_date, ep.contract_type, ep.contract_end_date, ep.work_type,
           ep.nationality, ep.birth_date, ep.gender, ep.marital_status, ep.military_status,
            ep.id_number, ep.id_expiry, ep.passport_number, ep.passport_expiry, ep.insurance_number,
            ep.medical_insurance_number,
            ep.bank_name, ep.bank_account, ep.address,
           ep.emergency_contact_name, ep.emergency_contact_phone, ep.emergency_contact_relation,
           ep.supervisor_id,
           s.name AS supervisor
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN positions p ON e.position_id = p.id
    LEFT JOIN employee_profiles ep ON e.id = ep.employee_id
    LEFT JOIN employees s ON ep.supervisor_id = s.id
    ORDER BY e.name
  `);

  const data = rows.map(r => {
    const row = { employee_id: r.employee_id, name: r.name, email: r.email, phone: r.phone || '', department: r.department || '', position: r.position || '' };
    for (const col of EXPORT_COLS.slice(5)) {
      let val = r[col];
      if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      } else if (typeof val === 'number' && DATE_FIELDS.includes(col)) {
        val = excelSerialToDate(val);
      }
      row[col] = val || '';
    }
    return row;
  });

  const [salaryRows] = await pool.query(`
    SELECT e.employee_id, sc.component_name, sc.amount
    FROM salary_components sc
    JOIN employees e ON sc.employee_id = e.id
    WHERE sc.is_active = 1
    ORDER BY e.employee_id, sc.component_name
  `);
  const salaryData = salaryRows.map(r => ({
    employee_id: r.employee_id,
    component_name: r.component_name,
    amount: r.amount,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Profiles');
  const ws2 = XLSX.utils.json_to_sheet(salaryData);
  XLSX.utils.book_append_sheet(wb, ws2, 'SalaryComponents');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.set('Content-Disposition', 'attachment; filename="employee-profiles.xlsx"');
  res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

async function importProfiles(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(ws, { raw: true });

  const rows = rawRows.map(row => {
    const obj = {};
    for (const key of Object.keys(row)) {
      const nk = key.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
      let val = row[key];
      if (typeof val === 'number' && DATE_FIELDS.includes(nk)) {
        val = excelSerialToDate(val);
      } else if (typeof val === 'string') {
        val = val.trim();
      }
      obj[nk] = val;
    }
    return obj;
  });

  const profileFields = [
    'hire_date', 'contract_type', 'contract_end_date', 'work_type',
    'nationality', 'birth_date', 'birth_place', 'gender', 'marital_status', 'military_status',
    'id_number', 'national_id_place', 'mother_name', 'id_expiry', 'passport_number', 'passport_expiry', 'insurance_number',
    'medical_insurance_number',
    'bank_name', 'bank_account', 'address',
    'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
  ];

  let updated = 0, errors = [];

  // -- Batch: collect all employee_ids --
  const profileRows = []; // { empId, profileData, phone }
  const salaryRows = [];
  for (const row of rows) {
    const empId = row.employee_id;
    if (empId === undefined || empId === null || empId === '') { errors.push(`Row missing employee_id`); continue; }

    const profileData = {};
    for (const f of profileFields) {
      if (row[f] !== undefined) profileData[f] = row[f] || null;
    }

    profileRows.push({
      empId: String(empId),
      profileData,
      phone: row.phone !== undefined ? (row.phone || null) : undefined,
    });
  }

  // -- Batch: resolve employee_ids to internal ids --
  if (profileRows.length > 0) {
    const allEmpIds = [...new Set(profileRows.map(r => r.empId))];
    const [empRows] = await pool.query(
      `SELECT id, employee_id FROM employees WHERE employee_id IN (${allEmpIds.map(() => '?').join(',')})`,
      allEmpIds
    );
    const empMap = new Map(empRows.map(r => [r.employee_id, r.id]));

    // Collect valid rows and errors
    const validProfileRows = [];
    for (const r of profileRows) {
      const eid = empMap.get(r.empId);
      if (!eid) { errors.push(`Employee #${r.empId} not found`); continue; }
      validProfileRows.push({ eid, profileData: r.profileData, phone: r.phone });
    }

    // -- Batch: existing profiles --
    const knownEids = validProfileRows.map(r => r.eid);
    const [existingProfiles] = knownEids.length > 0
      ? await pool.query(
          `SELECT employee_id FROM employee_profiles WHERE employee_id IN (${knownEids.map(() => '?').join(',')})`,
          knownEids
        )
      : [[], []];
    const existingProfileSet = new Set(existingProfiles.map(r => r.employee_id));

    // -- Bulk profile UPSERT using ON DUPLICATE KEY UPDATE + IFNULL to preserve existing values --
    const profileBatch = validProfileRows.filter(r => Object.keys(r.profileData).length > 0);
    if (profileBatch.length > 0) {
      const cols = [...profileFields];
      const placeholders = profileBatch.map(() => `(${['?', ...cols.map(() => '?')].join(',')})`).join(',');
      const setClause = cols.map(c => `${c} = IFNULL(VALUES(${c}), ${c})`).join(', ');
      const params = profileBatch.flatMap(r => [r.eid, ...cols.map(c => r.profileData[c] !== undefined ? r.profileData[c] : null)]);
      await pool.query(
        `INSERT INTO employee_profiles (employee_id, ${cols.join(', ')}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${setClause}`,
        params
      );
    }

    // -- Bulk phone updates --
    const phoneBatch = validProfileRows.filter(r => r.phone !== undefined);
    if (phoneBatch.length > 0) {
      const phoneCases = phoneBatch.map(() => `WHEN ? THEN ?`).join(' ');
      const phoneIds = phoneBatch.map(r => r.eid);
      const phoneVals = phoneBatch.flatMap(r => [r.eid, r.phone]);
      await pool.query(
        `UPDATE employees SET phone = CASE id ${phoneCases} END WHERE id IN (${phoneIds.map(() => '?').join(',')})`,
        [...phoneVals, ...phoneIds]
      );
    }

    updated = validProfileRows.length;
  }

  // -- Salary Components sheet --
  if (wb.SheetNames.includes('SalaryComponents')) {
    const ws2 = wb.Sheets['SalaryComponents'];
    const rawSalaryRows = XLSX.utils.sheet_to_json(ws2, { raw: true });
    for (const row of rawSalaryRows) {
      const obj = {};
      for (const key of Object.keys(row)) {
        const nk = key.trim().toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z0-9_]/g, '');
        obj[nk] = typeof row[key] === 'string' ? row[key].trim() : row[key];
      }
      const empId = String(obj.employee_id);
      const compName = obj.component_name?.toString().trim();
      const amount = parseFloat(obj.amount);
      if (!empId || !compName || isNaN(amount)) { errors.push(`Invalid salary row: ${JSON.stringify(obj)}`); continue; }
      salaryRows.push({ empId, compName, amount });
    }

    if (salaryRows.length > 0) {
      const salEmpIds = [...new Set(salaryRows.map(r => r.empId))];
      const [salEmpRows] = await pool.query(
        `SELECT id, employee_id FROM employees WHERE employee_id IN (${salEmpIds.map(() => '?').join(',')})`,
        salEmpIds
      );
      const salEmpMap = new Map(salEmpRows.map(r => [r.employee_id, r.id]));

      // Batch query existing salary_components
      const salByEmp = new Map();
      for (const r of salaryRows) {
        const eid = salEmpMap.get(r.empId);
        if (!eid) { errors.push(`Salary: Employee #${r.empId} not found`); continue; }
        if (!salByEmp.has(eid)) salByEmp.set(eid, []);
        salByEmp.get(eid).push(r);
      }

      const allKnownEids = [...salByEmp.keys()];
      const [existingSalaries] = allKnownEids.length > 0
        ? await pool.query(
            `SELECT id, employee_id, component_name FROM salary_components WHERE employee_id IN (${allKnownEids.map(() => '?').join(',')})`,
            allKnownEids
          )
        : [[], []];
      // Build lookup key "eid:compName" -> id
      const existingSalMap = new Map(existingSalaries.map(r => [`${r.employee_id}:${r.component_name}`, r.id]));

      // Separate new and existing
      const newSalaries = [];
      const updateSalaries = [];
      for (const [eid, rows] of salByEmp) {
        for (const r of rows) {
          const key = `${eid}:${r.compName}`;
          const existingId = existingSalMap.get(key);
          if (existingId) {
            updateSalaries.push({ id: existingId, amount: r.amount });
          } else {
            newSalaries.push({ eid, compName: r.compName, amount: r.amount });
          }
        }
      }

      // Bulk INSERT new salary_components
      if (newSalaries.length > 0) {
        const salPlaceholders = newSalaries.map(() => '(?, ?, ?)').join(',');
        const salParams = newSalaries.flatMap(r => [r.eid, r.compName, r.amount]);
        await pool.query(
          `INSERT INTO salary_components (employee_id, component_name, amount) VALUES ${salPlaceholders}`,
          salParams
        );
      }

      // Bulk UPDATE existing salary_components using CASE
      if (updateSalaries.length > 0) {
        const caseWhens = updateSalaries.map(() => `WHEN ? THEN ?`).join(' ');
        const updateIds = updateSalaries.map(r => r.id);
        const updateAmounts = updateSalaries.map(r => r.amount);
        await pool.query(
          `UPDATE salary_components SET amount = CASE id ${caseWhens} END, is_active = 1 WHERE id IN (${updateIds.map(() => '?').join(',')})`,
          [...updateAmounts.flatMap((a, i) => [updateIds[i], a]), ...updateIds]
        );
      }
    }
  }

  res.json({ message: `Updated ${updated} profiles`, errors: errors.length > 0 ? errors : undefined });
}

async function renewContract(req, res) {
  const employeeId = req.params.id;
  const adminId = req.admin?.id || req.hr?.id || null;
  const [profile] = await pool.query('SELECT * FROM employee_profiles WHERE employee_id = ?', [employeeId]);
  if (profile.length === 0) return res.status(404).json({ error: 'Profile not found' });
  const currentEnd = profile[0].contract_end_date;
  if (!currentEnd) return res.status(400).json({ error: 'No contract end date to renew from' });
  const newEnd = new Date(currentEnd);
  newEnd.setFullYear(newEnd.getFullYear() + 1);
  const newEndStr = newEnd.toISOString().split('T')[0];
  await pool.query('UPDATE employee_profiles SET contract_end_date = ? WHERE employee_id = ?', [newEndStr, employeeId]);
  await pool.query(
    'INSERT INTO employee_status_log (employee_id, action, effective_date, performed_by, reason) VALUES (?, ?, ?, ?, ?)',
    [employeeId, 'contract_renewed', newEndStr, adminId, `Contract renewed to ${newEndStr}`]
  );
  logActivity(employeeId, adminId, 'contract_renewed', `Contract renewed to ${newEndStr}`);
  res.json({ message: 'Contract renewed', contract_end_date: newEndStr });
}

async function submitResignation(req, res) {
  const employeeId = req.employee.id;
  const { reason, resignation_date } = req.body;
  if (!resignation_date) return res.status(400).json({ error: 'Resignation date is required' });
  const [existing] = await pool.query(
    "SELECT id FROM resignation_requests WHERE employee_id = ? AND status = 'pending'", [employeeId]
  );
  if (existing.length > 0) return res.status(400).json({ error: 'You already have a pending resignation request' });
  const [result] = await pool.query(
    'INSERT INTO resignation_requests (employee_id, reason, resignation_date) VALUES (?, ?, ?)',
    [employeeId, reason || null, resignation_date]
  );
  const requestId = result.insertId;
  const [emp] = await pool.query('SELECT e.*, ep.supervisor_id FROM employees e LEFT JOIN employee_profiles ep ON e.id = ep.employee_id WHERE e.id = ?', [employeeId]);
  let targetEmail = null;
  if (emp[0].supervisor_id) {
    const [sup] = await pool.query('SELECT email FROM employees WHERE id = ?', [emp[0].supervisor_id]);
    if (sup.length > 0) targetEmail = sup[0].email;
  }
  if (!targetEmail && emp[0].department_id) {
    const [dept] = await pool.query('SELECT c_level_email FROM departments WHERE id = ?', [emp[0].department_id]);
    if (dept.length > 0) targetEmail = dept[0].c_level_email;
  }
  if (targetEmail) {
    try {
      const emailService = require('../../shared/services/email.service');
      await emailService.sendResignationNotification(targetEmail, emp[0], { id: requestId, reason, resignation_date });
    } catch (e) { console.error('Resignation email error:', e); }
  }
  logActivity(employeeId, null, 'resignation_submitted', `Submitted resignation request for ${resignation_date}`);
  res.status(201).json({ id: requestId, message: 'Resignation request submitted' });
}

// ── Grades ─────────────────────────────────────────────────────
async function getGrades(req, res) {
  const [rows] = await pool.query('SELECT * FROM grades ORDER BY grade_level');
  res.json(rows);
}

async function createGrade(req, res) {
  const { grade_level, name, description, min_salary, max_salary } = req.body;
  if (!grade_level || !name) return res.status(400).json({ error: 'grade_level and name are required' });
  const [result] = await pool.query(
    'INSERT INTO grades (grade_level, name, description, min_salary, max_salary) VALUES (?,?,?,?,?)',
    [grade_level, name, description || null, min_salary || null, max_salary || null]
  );
  const [created] = await pool.query('SELECT * FROM grades WHERE id = ?', [result.insertId]);
  logActivity(null, req.admin?.id || req.hr?.id || null, 'grade_created', `Created grade: ${name}`);
  res.status(201).json(created[0]);
}

async function updateGrade(req, res) {
  const { id } = req.params;
  const { grade_level, name, description, min_salary, max_salary } = req.body;
  await pool.query(
    'UPDATE grades SET grade_level=?, name=?, description=?, min_salary=?, max_salary=? WHERE id=?',
    [grade_level, name, description || null, min_salary || null, max_salary || null, id]
  );
  const [updated] = await pool.query('SELECT * FROM grades WHERE id = ?', [id]);
  logActivity(null, req.admin?.id || req.hr?.id || null, 'grade_updated', `Updated grade #${id}`);
  res.json(updated[0]);
}

async function deleteGrade(req, res) {
  const { id } = req.params;
  await pool.query('DELETE FROM grades WHERE id=?', [id]);
  logActivity(null, req.admin?.id || req.hr?.id || null, 'grade_deleted', `Deleted grade #${id}`);
  res.json({ id: parseInt(id) });
}

// ── Department Titles ──────────────────────────────────────────
async function getDepartmentTitles(req, res) {
  const departmentId = req.query.department_id || (req.hr ? null : req.employee?.department_id);
  let where = '';
  let params = [];
  if (departmentId) { where = 'WHERE dt.department_id = ?'; params.push(departmentId); }
  const [rows] = await pool.query(
    `SELECT dt.*, d.name AS department_name, g.name AS grade_name, g.grade_level,
            COALESCE(ec.cnt, 0) AS filled_count
     FROM department_titles dt
     LEFT JOIN departments d ON dt.department_id = d.id
     LEFT JOIN grades g ON dt.grade_id = g.id
     LEFT JOIN (
       SELECT title_id, COUNT(*) AS cnt
       FROM employees
       WHERE (is_system IS NULL OR is_system = 0)
       GROUP BY title_id
     ) ec ON ec.title_id = dt.id
     ${where}
     ORDER BY d.name, g.grade_level IS NULL, g.grade_level`, params
  );
  res.json(rows);
}

const DEPT_TITLE_SELECT = `SELECT dt.*, d.name AS department_name, g.name AS grade_name, g.grade_level,
  COALESCE(ec.cnt, 0) AS filled_count
FROM department_titles dt
LEFT JOIN departments d ON dt.department_id = d.id
LEFT JOIN grades g ON dt.grade_id = g.id
LEFT JOIN (SELECT title_id, COUNT(*) AS cnt FROM employees WHERE (is_system IS NULL OR is_system = 0) GROUP BY title_id) ec ON ec.title_id = dt.id`;

function serializeJSON(val) {
  if (val == null) return null;
  if (Array.isArray(val)) return JSON.stringify(val.length ? val : []);
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? val : null; }
    catch { return null; }
  }
  return null;
}

async function createDepartmentTitle(req, res) {
  const { department_id, title, grade_id, description, technical, sort_order, job_summary, key_responsibilities, qualifications, technical_skills, core_competencies, max_headcount, min_education_level, min_experience_years, required_skills, required_certs, preferred_skills } = req.body;
  if (!department_id || !title) return res.status(400).json({ error: 'department_id and title are required' });
  const [result] = await pool.query(
    `INSERT INTO department_titles (department_id, title, grade_id, description, technical, sort_order, job_summary, key_responsibilities, qualifications, technical_skills, core_competencies, max_headcount, min_education_level, min_experience_years, required_skills, required_certs, preferred_skills)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [department_id, title, grade_id || null, description || null, technical ? 1 : 0, sort_order || 0, job_summary || null, key_responsibilities || null, qualifications || null, technical_skills || null, core_competencies || null, max_headcount !== undefined ? Math.max(0, parseInt(max_headcount, 10) || 0) : 0, min_education_level || null, min_experience_years || null, serializeJSON(required_skills), serializeJSON(required_certs), serializeJSON(preferred_skills)]
  );
  await recalcDepartmentMaxHeadcount(department_id);
  const [created] = await pool.query(DEPT_TITLE_SELECT + ' WHERE dt.id = ?', [result.insertId]);
  logActivity(null, req.admin?.id || req.hr?.id || null, 'dept_title_created', `Created title: ${title}`);
  res.status(201).json(created[0]);
}

async function updateDepartmentTitle(req, res) {
  const { id } = req.params;
  const { title, grade_id, description, technical, sort_order, job_summary, key_responsibilities, qualifications, technical_skills, core_competencies, max_headcount, min_education_level, min_experience_years, required_skills, required_certs, preferred_skills } = req.body;
  const [currentRows] = await pool.query('SELECT department_id FROM department_titles WHERE id = ?', [id]);
  await pool.query(
    `UPDATE department_titles SET title=?, grade_id=?, description=?, technical=?, sort_order=?, job_summary=?, key_responsibilities=?, qualifications=?, technical_skills=?, core_competencies=?, max_headcount=?, min_education_level=?, min_experience_years=?, required_skills=?, required_certs=?, preferred_skills=? WHERE id=?`,
    [title, grade_id || null, description || null, technical ? 1 : 0, sort_order || 0, job_summary || null, key_responsibilities || null, qualifications || null, technical_skills || null, core_competencies || null, max_headcount !== undefined ? Math.max(0, parseInt(max_headcount, 10) || 0) : 0, min_education_level || null, min_experience_years || null, serializeJSON(required_skills), serializeJSON(required_certs), serializeJSON(preferred_skills), id]
  );
  if (currentRows.length > 0) {
    await recalcDepartmentMaxHeadcount(currentRows[0].department_id);
  }
  const [updated] = await pool.query(DEPT_TITLE_SELECT + ' WHERE dt.id = ?', [id]);
  logActivity(null, req.admin?.id || req.hr?.id || null, 'dept_title_updated', `Updated title #${id}`);
  res.json(updated[0]);
}

async function deleteDepartmentTitle(req, res) {
  const { id } = req.params;
  const [currentRows] = await pool.query('SELECT department_id FROM department_titles WHERE id = ?', [id]);
  await pool.query('DELETE FROM department_titles WHERE id=?', [id]);
  if (currentRows.length > 0) {
    await recalcDepartmentMaxHeadcount(currentRows[0].department_id);
  }
  logActivity(null, req.admin?.id || req.hr?.id || null, 'dept_title_deleted', `Deleted title #${id}`);
  res.json({ id: parseInt(id), department_id: currentRows[0]?.department_id || null });
}

// ── Evaluation Criteria ────────────────────────────────────────
async function getEvaluationCriteria(req, res) {
  const { title_id } = req.query;
  let query = 'SELECT * FROM title_evaluation_criteria';
  const params = [];
  if (title_id) { query += ' WHERE title_id=?'; params.push(title_id); }
  query += ' ORDER BY id';
  const [rows] = await pool.query(query, params);
  res.json(rows);
}

async function saveEvaluationCriteria(req, res) {
  const { title_id, criteria } = req.body;
  if (!title_id || !Array.isArray(criteria)) return res.status(400).json({ error: 'title_id and criteria array are required' });
  await pool.query('DELETE FROM title_evaluation_criteria WHERE title_id=?', [title_id]);
  for (const c of criteria) {
    if (c.criterion_name && c.weight !== undefined) {
      await pool.query(
        'INSERT INTO title_evaluation_criteria (title_id, criterion_name, weight) VALUES (?,?,?)',
        [title_id, c.criterion_name, parseFloat(c.weight) || 0]
      );
    }
  }
  logActivity(null, req.admin?.id || req.hr?.id || null, 'criteria_saved', `Saved evaluation criteria for title #${title_id}`);
  res.json({ message: 'Evaluation criteria saved' });
}

module.exports = {
  getPositions, createPosition, updatePosition, deletePosition,
  getEmployeeProfile, updateEmployeeProfile,
  uploadDocument, deleteDocument,
  uploadInsuranceCard,
  uploadAvatar,
  addMedicalFamily, updateMedicalFamily, deleteMedicalFamily, uploadMedicalFamilyCard,
  addEducation, updateEducation, deleteEducation,
  addWorkHistory, updateWorkHistory, deleteWorkHistory,
  addCertification, deleteCertification,
  changeEmployeeStatus, getEmployeeTimeline,
  getMyProfile, updateMyProfile, getMyDocuments,
  getOrganization, getHeadcount,
  exportProfiles, importProfiles,
  renewContract, submitResignation,
  getGrades, createGrade, updateGrade, deleteGrade,
  getDepartmentTitles, createDepartmentTitle, updateDepartmentTitle, deleteDepartmentTitle,
  getEvaluationCriteria, saveEvaluationCriteria,
};
