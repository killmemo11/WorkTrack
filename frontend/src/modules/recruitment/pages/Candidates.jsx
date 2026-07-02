// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import hrApi from '../../../shared/api/hrApi';

import ConfirmModal from '../../../shared/components/ConfirmModal';
import Pagination from '../../../shared/components/Pagination';
import MasterSelect from '../../../shared/components/MasterSelect';

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
    const colors = { applied: 'secondary', phone: 'info', first: 'primary', second: 'warning', third: 'danger', offer: 'success', hired: 'success', rejected: 'danger' };
    return <span className={`badge badge-${colors[stage] || 'secondary'}`}>{stage}</span>;
  };

  const stageColors = { applied: '#e2e8f0', phone: '#bfdbfe', first: '#a5f3fc', second: '#fde68a', third: '#fed7aa', offer: '#bbf7d0', hired: '#86efac', rejected: '#fecaca' };
  const displayStages = ['applied', 'phone', 'first', 'second', 'third', 'offer', 'hired', 'rejected'];

  if (loading && !boardView) return <div className="loading">Loading candidates...</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Candidates Pipeline</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {!boardView && (
            <button className="btn btn-outline" onClick={async () => {
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
            }}>📥 Export CSV</button>
          )}
          <button className={`btn btn-sm ${boardView ? 'btn-primary' : 'btn-outline'}`} onClick={() => setBoardView(v => !v)}>
            {boardView ? '📋 Table View' : '📋 Board View'}
          </button>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Candidate</button>
        </div>
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      {!boardView && (
      <div className="filters-row" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="btn-group" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${stageFilter === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStageFilter('all')}>All</button>
          {STAGES.map(s => (
            <button key={s} className={`btn btn-sm ${stageFilter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setStageFilter(s)}>{s}</button>
          ))}
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <input className="form-control" placeholder="Search name, email, position..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
          <button type="submit" className="btn btn-outline">Search</button>
        </form>
      </div>
      )}

      {boardView && (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, minHeight: '60vh' }}>
          {boardLoading ? (
            <div style={{ padding: 40, color: '#9ca3af' }}>Loading board...</div>
          ) : (
            displayStages.map(stage => {
              const items = boardCandidates.filter(c => c.stage === stage);
              return (
                <div key={stage} style={{ minWidth: 230, flex: 1 }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(stage)}>
                  <div style={{
                    padding: '10px 14px', marginBottom: 8, borderRadius: 8, fontWeight: 600, fontSize: '0.85rem',
                    background: stageColors[stage] || '#e5e7eb', color: '#1e293b', display: 'flex', justifyContent: 'space-between'
                  }}>
                    <span>{stage}</span>
                    <span style={{ background: 'rgba(0,0,0,0.1)', borderRadius: 10, padding: '0 8px' }}>{items.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map(c => (
                      <div key={c.id} draggable onDragStart={() => handleDragStart(c)}
                        style={{
                          background: '#fff', borderRadius: 8, padding: '10px 12px', cursor: 'grab',
                          border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'box-shadow .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{c.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{c.job_title}</div>
                        {c.email && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{c.email}</div>}
                        <div style={{ marginTop: 6, fontSize: '0.75rem' }}>
                          <span style={{ color: '#4f46e5', cursor: 'pointer' }}
                            onClick={() => navigate(`/hr/candidates/${c.id}`)}>View →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {!boardView && (
      <div className="table-container">
        <table className="table">
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
            {candidates.length === 0 ? (
              <tr><td colSpan={8} className="text-center">No candidates found</td></tr>
            ) : candidates.map(c => (
              <tr key={c.id}>
                <td><a href="#" onClick={e => { e.preventDefault(); navigate(`/hr/candidates/${c.id}`); }} className="link">{c.name}</a></td>
                <td>{c.email}</td>
                <td>{c.job_title}</td>
                <td>{stageBadge(c.stage)}</td>
                <td>{c.screening_status ? (
                  <span style={{
                    fontSize: 12, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                    background: c.screening_status === 'most_recommended' ? '#e8f5e9' : c.screening_status === 'recommended' ? '#e3f2fd' : '#fce4ec',
                    color: c.screening_status === 'most_recommended' ? '#2e7d32' : c.screening_status === 'recommended' ? '#1565c0' : '#c62828',
                  }}>
                    {c.screening_status === 'most_recommended' ? '🔵 Most Rec.' : c.screening_status === 'recommended' ? '✅ Rec.' : '❌ Rej.'}
                  </span>
                ) : <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>}</td>
                <td>{c.source}</td>
                <td>{c.score_comm || 0}/{c.score_tech || 0}/{c.score_fit || 0}</td>
                <td>
                  <select className="form-control form-control-sm" style={{ width: 130, display: 'inline-block' }} value="" onChange={e => { if (e.target.value) setMoveTarget({ id: c.id, stage: e.target.value }); }}>
                    <option value="">Move to...</option>
                    {STAGES.filter(s => s !== c.stage).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn btn-sm btn-success" onClick={() => openHire(c)} style={{marginLeft:4}}>Hire</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirm(c)} style={{marginLeft:4}}>Delete</button>
                </td>
              </tr>
            ))}
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
        <div className="modal-overlay" onClick={() => setHireTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3>Hire: {hireTarget.name}</h3>
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 16 }}>
              Create employee record from this candidate.
            </p>
            <div className="form-group">
              <label>Department</label>
              <select className="form-control" value={hireForm.department_id}
                onChange={e => setHireForm({ ...hireForm, department_id: e.target.value, title_id: '' })}>
                <option value="">— Select —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Title</label>
              <select className="form-control" value={hireForm.title_id}
                onChange={e => setHireForm({ ...hireForm, title_id: e.target.value })}>
                <option value="">— Select —</option>
                {deptTitles.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Employee ID (optional — leave blank to auto-generate)</label>
              <input className="form-control" type="number" value={hireForm.employee_id}
                onChange={e => setHireForm({ ...hireForm, employee_id: e.target.value })}
                placeholder="Auto" />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input className="form-control" type="date" value={hireForm.start_date}
                onChange={e => setHireForm({ ...hireForm, start_date: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setHireTarget(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handleHire} disabled={hiring}>
                {hiring ? 'Hiring...' : 'Confirm Hire'}
              </button>
            </div>
          </div>
        </div>
      )}

      {hireResult && (
        <div className="modal-overlay" onClick={() => { setHireResult(null); setHireTarget(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3 style={{ color: '#2e7d32' }}>Hired Successfully</h3>
            <div style={{ background: '#e8f5e9', padding: 16, borderRadius: 8, margin: '12px 0' }}>
              <p><strong>Employee #:</strong> {hireResult.employee_id}</p>
              <p><strong>Temporary Password:</strong> <code style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '1rem' }}>{hireResult.temp_password}</code></p>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>Share these credentials with the new employee. They can change their password after first login.</p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => { setHireResult(null); setHireTarget(null); }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Candidate</h3>
            <div className="form-group">
              <label>Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Position</label>
              <input className="form-control" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Source</label>
              <select className="form-control" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                <option>Manual</option>
                <option>Portal</option>
                <option>LinkedIn</option>
                <option>Referral</option>
                <option>Agency</option>
              </select>
            </div>
            <div style={{ background: '#f8f9fc', borderRadius: 8, padding: 16, margin: '12px 0' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1a1a2e' }}>Qualifications</div>
              <div className="form-group">
                <label>Education Level</label>
                <select className="form-control" value={form.education_level} onChange={e => setForm({ ...form, education_level: e.target.value })} style={{ width: '100%' }}>
                  {EDU_LEVELS.map(el => <option key={el.value} value={el.value}>{el.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Years of Experience</label>
                <select className="form-control" value={form.experience_years} onChange={e => setForm({ ...form, experience_years: e.target.value })} style={{ width: '100%' }}>
                  {EXP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Skills</label>
                <MasterSelect type="skills" value={form.skills || []} onChange={v => setForm({ ...form, skills: v })} placeholder="Search and select skills..." />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Certifications</label>
                <MasterSelect type="certs" value={form.certifications || []} onChange={v => setForm({ ...form, certifications: v })} placeholder="Search and select certifications..." />
              </div>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={form.technical} onChange={e => setForm({ ...form, technical: e.target.checked })} />
                {' '}Technical
              </label>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleCreate}>Create</button>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
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
