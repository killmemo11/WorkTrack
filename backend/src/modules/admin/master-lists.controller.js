const pool = require('../../shared/config/database');
const { createMasterListItemBody, updateMasterListItemBody } = require('../../shared/validations/schemas');

// master_skills / master_certifications are shared reference data: all tenants read the same
// catalog, but each row is owned by the tenant that created it (tenant_id) and only the owner
// may rename or delete it.
async function listSkills(req, res) {
  const [rows] = await pool.query('SELECT * FROM master_skills ORDER BY name');
  res.json(rows);
}

async function createSkill(req, res) {
  const { error } = createMasterListItemBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO master_skills (name, tenant_id) VALUES (?, ?)',
      [name.trim(), req.tenantId]
    );
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Skill already exists' });
    throw e;
  }
}

async function updateSkill(req, res) {
  const { error } = updateMasterListItemBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const [result] = await pool.query(
      'UPDATE master_skills SET name = ? WHERE id = ? AND tenant_id = ?',
      [name.trim(), id, req.tenantId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Skill not found' });
    res.json({ id: parseInt(id), name: name.trim() });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Skill already exists' });
    throw e;
  }
}

async function deleteSkill(req, res) {
  const { id } = req.params;
  const [result] = await pool.query(
    'DELETE FROM master_skills WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Skill not found' });
  res.json({ success: true });
}

async function listCertifications(req, res) {
  const [rows] = await pool.query('SELECT * FROM master_certifications ORDER BY name');
  res.json(rows);
}

async function createCertification(req, res) {
  const { error } = createMasterListItemBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const [result] = await pool.query(
      'INSERT INTO master_certifications (name, tenant_id) VALUES (?, ?)',
      [name.trim(), req.tenantId]
    );
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Certification already exists' });
    throw e;
  }
}

async function updateCertification(req, res) {
  const { error } = updateMasterListItemBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const [result] = await pool.query(
      'UPDATE master_certifications SET name = ? WHERE id = ? AND tenant_id = ?',
      [name.trim(), id, req.tenantId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Certification not found' });
    res.json({ id: parseInt(id), name: name.trim() });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Certification already exists' });
    throw e;
  }
}

async function deleteCertification(req, res) {
  const { id } = req.params;
  const [result] = await pool.query(
    'DELETE FROM master_certifications WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Certification not found' });
  res.json({ success: true });
}

module.exports = { listSkills, createSkill, updateSkill, deleteSkill, listCertifications, createCertification, updateCertification, deleteCertification };