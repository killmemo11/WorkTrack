const pool = require('../config/database');

const EDU_LEVELS = {
  high_school: 1, diploma: 2, associate: 3,
  bachelor: 4, master: 5, phd: 6,
};

function parseArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; }
  catch { return []; }
}

async function autoScreen(candidateId, titleId, jobId) {
  const [titles] = await pool.query(
    `SELECT min_education_level, min_experience_years, required_skills, required_certs, preferred_skills
     FROM department_titles WHERE id = ?`, [titleId]
  );
  if (titles.length === 0) return null;
  const t = titles[0];

  const [cands] = await pool.query(
    `SELECT education_level, experience_years, skills, certifications
     FROM recruitment_candidates WHERE id = ?`, [candidateId]
  );
  if (cands.length === 0) return null;
  const c = cands[0];

  const details = [];
  let met = 0;

  const checkEdu = () => {
    if (!t.min_education_level) return;
    const minLevel = EDU_LEVELS[t.min_education_level];
    const candLevel = EDU_LEVELS[c.education_level] || 0;
    const passed = candLevel >= minLevel;
    details.push({
      requirement: `Education: ${t.min_education_level}`,
      candidate: c.education_level || 'none',
      passed,
    });
    if (passed) met++;
  };

  const checkExp = () => {
    if (t.min_experience_years == null) return;
    const candExp = parseInt(c.experience_years, 10) || 0;
    const passed = candExp >= t.min_experience_years;
    details.push({
      requirement: `Experience: ${t.min_experience_years}+ years`,
      candidate: `${candExp} years`,
      passed,
    });
    if (passed) met++;
  };

  const checkSkills = () => {
    const required = parseArray(t.required_skills);
    if (required.length === 0) return;
    const candSkills = parseArray(c.skills).map(s => s.toLowerCase());
    required.forEach(skill => {
      const passed = candSkills.includes(skill.toLowerCase());
      details.push({
        requirement: `Skill: ${skill}`,
        candidate: passed ? 'matched' : 'missing',
        passed,
      });
      if (passed) met++;
    });
  };

  const checkCerts = () => {
    const required = parseArray(t.required_certs);
    if (required.length === 0) return;
    const candCerts = parseArray(c.certifications).map(s => s.toLowerCase());
    required.forEach(cert => {
      const passed = candCerts.includes(cert.toLowerCase());
      details.push({
        requirement: `Certification: ${cert}`,
        candidate: passed ? 'matched' : 'missing',
        passed,
      });
      if (passed) met++;
    });
  };

  checkEdu();
  checkExp();
  checkSkills();
  checkCerts();

  const total = details.length;
  const allPassed = details.every(d => d.passed);

  await pool.query(
    `INSERT INTO screening_results (candidate_id, title_id, job_id, status, requirements_met, requirements_total, details, automated)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [candidateId, titleId, jobId || null, allPassed ? 'passed' : 'rejected', met, total, JSON.stringify(details)]
  );

  if (allPassed && total > 0) {
    await pool.query('UPDATE recruitment_candidates SET stage = ? WHERE id = ?', ['phone', candidateId]);
  } else if (!allPassed && total > 0) {
    await pool.query('UPDATE recruitment_candidates SET stage = ? WHERE id = ?', ['rejected', candidateId]);
  }

  return { status: allPassed ? 'passed' : 'rejected', details, met, total };
}

module.exports = { autoScreen };
