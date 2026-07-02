const pool = require('../../shared/config/database');

async function listSkills(req, res) {
  const [rows] = await pool.query('SELECT * FROM master_skills ORDER BY name');
  res.json(rows);
}

async function createSkill(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const [result] = await pool.query('INSERT INTO master_skills (name) VALUES (?)', [name.trim()]);
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Skill already exists' });
    throw e;
  }
}

async function updateSkill(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    await pool.query('UPDATE master_skills SET name = ? WHERE id = ?', [name.trim(), id]);
    res.json({ id: parseInt(id), name: name.trim() });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Skill already exists' });
    throw e;
  }
}

async function deleteSkill(req, res) {
  const { id } = req.params;
  await pool.query('DELETE FROM master_skills WHERE id = ?', [id]);
  res.json({ success: true });
}

async function listCertifications(req, res) {
  const [rows] = await pool.query('SELECT * FROM master_certifications ORDER BY name');
  res.json(rows);
}

async function createCertification(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    const [result] = await pool.query('INSERT INTO master_certifications (name) VALUES (?)', [name.trim()]);
    res.status(201).json({ id: result.insertId, name: name.trim() });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Certification already exists' });
    throw e;
  }
}

async function updateCertification(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  try {
    await pool.query('UPDATE master_certifications SET name = ? WHERE id = ?', [name.trim(), id]);
    res.json({ id: parseInt(id), name: name.trim() });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Certification already exists' });
    throw e;
  }
}

async function deleteCertification(req, res) {
  const { id } = req.params;
  await pool.query('DELETE FROM master_certifications WHERE id = ?', [id]);
  res.json({ success: true });
}

module.exports = { listSkills, createSkill, updateSkill, deleteSkill, listCertifications, createCertification, updateCertification, deleteCertification };