// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useRef } from 'react';
import hrApi from '../../../shared/api/hrApi';

import ConfirmModal from '../../../shared/components/ConfirmModal';

const ICONS = {
  Intern:      '🎓',
  Junior:      '🌱',
  Senior:      '⭐',
  Supervisor:  '👔',
  Manager:     '🏆',
  SectionHead: '📊',
  'C-Level':   '👑',
};

export default function Positions() {
  const [titles, setTitles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [criteria, setCriteria] = useState([]);
  const [form, setForm] = useState({ title: '', grade_id: '', description: '', technical: false, job_summary: '', key_responsibilities: '', qualifications: '', technical_skills: '', core_competencies: '', max_headcount: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ department_id: '', title: '', grade_id: '', description: '', technical: false, job_summary: '', key_responsibilities: '', qualifications: '', technical_skills: '', core_competencies: '', max_headcount: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTab, setEditTab] = useState('basic');
  const hoverRef = useRef(null);

  useEffect(() => {
    Promise.all([
      hrApi.get('/department-titles').then(r => setTitles(r.data)),
      hrApi.get('/departments').then(r => setDepartments(r.data)),
      hrApi.get('/grades').then(r => setGrades(r.data)),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const grouped = {};
  titles.forEach(t => {
    if (!grouped[t.department_id]) grouped[t.department_id] = [];
    grouped[t.department_id].push(t);
  });

  const openEdit = async (t) => {
    setSelected(t);
    setForm({ title: t.title, grade_id: t.grade_id || '', description: t.description || '', technical: !!t.technical, job_summary: t.job_summary || '', key_responsibilities: t.key_responsibilities || '', qualifications: t.qualifications || '', technical_skills: t.technical_skills || '', core_competencies: t.core_competencies || '', max_headcount: t.max_headcount ?? '' });
    try {
      const res = await hrApi.get(`/evaluation-criteria?title_id=${t.id}`);
      setCriteria(res.data.length > 0 ? res.data : [{ criterion_name: '', weight: '' }]);
    } catch { setCriteria([{ criterion_name: '', weight: '' }]); }
  };

  const handleCriteriaChange = (idx, field, value) => {
    const updated = criteria.map((c, i) => i === idx ? { ...c, [field]: value } : c);
    setCriteria(updated);
  };

  const addCriteriaRow = () => setCriteria([...criteria, { criterion_name: '', weight: '' }]);
  const removeCriteriaRow = (idx) => {
    if (criteria.length <= 1) return;
    setCriteria(criteria.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await hrApi.put(`/department-titles/${selected.id}`, {
        ...form,
        job_summary: form.job_summary || null,
        key_responsibilities: form.key_responsibilities || null,
        qualifications: form.qualifications || null,
        technical_skills: form.technical_skills || null,
        core_competencies: form.core_competencies || null,
      });
      await hrApi.post('/evaluation-criteria', {
        title_id: selected.id,
        criteria: criteria.filter(c => c.criterion_name && c.weight !== ''),
      });
      setMsg('Saved successfully');
      const res = await hrApi.get('/department-titles');
      setTitles(res.data);
      setSelected(null);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Save failed');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleAddTitle = async () => {
    if (!addForm.department_id || !addForm.title.trim()) return;
    setSaving(true);
    try {
      await hrApi.post('/department-titles', {
        department_id: addForm.department_id,
        title: addForm.title,
        grade_id: addForm.grade_id || null,
        description: addForm.description || null,
        technical: !!addForm.technical,
        job_summary: addForm.job_summary || null,
        key_responsibilities: addForm.key_responsibilities || null,
        qualifications: addForm.qualifications || null,
        technical_skills: addForm.technical_skills || null,
        core_competencies: addForm.core_competencies || null,
        max_headcount: addForm.max_headcount || 0,
      });
      setMsg('Title added');
      setShowAdd(false);
      setAddForm({ department_id: '', title: '', grade_id: '', description: '', technical: false, job_summary: '', key_responsibilities: '', qualifications: '', technical_skills: '', core_competencies: '', max_headcount: '' });
      const res = await hrApi.get('/department-titles');
      setTitles(res.data);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to add title');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDeleteTitle = async () => {
    if (!deleteTarget) return;
    try {
      await hrApi.delete(`/department-titles/${deleteTarget.id}`);
      setMsg('Title deleted');
      setDeleteTarget(null);
      const res = await hrApi.get('/department-titles');
      setTitles(res.data);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to delete title');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleMouseEnter = (t, e) => {
    setHovered(t);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  const handleMouseLeave = () => setHovered(null);

  if (loading) return <div className="loading">Loading...</div>;

  const gradeMap = {};
  grades.forEach(g => { gradeMap[g.id] = g; });

  return (
    <>
      <div className="page-header">
        <h2>Job Architecture</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Title</button>
      </div>

      {msg && <div className="alert alert-info">{msg}</div>}

      {departments.map(dept => {
        const deptTitles = grouped[dept.id] || [];
        return (
          <div key={dept.id} style={{ marginBottom: 32 }}>
            <h3 style={{ color: '#1a1a2e', borderBottom: '2px solid #eee', paddingBottom: 8, marginBottom: 16 }}>
              {dept.name}
            </h3>
            {deptTitles.length === 0 ? (
              <p style={{ color: '#999' }}>No titles yet</p>
            ) : (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {deptTitles.map(t => {
                  const grade = t.grade_id ? gradeMap[t.grade_id] : null;
                  const icon = ICONS[t.title] || '📋';
                  return (
                    <div
                      key={t.id}
                      onClick={() => openEdit(t)}
                      onMouseEnter={(e) => handleMouseEnter(t, e)}
                      onMouseLeave={handleMouseLeave}
                      className="card"
                      style={{ width: 140, height: 140, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'transform .15s, box-shadow .15s', position: 'relative' }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.12)'; }}
                      onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                      <div style={{ fontSize: 32 }}>{icon}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>{t.title}</div>
                      {grade && <div style={{ fontSize: '0.7rem', color: '#666' }}>Grade {grade.grade_level}</div>}
                      {t.technical ? <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>Tech</span> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Title"
          message={`Delete "${deleteTarget.title}"? Employees with this title will have it unset.`}
          onConfirm={handleDeleteTitle}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3>Add New Title</h3>
            <div className="form-group">
              <label>Department *</label>
              <select className="form-control" value={addForm.department_id}
                onChange={e => setAddForm({ ...addForm, department_id: e.target.value })}
                style={{ width: '100%' }}>
                <option value="">— Select —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Title *</label>
              <input className="form-control" value={addForm.title}
                onChange={e => setAddForm({ ...addForm, title: e.target.value })}
                placeholder="e.g. Software Engineer" style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>Grade</label>
              <select className="form-control" value={addForm.grade_id}
                onChange={e => setAddForm({ ...addForm, grade_id: e.target.value })}
                style={{ width: '100%' }}>
                <option value="">— None —</option>
                {grades.map(g => <option key={g.id} value={g.id}>Grade {g.grade_level} — {g.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" rows={2} value={addForm.description}
                onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="Optional description" style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <input type="checkbox" checked={addForm.technical}
                onChange={e => setAddForm({ ...addForm, technical: e.target.checked })} />
              Technical Position
            </label>
            <div className="form-group">
              <label>Max Headcount</label>
              <input className="form-control" type="number" min="0" value={addForm.max_headcount}
                onChange={e => setAddForm({ ...addForm, max_headcount: e.target.value })}
                placeholder="0 = unlimited" style={{ width: '100%' }} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddTitle} disabled={saving}>
                {saving ? 'Adding...' : 'Add Title'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'fixed', left: hoverPos.x, top: hoverPos.y, transform: 'translate(-50%, -100%)',
          background: '#1a1a2e', color: '#fff', padding: '10px 14px', borderRadius: 8,
          fontSize: '0.8rem', maxWidth: 280, zIndex: 9999, pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,.2)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{hovered.title}</div>
          {hovered.description && <div style={{ color: '#ccc', marginBottom: 4 }}>{hovered.description}</div>}
          {hovered.grade_name && <div>Grade: {hovered.grade_name} (Lv.{hovered.grade_level})</div>}
          {hovered.max_headcount > 0 && <div>Max Headcount: {hovered.max_headcount}</div>}
        </div>
      )}

      {/* Edit Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setEditTab('basic'); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, padding: 0, overflow: 'hidden' }}>

            {/* ── Header ── */}
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>✏️</span>
                {selected.title}
              </h3>
              <button onClick={() => { setSelected(null); setEditTab('basic'); }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            {/* ── Tab Bar ── */}
            <div style={{ display: 'flex', gap: 0, padding: '0 28px', margin: '16px 28px 0', background: '#f4f6fb', borderRadius: 10 }}>
              {[
                { key: 'basic', label: 'Basic Info', icon: '📋' },
                { key: 'details', label: 'Job Details', icon: '📝' },
                { key: 'criteria', label: 'Evaluation Criteria', icon: '📊' },
              ].map((tab, i) => (
                <div key={tab.key}
                  onClick={() => setEditTab(tab.key)}
                  style={{
                    flex: 1, cursor: 'pointer', padding: '12px 8px', textAlign: 'center', borderRadius: 8,
                    background: editTab === tab.key ? '#fff' : 'transparent',
                    boxShadow: editTab === tab.key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                    transition: 'all .2s', borderBottom: editTab === tab.key ? '2px solid #1a1a2e' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600,
                    fontSize: 13, color: editTab === tab.key ? '#1a1a2e' : '#8892a8',
                  }}>
                  <span style={{ fontSize: 16 }}>{tab.icon}</span>
                  {tab.label}
                </div>
              ))}
            </div>

            {/* ── Tab Content ── */}
            <div style={{ padding: '20px 28px', minHeight: 260 }}>

              {/* ═══ Tab: Basic Info ═══ */}
              {editTab === 'basic' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: 13 }}>Title</label>
                      <input className="form-control" value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        style={{ width: '100%' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: 13 }}>Grade</label>
                      <select className="form-control" value={form.grade_id}
                        onChange={e => setForm({ ...form, grade_id: e.target.value })}
                        style={{ width: '100%' }}>
                        <option value="">— None —</option>
                        {grades.map(g => <option key={g.id} value={g.id}>Grade {g.grade_level} — {g.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: 13 }}>Max Headcount</label>
                      <input className="form-control" type="number" min="0" value={form.max_headcount}
                        onChange={e => setForm({ ...form, max_headcount: e.target.value })}
                        placeholder="0 = unlimited" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>Description</label>
                    <textarea className="form-control" rows={4} value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief description of the position..."
                      style={{ width: '100%', resize: 'vertical' }} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.technical}
                      onChange={e => setForm({ ...form, technical: e.target.checked })}
                      style={{ accentColor: '#1a1a2e', width: 16, height: 16 }} />
                    <span style={{ fontWeight: 500, fontSize: 14 }}>Technical Position</span>
                  </label>
                </div>
              )}

              {/* ═══ Tab: Job Details ═══ */}
              {editTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="card" style={{ margin: 0, background: '#fafbfc', border: '1px solid #eef0f5' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>📝</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Job Summary</span>
                    </div>
                    <div style={{ padding: '14px 18px' }}>
                      <textarea className="form-control" rows={4}
                        value={form.job_summary}
                        onChange={e => setForm({ ...form, job_summary: e.target.value })}
                        placeholder="Write a compelling summary of the role, its impact, and why someone should apply..."
                        style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="card" style={{ margin: 0, background: '#fafbfc', border: '1px solid #eef0f5' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>📋</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Key Responsibilities</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="form-control" rows={5}
                          value={form.key_responsibilities}
                          onChange={e => setForm({ ...form, key_responsibilities: e.target.value })}
                          placeholder="List the main responsibilities and day-to-day tasks for this role..."
                          style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                      </div>
                    </div>
                    <div className="card" style={{ margin: 0, background: '#fafbfc', border: '1px solid #eef0f5' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🎓</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Qualifications & Skills</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="form-control" rows={5}
                          value={form.qualifications}
                          onChange={e => setForm({ ...form, qualifications: e.target.value })}
                          placeholder="Required education, certifications, years of experience..."
                          style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="card" style={{ margin: 0, background: '#fafbfc', border: '1px solid #eef0f5' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>⚙️</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Technical Skills & Knowledge</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="form-control" rows={5}
                          value={form.technical_skills}
                          onChange={e => setForm({ ...form, technical_skills: e.target.value })}
                          placeholder="Specific tools, technologies, software, or methodologies required..."
                          style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                      </div>
                    </div>
                    <div className="card" style={{ margin: 0, background: '#fafbfc', border: '1px solid #eef0f5' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🌟</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Core Competencies</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="form-control" rows={5}
                          value={form.core_competencies}
                          onChange={e => setForm({ ...form, core_competencies: e.target.value })}
                          placeholder="Soft skills, behavioral traits, and core values expected..."
                          style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ Tab: Evaluation Criteria ═══ */}
              {editTab === 'criteria' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>Performance Evaluation Criteria</span>
                    <button className="btn btn-sm btn-outline" onClick={addCriteriaRow}
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Criterion
                    </button>
                  </div>
                  {criteria.length === 0 || (criteria.length === 1 && !criteria[0].criterion_name && !criteria[0].weight) ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8892a8' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>No criteria set</div>
                      <div style={{ fontSize: 13 }}>Click "Add Criterion" to define how this position is evaluated.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {criteria.map((c, idx) => (
                        <div key={idx}
                          style={{
                            display: 'flex', gap: 10, alignItems: 'center',
                            padding: '10px 14px', background: '#fafbfc', borderRadius: 8,
                            border: '1px solid #eef0f5',
                          }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: '#8892a8', width: 24 }}>#{idx + 1}</span>
                          <input className="form-control" placeholder="Criterion name (e.g. Quality of Work)"
                            value={c.criterion_name}
                            onChange={e => handleCriteriaChange(idx, 'criterion_name', e.target.value)}
                            style={{ flex: 1, border: 'none', background: '#fff', borderRadius: 6, padding: '8px 12px', fontSize: 13 }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <input className="form-control" type="number" step="0.01" min="0" max="100"
                              placeholder="%"
                              value={c.weight}
                              onChange={e => handleCriteriaChange(idx, 'weight', e.target.value)}
                              style={{ width: 64, border: 'none', background: '#fff', borderRadius: 6, padding: '8px 12px', fontSize: 13, textAlign: 'center' }} />
                            <span style={{ color: '#8892a8', fontSize: 13, fontWeight: 500, width: 18 }}>%</span>
                          </div>
                          <button className="btn btn-sm btn-outline-danger"
                            onClick={() => removeCriteriaRow(idx)}
                            disabled={criteria.length <= 1}
                            style={{ padding: '4px 10px', fontSize: 16, lineHeight: 1, opacity: criteria.length <= 1 ? 0.4 : 1 }}>&times;</button>
                        </div>
                      ))}
                      {criteria[0]?.criterion_name && (
                        <div style={{
                          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8,
                          padding: '8px 14px', marginTop: 4,
                        }}>
                          <span style={{ fontSize: 13, color: '#8892a8' }}>Total Weight:</span>
                          <span style={{
                            fontWeight: 700, fontSize: 15,
                            color: criteria.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0) === 100 ? '#22c55e' : '#ef4444',
                          }}>
                            {criteria.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0)}%
                          </span>
                          {criteria.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0) !== 100 && (
                            <span style={{ fontSize: 12, color: '#ef4444' }}>(should total 100%)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '16px 28px', borderTop: '1px solid #eef0f5',
              background: '#fafbfc',
            }}>
              <button className="btn btn-outline" onClick={() => { setSelected(null); setEditTab('basic'); }}>Cancel</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-danger" onClick={() => { setDeleteTarget(selected); setSelected(null); setEditTab('basic'); }}>Delete</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <span className="spinner-sm" /> : '💾'} {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
