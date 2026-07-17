// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const logger = require('../../shared/utils/logger');
const { arabicNumberToWords, formatSalaryBreakdown, getTotalSalary } = require('../../shared/utils/arabic-number-to-words');

async function getTemplates(req, res) {
  const [rows] = await pool.query('SELECT * FROM contract_templates ORDER BY name');
  res.json(rows);
}

async function createTemplate(req, res) {
  const adminId = req.admin?.id || req.hr?.id || null;
  const { name, type, content_html, placeholders } = req.body;
  if (!name || !content_html) return res.status(400).json({ error: 'Name and content are required' });
  const [result] = await pool.query(
    'INSERT INTO contract_templates (name, type, content_html, placeholders) VALUES (?, ?, ?, ?)',
    [name.trim(), type || 'permanent', content_html, placeholders ? JSON.stringify(placeholders) : null]
  );
  logActivity(null, adminId, 'contract_template_created', `Created template: ${name}`);
  res.status(201).json({ id: result.insertId, message: 'Template created' });
}

async function updateTemplate(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { name, type, content_html, placeholders, is_active } = req.body;
  const fields = []; const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (type !== undefined) { fields.push('type = ?'); values.push(type); }
  if (content_html !== undefined) { fields.push('content_html = ?'); values.push(content_html); }
  if (placeholders !== undefined) { fields.push('placeholders = ?'); values.push(JSON.stringify(placeholders)); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  await pool.query(`UPDATE contract_templates SET ${fields.join(', ')} WHERE id = ?`, values);
  logActivity(null, adminId, 'contract_template_updated', `Updated template #${id}`);
  res.json({ message: 'Template updated' });
}

async function deleteTemplate(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  await pool.query('DELETE FROM contract_templates WHERE id = ?', [id]);
  logActivity(null, adminId, 'contract_template_deleted', `Deleted template #${id}`);
  res.json({ message: 'Template deleted' });
}

async function generateContract(req, res) {
  const employeeId = req.params.id;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { template_id, start_date, end_date, extra_values } = req.body;
  if (!template_id) return res.status(400).json({ error: 'Template ID is required' });

  const [template] = await pool.query('SELECT * FROM contract_templates WHERE id = ?', [template_id]);
  if (template.length === 0) return res.status(404).json({ error: 'Template not found' });

  const [rows] = await pool.query(
    `SELECT e.id, e.employee_id, e.name, e.email, e.phone,
            d.name AS department_name, p.title AS position_title,
            ep.hire_date, ep.contract_type, ep.contract_end_date, ep.supervisor_id,
            ep.nationality, ep.birth_date, ep.birth_place, ep.address, ep.bank_name, ep.bank_account,
            ep.id_number AS national_id, ep.national_id_place, ep.mother_name,
            ep.insurance_number, ep.marital_status, ep.military_status
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN positions p ON e.position_id = p.id
     LEFT JOIN employee_profiles ep ON e.id = ep.employee_id
     WHERE e.id = ?`, [employeeId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
  const emp = rows[0];

  const [compRows] = await pool.query(
    'SELECT component_name, amount FROM salary_components WHERE employee_id = ? AND is_active = 1 ORDER BY id',
    [employeeId]
  );
  const salaryComponents = compRows || [];
  const totalSalary = getTotalSalary(salaryComponents);

  const companyKeys = ['company_name', 'company_address', 'company_representative', 'company_representative_title', 'company_phone', 'company_fax', 'company_commercial_register', 'company_tax_card'];
  const companyPlaceholders = companyKeys.map(() => '?').join(',');
  const [companyRows] = await pool.query(`SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN (${companyPlaceholders})`, companyKeys);
  const companySettings = {};
  for (const row of companyRows) companySettings[row.key] = row.value;

  let content = template[0].content_html;
  const placeholders = {
    '{{name}}': emp.name || '',
    '{{employee_id}}': emp.employee_id || '',
    '{{email}}': emp.email || '',
    '{{phone}}': emp.phone || '',
    '{{department}}': emp.department_name || '',
    '{{position}}': emp.position_title || '',
    '{{hire_date}}': emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('en-EG') : '',
    '{{contract_type}}': emp.contract_type || '',
    '{{nationality}}': emp.nationality || '',
    '{{national_id}}': emp.national_id || '',
    '{{national_id_place}}': emp.national_id_place || '',
    '{{birth_date}}': emp.birth_date ? new Date(emp.birth_date).toLocaleDateString('en-EG') : '',
    '{{birth_place}}': emp.birth_place || '',
    '{{mother_name}}': emp.mother_name || '',
    '{{address}}': emp.address || '',
    '{{bank_name}}': emp.bank_name || '',
    '{{bank_account}}': emp.bank_account || '',
    '{{insurance_number}}': emp.insurance_number || '',
    '{{marital_status}}': emp.marital_status || '',
    '{{military_status}}': emp.military_status || '',
    '{{salary_breakdown}}': formatSalaryBreakdown(salaryComponents),
    '{{salary_total}}': totalSalary.toFixed(2),
    '{{salary_total_text}}': arabicNumberToWords(totalSalary) + ' جنيهاً',
    '{{company_name}}': companySettings.company_name || '',
    '{{company_address}}': companySettings.company_address || '',
    '{{company_representative}}': companySettings.company_representative || '',
    '{{company_representative_title}}': companySettings.company_representative_title || '',
    '{{company_phone}}': companySettings.company_phone || '',
    '{{company_fax}}': companySettings.company_fax || '',
    '{{company_commercial_register}}': companySettings.company_commercial_register || '',
    '{{company_tax_card}}': companySettings.company_tax_card || '',
    '{{start_date}}': start_date || new Date().toLocaleDateString('en-EG'),
    '{{end_date}}': end_date || '',
    '{{day}}': String(new Date().getDate()),
    '{{month}}': new Date().toLocaleDateString('en-EG', { month: 'long' }),
    '{{year}}': String(new Date().getFullYear()),
  };

  let templateDefaults = {};
  if (template[0].placeholders) {
    try { templateDefaults = typeof template[0].placeholders === 'string' ? JSON.parse(template[0].placeholders) : template[0].placeholders; } catch (e) {}
  }
  for (const [key, val] of Object.entries(templateDefaults)) {
    const ph = `{{${key}}}`;
    if (!placeholders[ph] || !placeholders[ph].trim()) {
      placeholders[ph] = val;
    }
  }

  if (extra_values && typeof extra_values === 'object') {
    for (const [key, val] of Object.entries(extra_values)) {
      placeholders[`{{${key}}}`] = String(val);
    }
  }

  for (const [key, val] of Object.entries(placeholders)) {
    content = content.split(key).join(val);
  }

  const [result] = await pool.query(
    'INSERT INTO employee_contracts (employee_id, template_id, start_date, end_date, content_html, status) VALUES (?, ?, ?, ?, ?, ?)',
    [employeeId, template_id, start_date || null, end_date || null, content, 'draft']
  );

  logActivity(employeeId, adminId, 'contract_generated', `Generated contract from template: ${template[0].name}`);
  res.status(201).json({ id: result.insertId, message: 'Contract generated', content });
}

async function signContract(req, res) {
  const { id: employeeId, cid } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { signed_by_employee, signed_by_company } = req.body;

  const [contract] = await pool.query('SELECT * FROM employee_contracts WHERE id = ? AND employee_id = ?', [cid, employeeId]);
  if (contract.length === 0) return res.status(404).json({ error: 'Contract not found' });

  const updates = [];
  if (signed_by_employee) updates.push('signed_by_employee = 1, signed_date = CURDATE()');
  if (signed_by_company) updates.push('signed_by_company = 1');
  if (updates.length > 0) {
    await pool.query(`UPDATE employee_contracts SET status = 'signed', ${updates.join(', ')} WHERE id = ?`, [cid]);
  }

  logActivity(employeeId, adminId, 'contract_signed', `Signed contract #${cid}`);
  res.json({ message: 'Contract signed' });
}

async function getEmployeeContracts(req, res) {
  const employeeId = req.params.id;
  const [rows] = await pool.query(
    `SELECT ec.*, ct.name AS template_name
     FROM employee_contracts ec
     LEFT JOIN contract_templates ct ON ec.template_id = ct.id
     WHERE ec.employee_id = ?
     ORDER BY ec.created_at DESC`, [employeeId]
  );
  res.json(rows);
}

async function getMyContracts(req, res) {
  const employeeId = req.employee.id;
  const [rows] = await pool.query(
    `SELECT ec.id, ct.name AS template_name, ec.start_date, ec.end_date, ec.status, ec.signed_by_employee, ec.signed_by_company, ec.created_at
     FROM employee_contracts ec
     LEFT JOIN contract_templates ct ON ec.template_id = ct.id
     WHERE ec.employee_id = ?
     ORDER BY ec.created_at DESC`, [employeeId]
  );
  res.json(rows);
}

async function getMyContractContent(req, res) {
  const employeeId = req.employee.id;
  const { id } = req.params;
  const [rows] = await pool.query(
    'SELECT content_html FROM employee_contracts WHERE id = ? AND employee_id = ?', [id, employeeId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
  res.json({ content: rows[0].content_html });
}

async function downloadContractPdf(req, res) {
  const { id: employeeId, cid } = req.params;
  const [contract] = await pool.query('SELECT content_html, employee_id, template_id FROM employee_contracts WHERE id = ? AND employee_id = ?', [cid, employeeId]);
  if (contract.length === 0) return res.status(404).json({ error: 'Contract not found' });

  let html = contract[0].content_html;
  html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: 'Traditional Arabic', Arial, sans-serif; direction: rtl; padding: 40px; line-height: 1.8; font-size: 14px; }
    @media print { @page { margin: 20mm; } }
  </style></head><body>${html}</body></html>`;

  let browser;
  try {
    const { default: puppeteer } = await import('puppeteer');
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', margin: { top: '20mm', bottom: '20mm', right: '15mm', left: '15mm' }, printBackground: true });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="contract-${cid}.pdf"`, 'Content-Length': pdf.length });
    res.send(pdf);
  } catch (err) {
    logger.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = {
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  generateContract, signContract, getEmployeeContracts,
  getMyContracts, getMyContractContent, downloadContractPdf,
};
