// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, Fragment } from 'react';
import hrApi from '../../../shared/api/hrApi';

import ConfirmModal from '../../../shared/components/ConfirmModal';
import Pagination from '../../../shared/components/Pagination';

const INIT_FORM = {
  department_id: '', title_id: '', title: '', department: '', type: 'Full-Time',
  technical: false, status: 'active', description: '',
  key_responsibilities: '', qualifications: '', technical_skills: '', core_competencies: '',
};

const SECTIONS = [
  { key: 'key_responsibilities', label: 'Key Responsibilities', icon: '📋', placeholder: 'List the main responsibilities and day-to-day tasks for this role...' },
  { key: 'qualifications', label: 'Qualifications And Skills', icon: '🎓', placeholder: 'Required education, certifications, years of experience...' },
  { key: 'technical_skills', label: 'Technical Skills & Knowledge', icon: '⚙️', placeholder: 'Specific tools, technologies, software, or methodologies required...' },
  { key: 'core_competencies', label: 'Core Competencies', icon: '🌟', placeholder: 'Soft skills, behavioral traits, and core values expected...' },
];

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [titles, setTitles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(INIT_FORM);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const fetchJobs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await hrApi.get(`/recruitment/jobs?page=${p}&per_page=20`);
      setJobs(res.data.data || []);
      setTotalPages(res.data.pagination?.pages || 1);
      setPage(p);
    } catch (err) {
      setMessage('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(1);
    hrApi.get('/department-titles').then(r => setTitles(r.data)).catch(() => {});
    hrApi.get('/departments').then(r => setDepartments(r.data)).catch(() => {});
  }, []);

  const filteredTitles = titles.filter(t =>
    form.department_id && String(t.department_id) === String(form.department_id)
  );

  const openCreate = () => {
    setEditing(null);
    setForm(INIT_FORM);
    setStep(1);
    setShowForm(true);
  };

  const openEdit = (job) => {
    setEditing(job);
    const dt = titles.find(t => String(t.id) === String(job.title_id));
    setForm({
      department_id: dt?.department_id || '',
      title_id: job.title_id || '',
      title: job.title,
      department: job.department,
      type: job.type,
      technical: !!job.technical,
      status: job.status,
      description: job.description || '',
      key_responsibilities: job.key_responsibilities || '',
      qualifications: job.qualifications || '',
      technical_skills: job.technical_skills || '',
      core_competencies: job.core_competencies || '',
    });
    setStep(1);
    setShowForm(true);
  };

  const handleTitleSelect = (tid) => {
    if (!tid) {
      setForm({ ...form, title_id: '', title: '', department: '', technical: false, description: '', key_responsibilities: '', qualifications: '', technical_skills: '', core_competencies: '' });
      return;
    }
    const t = titles.find(x => String(x.id) === tid);
    if (t) {
      setForm({ ...form, title_id: t.id, title: t.title, department: t.department_name || '', technical: !!t.technical, description: t.job_summary || '', key_responsibilities: t.key_responsibilities || '', qualifications: t.qualifications || '', technical_skills: t.technical_skills || '', core_competencies: t.core_competencies || '' });
    }
  };

  const handleSave = async () => {
    if (!form.title && !editing) return setMessage('Select a title first');
    setSaving(true);
    try {
      if (editing) {
        await hrApi.put(`/recruitment/jobs/${editing.id}`, form);
        setMessage('Job updated');
      } else {
        await hrApi.post('/recruitment/jobs', form);
        setMessage('Job created');
      }
      setShowForm(false);
      fetchJobs(page);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to save job');
    }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = async (id) => {
    try {
      await hrApi.delete(`/recruitment/jobs/${id}`);
      setMessage('Job deleted');
      fetchJobs(page);
    } catch {
      setMessage('Failed to delete job');
    }
    setConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const nextStep = () => {
    if (step === 1 && !form.title) return setMessage('Please select a title');
    setStep(s => Math.min(s + 1, 3));
    setMessage('');
    setTimeout(() => setMessage(''), 3000);
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  if (loading) return <div className="loading">Loading jobs...</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Job Posts</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ New Job</button>
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Department</th>
              <th>Type</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr><td colSpan={6} className="text-center">No jobs found</td></tr>
            ) : jobs.map(job => (
              <tr key={job.id}>
                <td>{job.title}</td>
                <td>{job.department}</td>
                <td>{job.type}</td>
                <td><span className={`badge badge-${job.status === 'active' ? 'success' : 'secondary'}`}>{job.status}</span></td>
                <td>{job.applicants || 0}</td>
                <td>
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(job)}>Edit</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirm(job)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPage={fetchJobs} />}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '95vh', overflowY: 'auto', padding: 0 }}>

            {/* ─── Header ─── */}
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>{editing ? '✏️' : '➕'}</span>
                {editing ? 'Edit Job' : 'Post a New Job'}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            {/* ─── Step Indicator ─── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '20px 28px', margin: '16px 28px 0', background: '#f4f6fb', borderRadius: 10 }}>
              {[
                { n: 1, label: 'Position', icon: '🎯' },
                { n: 2, label: 'Summary', icon: '📝' },
                { n: 3, label: 'Details', icon: '📋' },
              ].map((s, i) => (
                <Fragment key={s.n}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: step >= s.n ? '#1a1a2e' : '#e0e4ec',
                      color: step >= s.n ? '#fff' : '#8892a8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13,
                      transition: 'all .2s',
                    }}>
                      {step > s.n ? '✓' : s.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: step >= s.n ? '#1a1a2e' : '#8892a8' }}>Step {s.n}</div>
                      <div style={{ fontSize: 11, color: '#8892a8' }}>{s.label}</div>
                    </div>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 2, background: step > s.n ? '#1a1a2e' : '#e0e4ec', margin: '0 8px', borderRadius: 1 }} />}
                  </Fragment>
              ))}
            </div>

            {/* ─── Step 1: Position ─── */}
            {step === 1 && (
              <div style={{ padding: '20px 28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>Department</label>
                    <select className="form-control" value={form.department_id}
                      onChange={e => { setForm({ ...form, department_id: e.target.value, title_id: '', title: '', department: '', technical: false }); }}>
                      <option value="">— Choose —</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>Job Title</label>
                    <select className="form-control" value={form.title_id}
                      onChange={e => handleTitleSelect(e.target.value)} disabled={!form.department_id}>
                      <option value="">— Select —</option>
                      {filteredTitles.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.title} {t.grade_name ? `(Grade ${t.grade_level})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {form.title && (
                  <div style={{ display: 'flex', gap: 16, padding: '12px 16px', background: '#f4f6fb', borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
                    <div><strong>Title:</strong> {form.title}</div>
                    <div><strong>Department:</strong> {form.department}</div>
                    <div><strong>Technical:</strong> {form.technical ? '✓ Yes' : '—'}</div>
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: 13 }}>Employment Type</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {['Full-Time', 'Part-Time', 'Contract', 'Internship'].map(t => (
                      <label key={t} style={{
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        padding: '8px 16px', borderRadius: 8, border: '1.5px solid',
                        borderColor: form.type === t ? '#1a1a2e' : '#e0e4ec',
                        background: form.type === t ? '#f0f1f5' : '#fff',
                        fontSize: 13, fontWeight: 500, transition: 'all .15s',
                      }}>
                        <input type="radio" name="type" value={t} checked={form.type === t}
                          onChange={e => setForm({ ...form, type: e.target.value })}
                          style={{ margin: 0, accentColor: '#1a1a2e' }} />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Step 2: Summary ─── */}
            {step === 2 && (
              <div style={{ padding: '20px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 22 }}>📝</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Job Summary</div>
                    <div style={{ fontSize: 12, color: '#8892a8' }}>Write a brief overview of the role</div>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <textarea className="form-control" rows={6}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Write a compelling summary of the role, its impact, and why someone should apply..."
                    style={{ width: '100%', resize: 'vertical', fontSize: 14, lineHeight: 1.7 }} />
                </div>
              </div>
            )}

            {/* ─── Step 3: Detailed Sections ─── */}
            {step === 3 && (
              <div style={{ padding: '20px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 22 }}>📋</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Job Details</div>
                    <div style={{ fontSize: 12, color: '#8892a8' }}>Fill in the detailed sections for the job posting</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {SECTIONS.map(sec => (
                    <div key={sec.key} className="card" style={{ margin: 0, background: '#fafbfc' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{sec.icon}</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{sec.label}</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="form-control" rows={4}
                          value={form[sec.key]}
                          onChange={e => setForm({ ...form, [sec.key]: e.target.value })}
                          placeholder={sec.placeholder}
                          style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Footer ─── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '16px 28px', borderTop: '1px solid #eef0f5',
              background: '#fafbfc', borderRadius: '0 0 12px 12px',
            }}>
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <div style={{ flex: 1 }} />
              {step > 1 && <button className="btn btn-outline" onClick={prevStep}>← Back</button>}
              {step < 3 ? (
                <button className="btn btn-primary" onClick={nextStep}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Continue →
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving ? '⏳ Saving...' : editing ? '✏️ Update Job' : '🚀 Publish Job'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message={`Delete job "${confirm.title}"?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
