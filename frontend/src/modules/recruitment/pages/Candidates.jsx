// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../../shared/components/Icon';
import { useNavigate } from 'react-router-dom';
import hrApi from '../../../shared/api/hrApi';

import ConfirmModal from '../../../shared/components/ConfirmModal';
import Pagination from '../../../shared/components/Pagination';
import MasterSelect from '../../../shared/components/MasterSelect';

const rowAnim = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
};
const cardAnim = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } },
};

const STAGES = ['applied', 'phone', 'first', 'second', 'third', 'offer', 'hired', 'rejected'];

const EDU_LEVELS = [
  { value: '', label: '— Select —' },
  { value: 'high_school', label: 'High School' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'associate', label: 'Associate Degree' },
  { value: 'bachelor', label: 'Bachelor\'s Degree' },
  { value: 'master', label: 'Master\'s Degree' },
  { value: 'phd', label: 'PhD / Doctorate' },
];

const EXP_OPTIONS = [
  { value: '', label: '— Select —', rank: 0 },
  { value: '0-1', label: 'Less than 1 year', rank: 1 },
  { value: '1-2', label: '1–2 years', rank: 2 },
  { value: '2-3', label: '2–3 years', rank: 3 },
  { value: '3-5', label: '3–5 years', rank: 4 },
  { value: '5-7', label: '5–7 years', rank: 5 },
  { value: '7-10', label: '7–10 years', rank: 6 },
  { value: '10-15', label: '10–15 years', rank: 7 },
  { value: '15-20', label: '15–20 years', rank: 8 },
  { value: '20+', label: 'More than 20 years', rank: 9 },
];

