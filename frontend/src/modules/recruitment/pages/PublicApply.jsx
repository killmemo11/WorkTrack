// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MasterSelect from '../../../shared/components/MasterSelect';

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

const STEPS = [
  { icon: 'lucide:briefcase', label: 'Position & Contact' },
  { icon: 'lucide:user', label: 'Personal Details' },
  { icon: 'lucide:dollar-sign', label: 'Career & Salary' },
  { icon: 'lucide:award', label: 'Qualifications & Docs' },
  { icon: 'lucide:check-circle', label: 'Review & Submit' },
];

const STEP_ICONS = STEPS.map(s => s.icon);

export default function PublicApply() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job');
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(jobId || '');
  const [jobTitle, setJobTitle] = useState('');
  const [technical, setTechnical] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', cover: '', current_salary: '', expected_salary: '', nationality: '', birth_date: '', national_id: '', current_job_title: '', last_work_place: '', reason_leaving: '', governorate: '', city: '', district: '' });
  const [educationLevel, setEducationLevel] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [skills, setSkills] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [cvFile, setCvFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [stepErrors, setStepErrors] = useState('');

  useEffect(() => {
    axios.get('/api/jobs/active')
      .then(res => {
        setJobs(res.data);
        if (jobId) {
          const match = res.data.find(j => String(j.id) === jobId);
          if (match) {
            setJobTitle(match.title);
            setTechnical(!!match.technical);
            setSelectedJobId(jobId);
          }
        }
      })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, [jobId]);

  const handleJobChange = (e) => {
    const id = e.target.value;
    setSelectedJobId(id);
    const match = jobs.find(j => String(j.id) === id);
    setJobTitle(match ? match.title : '');
    setTechnical(match ? !!match.technical : false);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateStep = () => {
    setStepErrors('');
    if (step === 0) {
      if (!jobTitle) { setStepErrors('Please select a position'); return false; }
      if (!form.name.trim()) { setStepErrors('Full name is required'); return false; }
      if (!form.email.trim()) { setStepErrors('Email is required'); return false; }
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) { setStepErrors('Email is invalid'); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setError('');
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => {
    setError('');
    setStepErrors('');
    setStep(s => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      fd.append('job_id', selectedJobId || '');
      fd.append('job_title', jobTitle);
      fd.append('technical', technical ? '1' : '0');
      fd.append('cover', form.cover);
      fd.append('source', 'Portal');
      fd.append('education_level', educationLevel || '');
      fd.append('experience_years', experienceYears || '');
      fd.append('current_salary', form.current_salary || '');
      fd.append('expected_salary', form.expected_salary || '');
      fd.append('nationality', form.nationality || '');
      fd.append('birth_date', form.birth_date || '');
      fd.append('national_id', form.national_id || '');
      fd.append('current_job_title', form.current_job_title || '');
      fd.append('last_work_place', form.last_work_place || '');
      fd.append('reason_leaving', form.reason_leaving || '');
      fd.append('governorate', form.governorate || '');
      fd.append('city', form.city || '');
      fd.append('district', form.district || '');
      if (skills.length > 0) fd.append('skills', JSON.stringify(skills));
      if (certifications.length > 0) fd.append('certifications', JSON.stringify(certifications));
      if (cvFile) fd.append('cv', cvFile);

      const res = await axios.post('/api/apply', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="glass-card fade-in-up"><div className="glass-card-body" style={{ padding: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <Icon icon="lucide:check-circle" style={{ fontSize: '2rem', color: 'var(--success)' }}></Icon>
          </div>
          <h2 style={{ color: 'var(--text-primary)' }}>Application Submitted!</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>
            Thank you for applying to <strong style={{ color: 'var(--brand-primary)' }}>{jobTitle}</strong>.
          </p>
          <p>Your reference number is <strong className="glass-badge glass-badge-success">{success.ref}</strong></p>
          {success.email_sent && <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}><Icon icon="lucide:mail" style={{ marginRight: 4 }}></Icon>A confirmation email has been sent to {form.email}.</p>}
          <button className="glass-btn glass-btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate('/careers')}>
            <Icon icon="lucide:arrow-left"></Icon> Back to Jobs
          </button>
        </div></div>
      </div>
    );
  }

  const btnStyle = (i) => ({
    width: 40, height: 40, borderRadius: '50%', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    background: step === i ? 'var(--brand-gradient)' : i < step ? 'rgba(34,197,94,0.85)' : 'rgba(255,255,255,0.06)',
    color: step >= i ? '#fff' : 'var(--text-dim)',
    fontSize: 16, cursor: i <= step ? 'pointer' : 'default', transition: 'all 0.3s',
  });

  const stepLineStyle = (i) => ({
    flex: 1, height: 2,
    background: i < step ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.06)',
    transition: 'all 0.3s',
  });

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }} className="fade-in-up">
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--brand-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
        }}>
          <Icon icon="lucide:send" style={{ fontSize: '1.4rem', color: '#fff' }}></Icon>
        </div>
        <h1 style={{ textAlign: 'center', color: 'var(--text-primary)' }}>Apply for a Position</h1>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }} className="fade-in-up">
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers')}>
          <Icon icon="lucide:briefcase"></Icon> Jobs
        </button>
        <button className="glass-btn glass-btn-primary">
          <Icon icon="lucide:send"></Icon> Apply
        </button>
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers/track')}>
          <Icon icon="lucide:search"></Icon> Track
        </button>
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers/interviews')}>
          <Icon icon="lucide:video"></Icon> Interviews
        </button>
      </div>

      {/* Progress Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, padding: '0 8px' }} className="fade-in-up delay-1">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={stepLineStyle(i)} />}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button style={btnStyle(i)} onClick={() => i <= step && setStep(i)}>
                {i < step ? <Icon icon="lucide:check" style={{ fontSize: 18 }}></Icon>
                  : i === step ? <Icon icon={STEP_ICONS[i]} style={{ fontSize: 18 }}></Icon>
                  : <Icon icon={STEP_ICONS[i]} style={{ fontSize: 16 }}></Icon>}
              </button>
              <span style={{ fontSize: 11, color: step === i ? 'var(--text-primary)' : 'var(--text-faint)', whiteSpace: 'nowrap', fontWeight: step === i ? 600 : 400, transition: 'all 0.3s' }}>
                {s.label}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="glass-card fade-in-up delay-2">
        <div className="glass-card-body" style={{ padding: 32 }}>
          {stepErrors && (
            <div className="glass-alert glass-alert-danger" role="alert" style={{ marginBottom: 16 }}>
              <Icon icon="lucide:alert-circle"></Icon> {stepErrors}
            </div>
          )}
          {error && (
            <div className="glass-alert glass-alert-danger" role="alert" style={{ marginBottom: 16 }}>
              <Icon icon="lucide:alert-circle"></Icon> {error}
            </div>
          )}

          {/* ═══ Step 0: Position & Contact ═══ */}
          {step === 0 && (
            <div>
              <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon="lucide:briefcase" style={{ color: 'var(--brand-primary)' }}></Icon> Position & Contact
              </h3>
              <div className="glass-form-group">
                <label className="glass-label">Position *</label>
                {jobsLoading ? (
                  <div className="glass-input" style={{ color: 'var(--text-faint)' }}>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}></div>
                    Loading positions...
                  </div>
                ) : (
                  <select className="glass-select" value={selectedJobId} onChange={handleJobChange} required>
                    <option value="">— Select a position —</option>
                    {jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title} — {j.department}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Full Name *</label>
                <input name="name" className="glass-input" value={form.name} onChange={handleChange} required placeholder="Your full name" />
              </div>
              <div className="glass-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Email *</label>
                  <input name="email" type="email" className="glass-input" value={form.email} onChange={handleChange} required placeholder="your@email.com" />
                </div>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Phone</label>
                  <input name="phone" type="tel" className="glass-input" value={form.phone} onChange={handleChange} placeholder="+20 100 000 0000" />
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 1: Personal Details ═══ */}
          {step === 1 && (
            <div>
              <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon="lucide:user" style={{ color: 'var(--brand-primary)' }}></Icon> Personal Details
              </h3>
              <div className="glass-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Nationality</label>
                  <input name="nationality" className="glass-input" value={form.nationality} onChange={handleChange} placeholder="e.g. Egyptian" />
                </div>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Birth Date</label>
                  <input name="birth_date" type="date" className="glass-input" value={form.birth_date} onChange={handleChange} />
                </div>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">National ID</label>
                  <input name="national_id" className="glass-input" value={form.national_id} onChange={handleChange} placeholder="National ID number" />
                </div>
              </div>
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-glass)' }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon icon="lucide:map-pin"></Icon> Address
                </div>
                <div className="glass-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Governorate</label>
                    <input name="governorate" className="glass-input" value={form.governorate} onChange={handleChange} placeholder="e.g. Cairo" />
                  </div>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">City</label>
                    <input name="city" className="glass-input" value={form.city} onChange={handleChange} placeholder="e.g. Nasr City" />
                  </div>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">District / Area</label>
                    <input name="district" className="glass-input" value={form.district} onChange={handleChange} placeholder="e.g. El Nozha" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 2: Career & Salary ═══ */}
          {step === 2 && (
            <div>
              <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon="lucide:dollar-sign" style={{ color: 'var(--brand-primary)' }}></Icon> Career & Salary
              </h3>
              <div className="glass-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Current / Last Job Title</label>
                  <input name="current_job_title" className="glass-input" value={form.current_job_title} onChange={handleChange} placeholder="e.g. Software Engineer" />
                </div>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Last Work Place (Company)</label>
                  <input name="last_work_place" className="glass-input" value={form.last_work_place} onChange={handleChange} placeholder="e.g. Company Name" />
                </div>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Current Salary (EGP)</label>
                  <input name="current_salary" type="number" step="0.01" className="glass-input" value={form.current_salary} onChange={handleChange} placeholder="e.g. 15000" />
                </div>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Expected Salary (EGP)</label>
                  <input name="expected_salary" type="number" step="0.01" className="glass-input" value={form.expected_salary} onChange={handleChange} placeholder="e.g. 20000" />
                </div>
              </div>
              <div className="glass-form-group" style={{ marginTop: 12 }}>
                <label className="glass-label">Reason for Leaving</label>
                <textarea name="reason_leaving" className="glass-textarea" rows={2} value={form.reason_leaving} onChange={handleChange} placeholder="Briefly describe why you left your last position..." />
              </div>
            </div>
          )}

          {/* ═══ Step 3: Qualifications & Docs ═══ */}
          {step === 3 && (
            <div>
              <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon="lucide:award" style={{ color: 'var(--brand-primary)' }}></Icon> Qualifications & Documents
              </h3>
              <div className="glass-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Education Level</label>
                  <select className="glass-select" value={educationLevel} onChange={e => setEducationLevel(e.target.value)}>
                    {EDU_LEVELS.map(el => <option key={el.value} value={el.value}>{el.label}</option>)}
                  </select>
                </div>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Years of Experience</label>
                  <select className="glass-select" value={experienceYears} onChange={e => setExperienceYears(e.target.value)}>
                    {EXP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Skills</label>
                <MasterSelect type="skills" value={skills} onChange={setSkills} placeholder="Search and select your skills..." usePublicApi />
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Certifications</label>
                <MasterSelect type="certs" value={certifications} onChange={setCertifications} placeholder="Search and select your certifications..." usePublicApi />
              </div>
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-glass)' }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon icon="lucide:file-text"></Icon> CV / Resume
                </div>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '12px 16px', border: '2px dashed var(--border-glass)', borderRadius: 'var(--radius-md)', background: 'rgba(24,24,27,0.3)' }}>
                    <Icon icon="lucide:upload" style={{ fontSize: '1.2rem', color: 'var(--brand-primary)' }}></Icon>
                    <span style={{ color: cvFile ? 'var(--text-primary)' : 'var(--text-dim)' }}>
                      {cvFile ? cvFile.name : 'Upload your CV (PDF, DOC, DOCX)'}
                    </span>
                    <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }}
                      onChange={e => setCvFile(e.target.files[0])} />
                  </label>
                </div>
              </div>
              <div className="glass-form-group" style={{ marginTop: 16 }}>
                <label className="glass-label">Cover Note</label>
                <textarea name="cover" className="glass-textarea" rows={3} value={form.cover} onChange={handleChange} placeholder="Tell us why you're a great fit for this role..." />
              </div>
            </div>
          )}

          {/* ═══ Step 4: Review & Submit ═══ */}
          {step === 4 && (
            <div>
              <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon="lucide:check-circle" style={{ color: 'var(--brand-primary)' }}></Icon> Review & Submit
              </h3>
              <div className="glass-card" style={{ background: 'rgba(24,24,27,0.3)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
                <div className="glass-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Position</span><span className="glass-detail-value">{jobTitle}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Name</span><span className="glass-detail-value">{form.name}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Email</span><span className="glass-detail-value">{form.email}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Phone</span><span className="glass-detail-value">{form.phone || '—'}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Nationality</span><span className="glass-detail-value">{form.nationality || '—'}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Birth Date</span><span className="glass-detail-value">{form.birth_date || '—'}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>National ID</span><span className="glass-detail-value">{form.national_id || '—'}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Address</span><span className="glass-detail-value">{[form.governorate, form.city, form.district].filter(Boolean).join(' — ') || '—'}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Job Title</span><span className="glass-detail-value">{form.current_job_title || '—'}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Last Work Place</span><span className="glass-detail-value">{form.last_work_place || '—'}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Current Salary</span><span className="glass-detail-value">{form.current_salary ? `EGP ${Number(form.current_salary).toLocaleString()}` : '—'}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Expected Salary</span><span className="glass-detail-value">{form.expected_salary ? `EGP ${Number(form.expected_salary).toLocaleString()}` : '—'}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Education</span><span className="glass-detail-value">{EDU_LEVELS.find(e => e.value === educationLevel)?.label || '—'}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>Experience</span><span className="glass-detail-value">{EXP_OPTIONS.find(e => e.value === experienceYears)?.label || '—'}</span></div>
                  <div className="glass-detail-row" style={{ padding: '6px 0' }}><span className="glass-detail-label" style={{ fontSize: 12 }}>CV</span><span className="glass-detail-value">{cvFile ? cvFile.name : '—'}</span></div>
                </div>
              </div>
              {loading ? (
                <button className="glass-btn glass-btn-primary glass-btn-lg glass-btn-full" disabled style={{ marginTop: 8 }}>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Submitting...
                </button>
              ) : (
                <button className="glass-btn glass-btn-primary glass-btn-lg glass-btn-full" onClick={handleSubmit} style={{ marginTop: 8 }}>
                  <Icon icon="lucide:send"></Icon> Submit Application
                </button>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 4 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-glass)' }}>
              <button className="glass-btn glass-btn-ghost" onClick={step === 0 ? () => navigate('/careers') : prevStep}>
                <Icon icon={step === 0 ? 'lucide:arrow-left' : 'lucide:chevron-left'} style={{ marginRight: 4 }}></Icon>
                {step === 0 ? 'Back to Jobs' : 'Previous'}
              </button>
              <button className="glass-btn glass-btn-primary" onClick={nextStep}>
                Next <Icon icon="lucide:chevron-right" style={{ marginLeft: 4 }}></Icon>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
