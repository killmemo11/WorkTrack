const pool = require('../config/database');

const EDU_LEVELS = {
  high_school: 1, diploma: 2, associate: 3,
  bachelor: 4, master: 5, phd: 6,
};

const EXP_LEVELS = {
  '0-1': 1, '1-2': 2, '2-3': 3, '3-5': 4,
  '5-7': 5, '7-10': 6, '10-15': 7, '15-20': 8, '20+': 9,
};

function parseArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; }
  catch { return []; }
}

function statusFor(comparison) {
  if (comparison < 0) return 'rejected';
  if (comparison === 0) return 'recommended';
  return 'most_recommended';
}

async function autoScreen(candidateId, titleId, jobId) {
  const [titles] = await pool.query(
    `SELECT min_education_level, min_experience_years, required_skills, required_certs, preferred_skills, preferred_certs
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

  const reqResults = [];
  let hasRejected = false;
  let hasMostRec = false;

  // ── Education ─────────────────────────────────────────────────
  if (t.min_education_level) {
    const minRank = EDU_LEVELS[t.min_education_level] || 0;
    const candRank = EDU_LEVELS[c.education_level] || 0;
    const cmp = candRank - minRank;
    const st = statusFor(cmp);
    reqResults.push({ requirement: 'education_level', expected: t.min_education_level, provided: c.education_level || 'none', comparison: cmp, status: st });
    if (st === 'rejected') hasRejected = true;
    if (st === 'most_recommended') hasMostRec = true;
  }

  // ── Experience ────────────────────────────────────────────────
  if (t.min_experience_years) {
    const minRank = EXP_LEVELS[t.min_experience_years] || 0;
    const candRank = EXP_LEVELS[c.experience_years] || 0;
    const cmp = candRank - minRank;
    const st = statusFor(cmp);
    reqResults.push({ requirement: 'experience_years', expected: t.min_experience_years, provided: c.experience_years || 'none', comparison: cmp, status: st });
    if (st === 'rejected') hasRejected = true;
    if (st === 'most_recommended') hasMostRec = true;
  }

  // ── Required Skills ───────────────────────────────────────────
  const requiredSkills = parseArray(t.required_skills);
  const candSkills = parseArray(c.skills);
  if (requiredSkills.length > 0) {
    let matched = 0;
    const skillDetails = requiredSkills.map(sId => {
      const sIdNum = parseInt(sId, 10);
      const found = candSkills.some(cs => parseInt(cs, 10) === sIdNum);
      if (found) matched++;
      return { skill_id: sIdNum, matched: found };
    });
    const pct = matched / requiredSkills.length;
    const candHasAll = pct >= 1;
    const candHasExtra = candSkills.length > requiredSkills.length;
    const preferredSkills = parseArray(t.preferred_skills);
    const hasPreferred = preferredSkills.length > 0 && preferredSkills.some(ps => candSkills.some(cs => parseInt(cs, 10) === parseInt(ps, 10)));
    const st = !candHasAll ? 'rejected' : (candHasExtra || hasPreferred ? 'most_recommended' : 'recommended');
    reqResults.push({ requirement: 'required_skills', expected: requiredSkills.length, provided: `${matched}/${requiredSkills.length}`, comparison: pct, status: st });
    if (st === 'rejected') hasRejected = true;
    if (st === 'most_recommended') hasMostRec = true;
  }

  // ── Required Certs ───────────────────────────────────────────
  const requiredCerts = parseArray(t.required_certs);
  const candCerts = parseArray(c.certifications);
  if (requiredCerts.length > 0) {
    let matched = 0;
    requiredCerts.forEach(cId => {
      const cIdNum = parseInt(cId, 10);
      if (candCerts.some(cc => parseInt(cc, 10) === cIdNum)) matched++;
    });
    const pct = matched / requiredCerts.length;
    const candHasAll = pct >= 1;
    const candHasExtra = candCerts.length > requiredCerts.length;
    const preferredCerts = parseArray(t.preferred_certs);
    const hasPreferred = preferredCerts.length > 0 && preferredCerts.some(pc => candCerts.some(cc => parseInt(cc, 10) === parseInt(pc, 10)));
    const st = !candHasAll ? 'rejected' : (candHasExtra || hasPreferred ? 'most_recommended' : 'recommended');
    reqResults.push({ requirement: 'required_certs', expected: requiredCerts.length, provided: `${matched}/${requiredCerts.length}`, comparison: pct, status: st });
    if (st === 'rejected') hasRejected = true;
    if (st === 'most_recommended') hasMostRec = true;
  }

  const overallStatus = hasRejected ? 'rejected' : (hasMostRec ? 'most_recommended' : 'recommended');
  const simpleStatus = overallStatus === 'rejected' ? 'rejected' : 'passed';
  const reqsMet = reqResults.filter(r => r.status !== 'rejected').length;
  const reqsTotal = reqResults.length;

  await pool.query(
    `INSERT INTO screening_results (candidate_id, title_id, job_id, status, overall_status, requirements_met, requirements_total, details, requirement_results, automated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [candidateId, titleId, jobId || null, simpleStatus, overallStatus, reqsMet, reqsTotal, JSON.stringify(reqResults), JSON.stringify(reqResults)]
  );

  if (overallStatus === 'rejected') {
    await pool.query('UPDATE recruitment_candidates SET stage = ? WHERE id = ?', ['rejected', candidateId]);
  } else if (reqsMet > 0) {
    await pool.query('UPDATE recruitment_candidates SET stage = ? WHERE id = ?', ['phone', candidateId]);
  }

  return { status: overallStatus, details: reqResults, met: reqsMet, total: reqsTotal };
}

module.exports = { autoScreen };