export default function Candidates() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stageFilter, setStageFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null);
  const [hireTarget, setHireTarget] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [titles, setTitles] = useState([]);
  const [hireForm, setHireForm] = useState({ department_id: '', title_id: '', employee_id: '', start_date: '' });
  const [hiring, setHiring] = useState(false);
  const [hireResult, setHireResult] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', job_title: '', stage: 'applied', technical: false, notes: '', source: 'Manual', education_level: '', experience_years: '', skills: [], certifications: [] });
  const [boardView, setBoardView] = useState(false);
  const [boardCandidates, setBoardCandidates] = useState([]);
  const [boardLoading, setBoardLoading] = useState(false);
  const dragRef = useRef(null);

  const fetchCandidates = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, per_page: 20 });
      if (stageFilter !== 'all') params.set('stage', stageFilter);
      if (search.trim()) params.set('q', search.trim());
      const res = await hrApi.get('/recruitment/candidates?' + params.toString());
      setCandidates(res.data.data || []);
      setTotalPages(res.data.pagination?.pages || 1);
      setPage(p);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCandidates(1); }, [stageFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCandidates(1);
  };

  const fetchBoard = async () => {
    setBoardLoading(true);
    try {
      const res = await hrApi.get('/recruitment/candidates', { params: { per_page: 200 } });
      setBoardCandidates(res.data.data || []);
    } catch (err) { console.error(err); }
    setBoardLoading(false);
  };

  useEffect(() => { if (boardView) fetchBoard(); }, [boardView]);

  const handleDragStart = (candidate) => { dragRef.current = candidate; };
  const handleDrop = async (stage) => {
    const c = dragRef.current;
    if (!c || c.stage === stage) return;
    dragRef.current = null;
    try {
      await hrApi.post(`/recruitment/candidates/${c.id}/move`, { stage });
      setBoardCandidates(prev => prev.map(x => x.id === c.id ? { ...x, stage } : x));
    } catch (err) { console.error(err); }
  };

  const openCreate = () => {
    setForm({ name: '', email: '', phone: '', job_title: '', stage: 'applied', technical: false, notes: '', source: 'Manual', education_level: '', experience_years: '', skills: [], certifications: [] });
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!form.name || !form.email) return setMessage('Name and email are required');
    try {
      await hrApi.post('/recruitment/candidates', form);
      setMessage('Candidate created');
      setShowForm(false);
      fetchCandidates(page);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to create candidate');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleMove = async (id, stage) => {
    try {
      await hrApi.post(`/recruitment/candidates/${id}/move`, { stage });
      setMessage(`Moved to ${stage}`);
      fetchCandidates(page);
    } catch (err) {
      setMessage('Failed to move candidate');
    }
    setMoveTarget(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const openHire = async (candidate) => {
    setHireTarget(candidate);
    setHireForm({ department_id: '', title_id: '', employee_id: '', start_date: '' });
    setHireResult(null);
    try {
      const [deptRes, titleRes] = await Promise.all([
        hrApi.get('/departments'),
        hrApi.get('/department-titles'),
      ]);
      setDepartments(deptRes.data || []);
      setTitles(titleRes.data || []);
    } catch {}
  };

  const handleHire = async () => {
    setHiring(true);
    try {
      const payload = {
        department_id: hireForm.department_id ? parseInt(hireForm.department_id) : undefined,
        title_id: hireForm.title_id ? parseInt(hireForm.title_id) : undefined,
        start_date: hireForm.start_date || undefined,
      };
      if (hireForm.employee_id.trim()) payload.employee_id = parseInt(hireForm.employee_id);
      const res = await hrApi.post(`/recruitment/candidates/${hireTarget.id}/hire`, payload);
      setHireResult(res.data);
      setMessage(`Candidate hired! Employee #${res.data.employee_id} created.`);
      fetchCandidates(page);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to hire candidate');
      setHireTarget(null);
    }
    setHiring(false);
    setTimeout(() => setMessage(''), 6000);
  };

  const deptTitles = titles.filter(t => !hireForm.department_id || t.department_id === parseInt(hireForm.department_id));

  const handleDelete = async (id) => {
    try {
      await hrApi.delete(`/recruitment/candidates/${id}`);
      setMessage('Candidate deleted');
      fetchCandidates(page);
    } catch (err) {
      setMessage('Failed to delete candidate');
    }
    setConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const stageBadge = (stage) => {
    const colors = { applied: 'neutral', phone: 'info', first: 'primary', second: 'warning', third: 'danger', offer: 'success', hired: 'success', rejected: 'danger' };
    return <span className={`glass-badge glass-badge-${colors[stage] || 'neutral'}`}>{stage}</span>;
  };

  const stageColors = { applied: 'rgba(255,255,255,0.06)', phone: 'rgba(59,130,246,0.12)', first: 'rgba(99,102,241,0.12)', second: 'rgba(245,158,11,0.12)', third: 'rgba(239,68,68,0.12)', offer: 'rgba(34,197,94,0.12)', hired: 'rgba(34,197,94,0.18)', rejected: 'rgba(239,68,68,0.12)' };
  const displayStages = ['applied', 'phone', 'first', 'second', 'third', 'offer', 'hired', 'rejected'];

  if (loading && !boardView) return (
    <div className="glass-loading">
      <div className="spinner"></div>
      <span>Loading candidates...</span>
    </div>
  );

  return (
    <div className="page fade-in-up">
      <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-glass)', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon icon="lucide:users" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}></Icon>
          Candidates Pipeline
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {!boardView && (
            <button className="glass-btn glass-btn-ghost" onClick={async () => {
              const token = localStorage.getItem('hrToken');
              const params = new URLSearchParams({ stage: stageFilter !== 'all' ? stageFilter : '', q: search.trim() });
              const res = await fetch(`/api/hr/recruitment/candidates/export?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) return alert('Export failed');
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'candidates.csv'; a.click();
              window.URL.revokeObjectURL(url);
            }}>
              <Icon icon="lucide:download"></Icon> Export CSV
            </button>
          )}
          <button className={`glass-btn glass-btn-sm ${boardView ? 'glass-btn-primary' : 'glass-btn-ghost'}`} onClick={() => setBoardView(v => !v)}>
            <Icon icon={boardView ? 'lucide:table' : 'lucide:layout-grid'}></Icon>
            {boardView ? ' Table View' : ' Board View'}
          </button>
          <button className="glass-btn glass-btn-primary" onClick={openCreate}>
            <Icon icon="lucide:user-plus"></Icon> Add Candidate
          </button>
        </div>
      </div>

      {message && (
        <div className="glass-alert glass-alert-info">
          <Icon icon="lucide:info"></Icon> {message}
        </div>
      )}

      {!boardView && (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="glass-tabs">
          <button className={`glass-tab ${stageFilter === 'all' ? 'active' : ''}`} onClick={() => setStageFilter('all')}>All</button>
          {STAGES.map(s => (
            <button key={s} className={`glass-tab ${stageFilter === s ? 'active' : ''}`} onClick={() => setStageFilter(s)}>{s}</button>
          ))}
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <input className="glass-input" placeholder="Search name, email, position..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
          <button type="submit" className="glass-btn glass-btn-ghost">
            <Icon icon="lucide:search"></Icon> Search
          </button>
        </form>
      </div>
      )}

      {boardView && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, minHeight: '60vh' }}>
          {boardLoading ? (
            <div className="glass-loading" style={{ minHeight: 200 }}>
              <div className="spinner"></div>
              <span>Loading board...</span>
            </div>
          ) : (
            displayStages.map(stage => {
              const items = boardCandidates.filter(c => c.stage === stage);
              return (
                <div key={stage} style={{ minWidth: 230, flex: 1 }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(stage)}>
                  <div style={{
                    padding: '10px 14px', marginBottom: 8, borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: '0.85rem',
                    background: stageColors[stage], color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon icon="lucide:folder" style={{ opacity: 0.5 }}></Icon>
                      {stage}
                    </span>
                    <span style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: '0 8px', fontSize: '0.75rem' }}>{items.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map(c => (
                      <motion.div key={c.id} layout
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        drag whileDrag={{ scale: 1.03, boxShadow: '0 12px 40px rgba(99,102,241,0.2)' }}
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={0.3}
                        onDragStart={() => handleDragStart(c)}
                        className="glass-panel"
                        style={{ borderRadius: 'var(--radius-sm)', padding: '10px 12px', touchAction: 'none' }}
                        whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(99,102,241,0.12)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: 2 }}>{c.job_title}</div>
                        {c.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 2 }}>{c.email}</div>}
                        <div style={{ marginTop: 6, fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--brand-primary)', cursor: 'pointer' }}
                            onClick={() => navigate(`/hr/candidates/${c.id}`)}>View <Icon icon="lucide:arrow-right" style={{ fontSize: '0.65rem' }}></Icon></span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {!boardView && (
      <div className="glass-table-wrapper fade-in-up delay-1">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Position</th>
              <th>Stage</th>
              <th>Screening</th>
              <th>Source</th>
              <th>Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
            {candidates.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="glass-empty">
                  <Icon icon="lucide:users"></Icon>
                  <h3>No candidates found</h3>
                </div>
              </td></tr>
            ) : candidates.map((c, idx) => (
              <motion.tr key={c.id} variants={rowAnim} initial="initial" animate="animate" custom={idx}
                whileHover={{ background: 'rgba(99,102,241,0.04)' }}>
                <td>
                  <a href="#" onClick={e => { e.preventDefault(); navigate(`/hr/candidates/${c.id}`); }} style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 600 }}>
                    {c.name}
                  </a>
                </td>
                <td>{c.email}</td>
                <td>{c.job_title}</td>
                <td>{stageBadge(c.stage)}{c.stage === 'phone' && (
                  <a href={`/hr/candidates/${c.id}`} onClick={e => { e.preventDefault(); navigate(`/hr/candidates/${c.id}`); }}
                    style={{ marginLeft: 4, color: 'var(--brand-primary)', fontSize: '0.7rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    <Icon icon="lucide:phone" style={{ fontSize: '0.65rem' }} /> Screen
                  </a>
                )}</td>
                <td>{c.screening_status ? (
                  <span className={`glass-badge ${c.screening_status === 'most_recommended' ? 'glass-badge-success' : c.screening_status === 'recommended' ? 'glass-badge-info' : 'glass-badge-danger'}`}>
                    <Icon icon={c.screening_status === 'most_recommended' ? 'lucide:star' : c.screening_status === 'recommended' ? 'lucide:thumbs-up' : 'lucide:x'} style={{ marginRight: 2, fontSize: '0.65rem' }}></Icon>
                    {c.screening_status === 'most_recommended' ? 'Most Rec.' : c.screening_status === 'recommended' ? 'Rec.' : 'Rej.'}
                  </span>
                ) : <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>—</span>}</td>
                <td>{c.source}</td>
                <td><span className="glass-badge glass-badge-neutral">{c.score_comm || 0}/{c.score_tech || 0}/{c.score_fit || 0}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <select className="glass-select glass-select" style={{ width: 120, display: 'inline-block', padding: '4px 10px', fontSize: '0.75rem' }} value="" onChange={e => { if (e.target.value) setMoveTarget({ id: c.id, stage: e.target.value }); }}>
                      <option value="">Move to...</option>
                      {STAGES.filter(s => s !== c.stage).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="glass-btn glass-btn-xs glass-btn-success" onClick={() => openHire(c)} style={{marginLeft:4}}>
                      <Icon icon="lucide:user-plus"></Icon> Hire
                    </button>
                    <button className="glass-btn glass-btn-xs glass-btn-danger" onClick={() => setConfirm(c)} style={{marginLeft:4}}>
                      <Icon icon="lucide:trash-2"></Icon> Delete
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      )}

      {totalPages > 1 && !boardView && <Pagination page={page} totalPages={totalPages} onPage={fetchCandidates} />}

      {moveTarget && (
        <ConfirmModal
          message={`Move candidate #${moveTarget.id} to "${moveTarget.stage}"?`}
          onConfirm={() => handleMove(moveTarget.id, moveTarget.stage)}
          onCancel={() => setMoveTarget(null)}
        />
      )}

      {hireTarget && !hireResult && (
        <div className="glass-modal-overlay" onClick={() => setHireTarget(null)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="glass-modal-header">
              <h3 className="glass-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon="lucide:user-plus" style={{ color: 'var(--success)' }}></Icon>
                Hire: {hireTarget.name}
              </h3>
              <button className="glass-modal-close" onClick={() => setHireTarget(null)}><Icon icon="lucide:x" /></button>
            </div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: 16 }}>
              Create employee record from this candidate.
            </p>
            <div className="glass-form-group">
              <label className="glass-label">Department</label>
              <select className="glass-select" value={hireForm.department_id}
                onChange={e => setHireForm({ ...hireForm, department_id: e.target.value, title_id: '' })}>
                <option value="">— Select —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="glass-form-group">
              <label className="glass-label">Title</label>
              <select className="glass-select" value={hireForm.title_id}
                onChange={e => setHireForm({ ...hireForm, title_id: e.target.value })}>
                <option value="">— Select —</option>
                {deptTitles.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="glass-form-group">
              <label className="glass-label">Employee ID (optional — leave blank to auto-generate)</label>
              <input className="glass-input" type="number" value={hireForm.employee_id}
                onChange={e => setHireForm({ ...hireForm, employee_id: e.target.value })}
                placeholder="Auto" />
            </div>
            <div className="glass-form-group">
              <label className="glass-label">Start Date</label>
              <input className="glass-input" type="date" value={hireForm.start_date}
                onChange={e => setHireForm({ ...hireForm, start_date: e.target.value })} />
            </div>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => setHireTarget(null)}>Cancel</button>
              <button className="glass-btn glass-btn-success" onClick={handleHire} disabled={hiring}>
                {hiring ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Hiring...</> : <><Icon icon="lucide:check"></Icon> Confirm Hire</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {hireResult && (
        <div className="glass-modal-overlay" onClick={() => { setHireResult(null); setHireTarget(null); }}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="glass-modal-header">
              <h3 className="glass-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)' }}>
                <Icon icon="lucide:party-popper"></Icon> Hired Successfully
              </h3>
              <button className="glass-modal-close" onClick={() => { setHireResult(null); setHireTarget(null); }}><Icon icon="lucide:x" /></button>
            </div>
            <div className="glass-card" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', padding: 16, margin: '12px 0' }}>
              <p style={{ marginBottom: 8 }}><strong>Employee #:</strong> {hireResult.employee_id}</p>
              <p><strong>Temporary Password:</strong> <code style={{ background: 'rgba(24,24,27,0.6)', padding: '2px 8px', borderRadius: 4, fontSize: '1rem', color: 'var(--success)' }}>{hireResult.temp_password}</code></p>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Share these credentials with the new employee. They can change their password after first login.</p>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-primary" onClick={() => { setHireResult(null); setHireTarget(null); }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="glass-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()}>
            <div className="glass-modal-header">
              <h3 className="glass-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon="lucide:user-plus" style={{ color: 'var(--brand-primary)' }}></Icon> Add Candidate
              </h3>
              <button className="glass-modal-close" onClick={() => setShowForm(false)}><Icon icon="lucide:x" /></button>
            </div>
            <div className="glass-form-group">
              <label className="glass-label">Name *</label>
              <input className="glass-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="glass-form-group">
              <label className="glass-label">Email *</label>
              <input className="glass-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="glass-form-group">
              <label className="glass-label">Phone</label>
              <input className="glass-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="glass-form-group">
              <label className="glass-label">Position</label>
              <input className="glass-input" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} />
            </div>
            <div className="glass-form-group">
              <label className="glass-label">Source</label>
              <select className="glass-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                <option>Manual</option>
                <option>Portal</option>
                <option>LinkedIn</option>
                <option>Referral</option>
                <option>Agency</option>
              </select>
            </div>
            <div className="glass-card" style={{ background: 'rgba(24,24,27,0.4)', borderRadius: 'var(--radius-md)', padding: 16, margin: '12px 0' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--text-primary)' }}>Qualifications</div>
              <div className="glass-form-group">
                <label className="glass-label">Education Level</label>
                <select className="glass-select" value={form.education_level} onChange={e => setForm({ ...form, education_level: e.target.value })} style={{ width: '100%' }}>
                  {EDU_LEVELS.map(el => <option key={el.value} value={el.value}>{el.label}</option>)}
                </select>
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Years of Experience</label>
                <select className="glass-select" value={form.experience_years} onChange={e => setForm({ ...form, experience_years: e.target.value })} style={{ width: '100%' }}>
                  {EXP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Skills</label>
                <MasterSelect type="skills" value={form.skills || []} onChange={v => setForm({ ...form, skills: v })} placeholder="Search and select skills..." />
              </div>
              <div className="glass-form-group" style={{ margin: 0 }}>
                <label className="glass-label">Certifications</label>
                <MasterSelect type="certs" value={form.certifications || []} onChange={v => setForm({ ...form, certifications: v })} placeholder="Search and select certifications..." />
              </div>
            </div>
            <div className="glass-form-group">
              <label className="glass-checkbox">
                <input type="checkbox" checked={form.technical} onChange={e => setForm({ ...form, technical: e.target.checked })} />
                {' '}Technical
              </label>
            </div>
            <div className="glass-form-group">
              <label className="glass-label">Notes</label>
              <textarea className="glass-textarea" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-primary" onClick={handleCreate}>
                <Icon icon="lucide:plus"></Icon> Create
              </button>
              <button className="glass-btn glass-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message={`Delete candidate "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
