// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, Fragment } from 'react';
import Icon from '../../../shared/components/Icon';
import hrApi from '../../../shared/api/hrApi';

import ConfirmModal from '../../../shared/components/ConfirmModal';
import Pagination from '../../../shared/components/Pagination';

const INIT_FORM = {
  department_id: '', title_id: '', title: '', department: '', type: 'Full-Time',
  technical: false, status: 'active', description: '',
  key_responsibilities: '', qualifications: '', technical_skills: '', core_competencies: '',
  workflow_template_id: '',
};

const SECTIONS = [
  { key: 'key_responsibilities', label: 'Key Responsibilities', icon: 'lucide:list-checks', placeholder: 'List the main responsibilities and day-to-day tasks for this role...' },
  { key: 'qualifications', label: 'Qualifications And Skills', icon: 'lucide:graduation-cap', placeholder: 'Required education, certifications, years of experience...' },
  { key: 'technical_skills', label: 'Technical Skills & Knowledge', icon: 'lucide:settings', placeholder: 'Specific tools, technologies, software, or methodologies required...' },
  { key: 'core_competencies', label: 'Core Competencies', icon: 'lucide:sparkles', placeholder: 'Soft skills, behavioral traits, and core values expected...' },
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
  const [workflowTemplates, setWorkflowTemplates] = useState([]);

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
    hrApi.get('/recruitment/workflows').then(r => setWorkflowTemplates(r.data)).catch(() => {});
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
      workflow_template_id: job.workflow_template_id || '',
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return 'glass-badge glass-badge-success';
      case 'closed': return 'glass-badge glass-badge-danger';
      case 'paused': return 'glass-badge glass-badge-warning';
      default: return 'glass-badge glass-badge-neutral';
    }
  };

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner"></div>
      <span>Loading jobs...</span>
    </div>
  );

  return (
    <div className="page fade-in-up">
      <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-glass)', marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon icon="lucide:briefcase" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}></Icon>
          Job Posts
        </h1>
        <button className="glass-btn glass-btn-primary" onClick={openCreate}>
          <Icon icon="lucide:plus"></Icon> New Job
        </button>
      </div>

      {message && (
        <div className="glass-alert glass-alert-info">
          <Icon icon="lucide:info"></Icon> {message}
        </div>
      )}

      <div className="glass-table-wrapper fade-in-up delay-1">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Department</th>
              <th>Type</th>
              <th>Status</th>
              <th>Applicants</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="glass-empty">
                  <Icon icon="lucide:briefcase"></Icon>
                  <h3>No jobs found</h3>
                </div>
              </td></tr>
            ) : jobs.map(job => (
              <tr key={job.id}>
                <td><strong>{job.title}</strong></td>
                <td>{job.department}</td>
                <td>{job.type}</td>
                <td><span className={getStatusBadge(job.status)}>{job.status}</span></td>
                <td>
                  <span className="glass-badge glass-badge-info" style={{ fontSize: '0.8rem' }}>
                    {job.applicants || 0} applicant{job.applicants !== 1 ? 's' : ''}
                  </span>
                </td>
                <td>
                  {job.hc_request_id ? (
                    <span className="glass-badge glass-badge-info">Headcount Request</span>
                  ) : (
                    <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>—</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => openEdit(job)}>
                      <Icon icon="lucide:pencil"></Icon> Edit
                    </button>
                    <button className="glass-btn glass-btn-xs glass-btn-danger" onClick={() => setConfirm(job)}>
                      <Icon icon="lucide:trash-2"></Icon> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPage={fetchJobs} />}

      {showForm && (
        <div className="glass-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '95vh', overflowY: 'auto', padding: 0 }}>

            {/* Header */}
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon={editing ? 'lucide:pencil' : 'lucide:plus'} style={{ color: 'var(--brand-primary)' }}></Icon>
                {editing ? 'Edit Job' : 'Post a New Job'}
              </h3>
              <button className="glass-modal-close" onClick={() => setShowForm(false)}><Icon icon="lucide:x" /></button>
            </div>

            {/* Step Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '20px 28px', margin: '16px 28px 0', background: 'rgba(24,24,27,0.5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
              {[
                { n: 1, label: 'Position', icon: 'lucide:crosshair' },
                { n: 2, label: 'Summary', icon: 'lucide:file-text' },
                { n: 3, label: 'Details', icon: 'lucide:list-checks' },
              ].map((s, i) => (
                <Fragment key={s.n}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: step >= s.n ? 'var(--brand-primary)' : 'rgba(255,255,255,0.08)',
                      color: step >= s.n ? '#fff' : 'var(--text-faint)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 13,
                      transition: 'all .2s',
                    }}>
                      {step > s.n ? (
                        <Icon icon="lucide:check"></Icon>
                      ) : (
                        <Icon icon={s.icon}></Icon>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: step >= s.n ? 'var(--text-primary)' : 'var(--text-faint)' }}>Step {s.n}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{s.label}</div>
                    </div>
                  </div>
                  {i < 2 && <div style={{ flex: 1, height: 2, background: step > s.n ? 'var(--brand-primary)' : 'rgba(255,255,255,0.08)', margin: '0 8px', borderRadius: 1 }} />}
                </Fragment>
              ))}
            </div>

            {/* Step 1: Position */}
            {step === 1 && (
              <div style={{ padding: '20px 28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Department</label>
                    <select className="glass-select" value={form.department_id}
                      onChange={e => { setForm({ ...form, department_id: e.target.value, title_id: '', title: '', department: '', technical: false }); }}>
                      <option value="">— Choose —</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Job Title</label>
                    <select className="glass-select" value={form.title_id}
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
                  <div className="glass-form-preview" style={{ marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div><strong>Title:</strong> {form.title}</div>
                    <div><strong>Department:</strong> {form.department}</div>
                    <div><strong>Technical:</strong> {form.technical ? <Icon icon="lucide:check" style={{ color: 'var(--success)' }}></Icon> : '—'}</div>
                  </div>
                )}

                {form.title_id && (() => {
                  const t = titles.find(x => String(x.id) === form.title_id);
                  if (!t || (!t.min_education_level && t.min_experience_years == null && (!t.required_skills || t.required_skills.length === 0) && (!t.required_certs || t.required_certs.length === 0) && (!t.preferred_certs || t.preferred_certs.length === 0))) return null;
                  const eduLabel = { high_school: 'High School', diploma: 'Diploma', associate: 'Associate', bachelor: 'Bachelor\'s', master: 'Master\'s', phd: 'PhD' };
                  const skills = Array.isArray(t.required_skills_display) ? t.required_skills_display : [];
                  const certs = Array.isArray(t.required_certs_display) ? t.required_certs_display : [];
                  const prefSkills = Array.isArray(t.preferred_skills_display) ? t.preferred_skills_display : [];
                  const prefCerts = Array.isArray(t.preferred_certs_display) ? t.preferred_certs_display : [];
                  return (
                    <div className="glass-card" style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--warning)' }}>
                        <Icon icon="lucide:target"></Icon> Auto-Screening Minimum Requirements
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-faint)' }}>(candidates below these will be auto-rejected)</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {t.min_education_level && <span className="glass-badge glass-badge-warning"><Icon icon="lucide:graduation-cap" style={{ marginRight: 2 }}></Icon>{eduLabel[t.min_education_level] || t.min_education_level}</span>}
                        {t.min_experience_years != null && <span className="glass-badge glass-badge-warning"><Icon icon="lucide:calendar" style={{ marginRight: 2 }}></Icon>{t.min_experience_years}+ years</span>}
                        {skills.map(s => <span key={s} className="glass-badge glass-badge-info"><Icon icon="lucide:wrench" style={{ marginRight: 2 }}></Icon>{s}</span>)}
                        {certs.map(c => <span key={c} className="glass-badge glass-badge-danger"><Icon icon="lucide:award" style={{ marginRight: 2 }}></Icon>{c}</span>)}
                      </div>
                      {prefSkills.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Preferred:</span>
                          {prefSkills.map(s => <span key={s} className="glass-badge glass-badge-success">{s}</span>)}
                        </div>
                      )}
                      {prefCerts.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Preferred Certs:</span>
                          {prefCerts.map(c => <span key={c} className="glass-badge glass-badge-success">{c}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Workflow Template</label>
                  <select className="glass-select" value={form.workflow_template_id}
                    onChange={e => setForm({ ...form, workflow_template_id: e.target.value })}
                    style={{ width: '100%' }}>
                    <option value="">— Default —</option>
                    {workflowTemplates.filter(t => t.is_active).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.stages_count || 0} stages)</option>
                    ))}
                  </select>
                </div>

                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Employment Type</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {['Full-Time', 'Part-Time', 'Contract', 'Internship'].map(t => (
                      <label key={t} style={{
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid',
                        borderColor: form.type === t ? 'var(--brand-primary)' : 'var(--border-glass)',
                        background: form.type === t ? 'rgba(99,102,241,0.1)' : 'transparent',
                        fontSize: 13, fontWeight: 500, transition: 'all .15s',
                      }}>
                        <input type="radio" name="type" value={t} checked={form.type === t}
                          onChange={e => setForm({ ...form, type: e.target.value })}
                          style={{ margin: 0, accentColor: 'var(--brand-primary)' }} />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Summary */}
            {step === 2 && (
              <div style={{ padding: '20px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Icon icon="lucide:file-text" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}></Icon>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Job Summary</div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Write a brief overview of the role</div>
                  </div>
                </div>

                <div className="glass-form-group" style={{ margin: 0 }}>
                  <textarea className="glass-textarea" rows={6}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Write a compelling summary of the role, its impact, and why someone should apply..."
                    style={{ resize: 'vertical', fontSize: 14, lineHeight: 1.7 }} />
                </div>
              </div>
            )}

            {/* Step 3: Detailed Sections */}
            {step === 3 && (
              <div style={{ padding: '20px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <Icon icon="lucide:list-checks" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}></Icon>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Job Details</div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Fill in the detailed sections for the job posting</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {SECTIONS.map(sec => (
                    <div key={sec.key} className="glass-card" style={{ margin: 0, background: 'rgba(24,24,27,0.4)' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon icon={sec.icon} style={{ fontSize: 16, color: 'var(--brand-primary)' }}></Icon>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{sec.label}</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="glass-textarea" rows={4}
                          value={form[sec.key]}
                          onChange={e => setForm({ ...form, [sec.key]: e.target.value })}
                          placeholder={sec.placeholder}
                          style={{ resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="glass-modal-footer" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '16px 28px', borderTop: '1px solid var(--border-glass)',
              background: 'rgba(24,24,27,0.4)', borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
            }}>
              <button className="glass-btn glass-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <div style={{ flex: 1 }} />
              {step > 1 && <button className="glass-btn glass-btn-ghost" onClick={prevStep}><Icon icon="lucide:chevron-left"></Icon> Back</button>}
              {step < 3 ? (
                <button className="glass-btn glass-btn-primary" onClick={nextStep}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Continue <Icon icon="lucide:chevron-right"></Icon>
                </button>
              ) : (
                <button className="glass-btn glass-btn-primary" onClick={handleSave} disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Saving...</> : (
                    <>{editing ? <><Icon icon="lucide:pencil"></Icon> Update Job</> : <><Icon icon="lucide:rocket"></Icon> Publish Job</>}</>
                  )}
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
