// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useRef } from 'react';
import Icon from '../../../shared/components/Icon';
import { useParams, useNavigate } from 'react-router-dom';
import hrApi from '../../../shared/api/hrApi';
import { formatDate, formatDateTime } from '../../../shared/utils/date';


const STAGES = ['applied', 'phone', 'first', 'second', 'third', 'offer', 'hired', 'rejected'];

const EDU_LABEL = { high_school: 'High School', diploma: 'Diploma', associate: 'Associate Degree', bachelor: 'Bachelor\'s', master: 'Master\'s', phd: 'PhD' };
const EXP_LABEL = { '0-1': 'Less than 1 year', '1-2': '1–2 years', '2-3': '2–3 years', '3-5': '3–5 years', '5-7': '5–7 years', '7-10': '7–10 years', '10-15': '10–15 years', '15-20': '15–20 years', '20+': 'More than 20 years' };

export default function CandidateDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [message, setMessage] = useState('');
  const [departments, setDepartments] = useState([]);
  const [titles, setTitles] = useState([]);
  const [showHire, setShowHire] = useState(false);
  const [hireForm, setHireForm] = useState({ department_id: '', title_id: '', employee_id: '', start_date: '' });
  const [hiring, setHiring] = useState(false);
  const [hireResult, setHireResult] = useState(null);
  const [moveStage, setMoveStage] = useState('');
  const [moveNote, setMoveNote] = useState('');
  const [scoreForm, setScoreForm] = useState({ interview: '1st Interview', comm: 0, technical: 0, fit: 0, overall: 0, notes: '', decision: 'pending' });
  const [offerForm, setOfferForm] = useState({ position: '', department: '', salary: '', start_date: '', reports_to: '', benefits: '' });
  const [editForm, setEditForm] = useState({});
  const [editing, setEditing] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const fileRef = useRef(null);

  const fetchCandidate = async () => {
    try {
      const res = await hrApi.get(`/recruitment/candidates/${id}`);
      setCandidate(res.data);
      setEditForm({
        name: res.data.name, email: res.data.email, phone: res.data.phone || '',
        job_title: res.data.job_title || '', notes: res.data.notes || '',
        current_salary: res.data.current_salary || '', expected_salary: res.data.expected_salary || '',
        nationality: res.data.nationality || '', birth_date: res.data.birth_date || '', national_id: res.data.national_id || '',
        current_job_title: res.data.current_job_title || '', last_work_place: res.data.last_work_place || '',
        reason_leaving: res.data.reason_leaving || '',
        governorate: res.data.governorate || '', city: res.data.city || '', district: res.data.district || '',
      });
    } catch (err) {
      setMessage('Failed to load candidate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCandidate(); }, [id]);

  const handleMove = async () => {
    if (!moveStage) return;
    try {
      await hrApi.post(`/recruitment/candidates/${id}/move`, { stage: moveStage, note: moveNote || `Moved to ${moveStage}` });
      setMessage(`Moved to ${moveStage}`);
      fetchCandidate();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to move');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleUpdate = async () => {
    try {
      await hrApi.put(`/recruitment/candidates/${id}`, editForm);
      setMessage('Candidate updated');
      setEditing(false);
      fetchCandidate();
    } catch (err) {
      setMessage('Failed to update');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleAddScorecard = async () => {
    try {
      await hrApi.post(`/recruitment/candidates/${id}/scorecards`, scoreForm);
      setMessage('Scorecard added');
      setScoreForm({ interview: '1st Interview', comm: 0, technical: 0, fit: 0, overall: 0, notes: '', decision: 'pending' });
      fetchCandidate();
    } catch (err) {
      setMessage('Failed to add scorecard');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreateOffer = async () => {
    try {
      await hrApi.post(`/recruitment/candidates/${id}/offer`, offerForm);
      setMessage('Offer created and sent');
      fetchCandidate();
    } catch (err) {
      setMessage('Failed to create offer');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const openHireModal = async () => {
    setHireForm({ department_id: '', title_id: '', employee_id: '', start_date: '' });
    setHireResult(null);
    setShowHire(true);
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
      const res = await hrApi.post(`/recruitment/candidates/${id}/hire`, payload);
      setHireResult(res.data);
      setMessage(`Candidate hired! Employee #${res.data.employee_id} created.`);
      fetchCandidate();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to hire candidate');
      setShowHire(false);
    }
    setHiring(false);
    setTimeout(() => setMessage(''), 6000);
  };

  const handleUploadCv = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setCvUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await hrApi.post('/recruitment/upload/cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { filename, path } = uploadRes.data;
      await hrApi.post(`/recruitment/candidates/${id}/cv`, { filename, path });
      setMessage('CV uploaded successfully');
      fetchCandidate();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to upload CV');
    }
    setCvUploading(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const deptTitles = titles.filter(t => !hireForm.department_id || t.department_id === parseInt(hireForm.department_id));

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner"></div>
      <span>Loading...</span>
    </div>
  );
  if (!candidate) return (
    <div className="page">
      <div className="glass-empty">
        <Icon icon="lucide:user-x"></Icon>
        <h3>Candidate not found</h3>
      </div>
    </div>
  );

  return (
    <div className="page fade-in-up">
      <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-glass)', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/hr/candidates')}>
            <Icon icon="lucide:chevron-left"></Icon> Back
          </button>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon icon="lucide:user-circle" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}></Icon>
            {candidate.name}
          </h1>
        </div>
      </div>

      {message && (
        <div className="glass-alert glass-alert-info">
          <Icon icon="lucide:info"></Icon> {message}
        </div>
      )}

      <div className="glass-tabs" style={{ marginBottom: 20 }}>
        {['info', 'screening', 'history', 'scorecards', 'offers'].map(tab => (
          <button key={tab} className={`glass-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            <Icon icon={ tab === 'info' ? 'lucide:user' : tab === 'screening' ? 'lucide:scan-search' : tab === 'history' ? 'lucide:clock' : tab === 'scorecards' ? 'lucide:clipboard-list' : 'lucide:gift' } style={{ marginRight: 4 }}></Icon>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="glass-card fade-in-up">
          <div className="glass-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="glass-detail-row"><span className="glass-detail-label">Email</span><span className="glass-detail-value">{candidate.email}</span></div>
              <div className="glass-detail-row"><span className="glass-detail-label">Phone</span><span className="glass-detail-value">{candidate.phone || '—'}</span></div>
              <div className="glass-detail-row"><span className="glass-detail-label">Position</span><span className="glass-detail-value">{candidate.job_title || '—'}</span></div>
              <div className="glass-detail-row"><span className="glass-detail-label">Stage</span><span className="glass-detail-value">{stageBadge(candidate.stage)}</span></div>
              <div className="glass-detail-row"><span className="glass-detail-label">Source</span><span className="glass-detail-value">{candidate.source || '—'}</span></div>
              <div className="glass-detail-row"><span className="glass-detail-label">Scores</span><span className="glass-detail-value">C:{candidate.score_comm || 0} T:{candidate.score_tech || 0} F:{candidate.score_fit || 0}</span></div>
              {candidate.education_level && <div className="glass-detail-row"><span className="glass-detail-label">Education</span><span className="glass-detail-value">{EDU_LABEL[candidate.education_level] || candidate.education_level}</span></div>}
              {candidate.experience_years && <div className="glass-detail-row"><span className="glass-detail-label">Experience</span><span className="glass-detail-value">{EXP_LABEL[candidate.experience_years] || candidate.experience_years}</span></div>}
              {candidate.skills_display?.length > 0 && <div className="glass-detail-row"><span className="glass-detail-label">Skills</span><span className="glass-detail-value">{candidate.skills_display.join(', ')}</span></div>}
              {candidate.certs_display?.length > 0 && <div className="glass-detail-row"><span className="glass-detail-label">Certs</span><span className="glass-detail-value">{candidate.certs_display.join(', ')}</span></div>}
              {candidate.current_job_title && <div className="glass-detail-row"><span className="glass-detail-label">Current Job Title</span><span className="glass-detail-value">{candidate.current_job_title}</span></div>}
              {candidate.last_work_place && <div className="glass-detail-row"><span className="glass-detail-label">Last Work Place</span><span className="glass-detail-value">{candidate.last_work_place}</span></div>}
              {candidate.current_salary && <div className="glass-detail-row"><span className="glass-detail-label">Current Salary</span><span className="glass-detail-value">EGP {Number(candidate.current_salary).toLocaleString()}</span></div>}
              {candidate.expected_salary && <div className="glass-detail-row"><span className="glass-detail-label">Expected Salary</span><span className="glass-detail-value">EGP {Number(candidate.expected_salary).toLocaleString()}</span></div>}
              {candidate.reason_leaving && <div className="glass-detail-row"><span className="glass-detail-label">Reason for Leaving</span><span className="glass-detail-value">{candidate.reason_leaving}</span></div>}
              {candidate.nationality && <div className="glass-detail-row"><span className="glass-detail-label">Nationality</span><span className="glass-detail-value">{candidate.nationality}</span></div>}
              {candidate.birth_date && <div className="glass-detail-row"><span className="glass-detail-label">Birth Date</span><span className="glass-detail-value">{formatDate(candidate.birth_date)}</span></div>}
              {candidate.national_id && <div className="glass-detail-row"><span className="glass-detail-label">National ID</span><span className="glass-detail-value">{candidate.national_id}</span></div>}
              {candidate.governorate && <div className="glass-detail-row"><span className="glass-detail-label">Address</span><span className="glass-detail-value">{[candidate.governorate, candidate.city, candidate.district].filter(Boolean).join(' — ')}</span></div>}
              <div className="glass-detail-row">
                <span className="glass-detail-label">CV</span>
                <span className="glass-detail-value">
                  {candidate.cv_filename ? (
                    <span>
                      <a href={candidate.cv_path} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)' }}>{candidate.cv_filename}</a>
                      {' | '}
                      <label style={{ color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Replace
                        <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }}
                          onChange={e => { fileRef.current = e.target; handleUploadCv(); }} />
                      </label>
                    </span>
                  ) : (
                    <span>
                      <label style={{ color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>
                        {cvUploading ? 'Uploading...' : <><Icon icon="lucide:upload" style={{ marginRight: 4 }}></Icon> Upload CV</>}
                        <input type="file" ref={fileRef} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }}
                          onChange={handleUploadCv} />
                      </label>
                    </span>
                  )}
                </span>
              </div>
            </div>

            {editing ? (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-glass)' }}>
                <div className="glass-form-group"><label className="glass-label">Name</label><input className="glass-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div className="glass-form-group"><label className="glass-label">Email</label><input className="glass-input" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                <div className="glass-form-group"><label className="glass-label">Phone</label><input className="glass-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                <div className="glass-form-group"><label className="glass-label">Position</label><input className="glass-input" value={editForm.job_title} onChange={e => setEditForm({ ...editForm, job_title: e.target.value })} /></div>
                <div className="glass-form-group"><label className="glass-label">Notes</label><textarea className="glass-textarea" rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                  <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Current Salary</label><input className="glass-input" type="number" value={editForm.current_salary} onChange={e => setEditForm({ ...editForm, current_salary: e.target.value })} /></div>
                  <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Expected Salary</label><input className="glass-input" type="number" value={editForm.expected_salary} onChange={e => setEditForm({ ...editForm, expected_salary: e.target.value })} /></div>
                  <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Current Job Title</label><input className="glass-input" value={editForm.current_job_title} onChange={e => setEditForm({ ...editForm, current_job_title: e.target.value })} /></div>
                  <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Last Work Place</label><input className="glass-input" value={editForm.last_work_place} onChange={e => setEditForm({ ...editForm, last_work_place: e.target.value })} /></div>
                  <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Reason for Leaving</label><input className="glass-input" value={editForm.reason_leaving} onChange={e => setEditForm({ ...editForm, reason_leaving: e.target.value })} /></div>
                  <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Nationality</label><input className="glass-input" value={editForm.nationality} onChange={e => setEditForm({ ...editForm, nationality: e.target.value })} /></div>
                  <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Birth Date</label><input className="glass-input" type="date" value={editForm.birth_date} onChange={e => setEditForm({ ...editForm, birth_date: e.target.value })} /></div>
                  <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">National ID</label><input className="glass-input" value={editForm.national_id} onChange={e => setEditForm({ ...editForm, national_id: e.target.value })} /></div>
                  <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Governorate</label><input className="glass-input" value={editForm.governorate} onChange={e => setEditForm({ ...editForm, governorate: e.target.value })} /></div>
                  <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">City</label><input className="glass-input" value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} /></div>
                  <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">District</label><input className="glass-input" value={editForm.district} onChange={e => setEditForm({ ...editForm, district: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="glass-btn glass-btn-primary" onClick={handleUpdate}><Icon icon="lucide:check"></Icon> Save</button>
                  <button className="glass-btn glass-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="glass-btn glass-btn-ghost" style={{ marginTop: 16 }} onClick={() => setEditing(true)}>
                <Icon icon="lucide:pencil"></Icon> Edit
              </button>
            )}

            <hr style={{ borderColor: 'var(--border-glass)', margin: '20px 0' }} />
            <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon icon="lucide:arrow-right-left" style={{ color: 'var(--brand-primary)' }}></Icon> Move Stage
            </h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="glass-select" style={{ width: 160 }} value={moveStage} onChange={e => setMoveStage(e.target.value)}>
                <option value="">Select stage...</option>
                {STAGES.filter(s => s !== candidate.stage).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="glass-input" style={{ width: 200 }} placeholder="Note (optional)" value={moveNote} onChange={e => setMoveNote(e.target.value)} />
              <button className="glass-btn glass-btn-primary" onClick={handleMove} disabled={!moveStage}>
                <Icon icon="lucide:arrow-right"></Icon> Move
              </button>
              <button className="glass-btn glass-btn-success" onClick={openHireModal} style={{ marginLeft: 8 }}>
                <Icon icon="lucide:user-plus"></Icon> Hire
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Screening Tab */}
       {activeTab === 'screening' && (
         <div className="glass-card fade-in-up">
           <div className="glass-card-body">
             {!candidate.screening ? (
               <div className="glass-empty">
                 <Icon icon="lucide:scan-search"></Icon>
                 <h3>No auto-screening result available for this candidate.</h3>
               </div>
             ) : (
               <>
                 <div style={{ marginBottom: '24px', padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                   <span style={{ fontSize: '48px' }}>
                     {candidate.screening.overall_status === 'most_recommended' ? <Icon icon="lucide:star" style={{ color: 'var(--success)' }}></Icon> : candidate.screening.overall_status === 'recommended' ? <Icon icon="lucide:thumbs-up" style={{ color: '#3b82f6' }}></Icon> : <Icon icon="lucide:x" style={{ color: 'var(--error)' }}></Icon>}
                   </span>
                   <div>
                     <div style={{ fontSize: '24px', fontWeight: '700', textTransform: 'capitalize' }}>
                       {candidate.screening.overall_status === 'most_recommended' ? 'Most Recommended'
                         : candidate.screening.overall_status === 'recommended' ? 'Recommended'
                         : 'Rejected'}
                     </div>
                     <div style={{ fontSize: '14px', color: 'var(--text-dim)' }}>{formatDateTime(candidate.screening.created_at)}</div>
                   </div>
                 </div>

                 <div className={`glass-card ${candidate.screening.overall_status === 'most_recommended' ? 'glass-border-success' : candidate.screening.overall_status === 'recommended' ? 'glass-border-info' : 'glass-border-danger'}`}
                   style={{
                     padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '24px',
                     background: candidate.screening.overall_status === 'most_recommended' ? 'rgba(34, 197, 94, 0.08)'
                       : candidate.screening.overall_status === 'recommended' ? 'rgba(59, 130, 246, 0.08)'
                       : 'rgba(239, 68, 68, 0.08)',
                     border: `1px solid ${candidate.screening.overall_status === 'most_recommended' ? 'rgba(34, 197, 94, 0.25)'
                       : candidate.screening.overall_status === 'recommended' ? 'rgba(59, 130, 246, 0.25)'
                       : 'rgba(239, 68, 68, 0.25)'}`,
                     color: candidate.screening.overall_status === 'most_recommended' ? 'var(--success)'
                       : candidate.screening.overall_status === 'recommended' ? '#3b82f6'
                       : 'var(--error)',
                   }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                       <strong style={{ fontSize: '16px' }}>Screening Result</strong>
                       <div style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>
                         Requirements met: {candidate.screening.requirements_met} / {candidate.screening.requirements_total}
                       </div>
                     </div>
                     <div style={{ fontSize: '14px', color: 'var(--text-dim)' }}>
                       Auto-screened on {formatDate(candidate.screening.created_at)}
                     </div>
                   </div>
                 </div>

                 {candidate.screening.requirement_results && (
                   <div>
                     <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>
                       Requirement Breakdown
                     </h4>
                     <div className="glass-table-wrapper">
                       <table className="glass-table" style={{ margin: 0 }}>
                         <thead>
                           <tr>
                             <th>Requirement</th>
                             <th>Expected</th>
                             <th>Provided</th>
                             <th>Status</th>
                           </tr>
                         </thead>
                         <tbody>
                           {(candidate.screening.requirement_results || []).map((r, i) => {
                             const labelMap = { education_level: 'Education Level', experience_years: 'Experience Years', required_skills: 'Required Skills', required_certs: 'Required Certifications' };
                             const expectedStr = r.requirement === 'education_level' ? EDU_LABEL[r.expected] || r.expected
                               : r.requirement === 'experience_years' ? EXP_LABEL[r.expected] || r.expected
                               : Array.isArray(r.expected) ? r.expected.join(', ') : r.expected;
                             const providedStr = r.requirement === 'education_level' ? EDU_LABEL[r.provided] || r.provided
                               : r.requirement === 'experience_years' ? EXP_LABEL[r.provided] || r.provided
                               : Array.isArray(r.provided) ? r.provided.join(', ') : r.provided;
                             return (
                               <tr key={i}>
                                 <td style={{ color: 'var(--text-primary)' }}>
                                   {labelMap[r.requirement] || r.requirement}
                                 </td>
                                 <td style={{ color: 'var(--text-muted)' }}>
                                   {expectedStr || '—'}
                                 </td>
                                 <td style={{ color: 'var(--text-muted)' }}>
                                   {providedStr || '—'}
                                 </td>
                                 <td>
                                   {r.status === 'most_recommended' ?
                                     <span className="glass-badge glass-badge-success"><Icon icon="lucide:star" style={{ marginRight: 2, fontSize: '0.65rem' }}></Icon> Most Recommended</span>
                                     : r.status === 'recommended' ?
                                     <span className="glass-badge glass-badge-info"><Icon icon="lucide:thumbs-up" style={{ marginRight: 2, fontSize: '0.65rem' }}></Icon> Recommended</span>
                                     : <span className="glass-badge glass-badge-danger"><Icon icon="lucide:x" style={{ marginRight: 2, fontSize: '0.65rem' }}></Icon> Rejected</span>}
                                 </td>
                               </tr>
                             );
                           })}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}
               </>
             )}
           </div>
         </div>
       )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="glass-card fade-in-up">
          <div className="glass-card-body">
            {(!candidate.history || candidate.history.length === 0) ? (
              <div className="glass-empty">
                <Icon icon="lucide:clock"></Icon>
                <h3>No history</h3>
              </div>
            ) : (
              <div className="glass-table-wrapper">
                <table className="glass-table">
                  <thead><tr><th>Date</th><th>Stage</th><th>Note</th><th>By</th></tr></thead>
                  <tbody>
                    {candidate.history.map(h => (
                      <tr key={h.id}>
                        <td>{formatDateTime(h.created_at)}</td>
                        <td><span className="glass-badge glass-badge-neutral">{h.stage}</span></td>
                        <td>{h.note || '—'}</td>
                        <td style={{ color: 'var(--text-dim)' }}>{h.created_by || 'system'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scorecards Tab */}
      {activeTab === 'scorecards' && (
        <div className="glass-card fade-in-up">
          <div className="glass-card-body">
            <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon icon="lucide:clipboard-list" style={{ color: 'var(--brand-primary)' }}></Icon> Add Scorecard
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Interview</label><input className="glass-input" value={scoreForm.interview} onChange={e => setScoreForm({ ...scoreForm, interview: e.target.value })} /></div>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Communication (0-10)</label><input className="glass-input" type="number" min={0} max={10} value={scoreForm.comm} onChange={e => setScoreForm({ ...scoreForm, comm: +e.target.value })} /></div>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Technical (0-10)</label><input className="glass-input" type="number" min={0} max={10} value={scoreForm.technical} onChange={e => setScoreForm({ ...scoreForm, technical: +e.target.value })} /></div>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Fit (0-10)</label><input className="glass-input" type="number" min={0} max={10} value={scoreForm.fit} onChange={e => setScoreForm({ ...scoreForm, fit: +e.target.value })} /></div>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Overall (0-10)</label><input className="glass-input" type="number" min={0} max={10} value={scoreForm.overall} onChange={e => setScoreForm({ ...scoreForm, overall: +e.target.value })} /></div>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Decision</label><select className="glass-select" value={scoreForm.decision} onChange={e => setScoreForm({ ...scoreForm, decision: e.target.value })}><option>pending</option><option>pass</option><option>fail</option></select></div>
            </div>
            <div className="glass-form-group"><label className="glass-label">Notes</label><textarea className="glass-textarea" rows={2} value={scoreForm.notes} onChange={e => setScoreForm({ ...scoreForm, notes: e.target.value })} /></div>
            <button className="glass-btn glass-btn-primary" onClick={handleAddScorecard}>
              <Icon icon="lucide:plus"></Icon> Add Scorecard
            </button>

            {candidate.scorecards && candidate.scorecards.length > 0 && (
              <>
                <hr style={{ borderColor: 'var(--border-glass)', margin: '20px 0' }} />
                <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon icon="lucide:history" style={{ color: 'var(--text-dim)' }}></Icon> Previous Scorecards
                </h4>
                <div className="glass-table-wrapper">
                  <table className="glass-table">
                    <thead><tr><th>Interview</th><th>Interviewer</th><th>C</th><th>T</th><th>F</th><th>O</th><th>Decision</th></tr></thead>
                    <tbody>
                      {candidate.scorecards.map(sc => (
                        <tr key={sc.id}>
                          <td>{sc.interview}</td>
                          <td>{sc.interviewer}</td>
                          <td>{sc.comm}</td>
                          <td>{sc.technical}</td>
                          <td>{sc.fit}</td>
                          <td>{sc.overall}</td>
                          <td><span className={`glass-badge glass-badge-${sc.decision === 'pass' ? 'success' : sc.decision === 'fail' ? 'danger' : 'neutral'}`}>{sc.decision}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Offers Tab */}
      {activeTab === 'offers' && (
        <div className="glass-card fade-in-up">
          <div className="glass-card-body">
            <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon icon="lucide:gift" style={{ color: 'var(--brand-primary)' }}></Icon> Create Offer
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Position</label><input className="glass-input" value={offerForm.position} onChange={e => setOfferForm({ ...offerForm, position: e.target.value })} /></div>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Department</label><input className="glass-input" value={offerForm.department} onChange={e => setOfferForm({ ...offerForm, department: e.target.value })} /></div>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Salary</label><input className="glass-input" value={offerForm.salary} onChange={e => setOfferForm({ ...offerForm, salary: e.target.value })} /></div>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Start Date</label><input className="glass-input" type="date" value={offerForm.start_date} onChange={e => setOfferForm({ ...offerForm, start_date: e.target.value })} /></div>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Reports To</label><input className="glass-input" value={offerForm.reports_to} onChange={e => setOfferForm({ ...offerForm, reports_to: e.target.value })} /></div>
              <div className="glass-form-group" style={{ margin: 0 }}><label className="glass-label">Benefits</label><input className="glass-input" value={offerForm.benefits} onChange={e => setOfferForm({ ...offerForm, benefits: e.target.value })} /></div>
            </div>
            <button className="glass-btn glass-btn-primary" onClick={handleCreateOffer}>
              <Icon icon="lucide:send"></Icon> Send Offer
            </button>

            {candidate.offers && candidate.offers.length > 0 && (
              <>
                <hr style={{ borderColor: 'var(--border-glass)', margin: '20px 0' }} />
                <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon icon="lucide:history" style={{ color: 'var(--text-dim)' }}></Icon> Sent Offers
                </h4>
                <div className="glass-table-wrapper">
                  <table className="glass-table">
                    <thead><tr><th>Position</th><th>Salary</th><th>Start Date</th><th>Status</th></tr></thead>
                    <tbody>
                      {candidate.offers.map(o => (
                        <tr key={o.id}>
                          <td>{o.position}</td>
                          <td><span className="glass-badge glass-badge-success">{o.salary}</span></td>
                          <td>{formatDate(o.start_date)}</td>
                          <td><span className={`glass-badge glass-badge-${o.status === 'accepted' ? 'success' : o.status === 'declined' ? 'danger' : o.status === 'sent' ? 'warning' : 'neutral'}`}>{o.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showHire && !hireResult && (
        <div className="glass-modal-overlay" onClick={() => setShowHire(false)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="glass-modal-header">
              <h3 className="glass-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon="lucide:user-plus" style={{ color: 'var(--success)' }}></Icon> Hire: {candidate.name}
              </h3>
              <button className="glass-modal-close" onClick={() => setShowHire(false)}><Icon icon="lucide:x" /></button>
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
              <button className="glass-btn glass-btn-ghost" onClick={() => setShowHire(false)}>Cancel</button>
              <button className="glass-btn glass-btn-success" onClick={handleHire} disabled={hiring}>
                {hiring ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Hiring...</> : <><Icon icon="lucide:check"></Icon> Confirm Hire</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {hireResult && (
        <div className="glass-modal-overlay" onClick={() => { setHireResult(null); setShowHire(false); }}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="glass-modal-header">
              <h3 className="glass-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)' }}>
                <Icon icon="lucide:party-popper"></Icon> Hired Successfully
              </h3>
              <button className="glass-modal-close" onClick={() => { setHireResult(null); setShowHire(false); }}><Icon icon="lucide:x" /></button>
            </div>
            <div className="glass-card" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', padding: 16, margin: '12px 0' }}>
              <p style={{ marginBottom: 8 }}><strong>Employee #:</strong> {hireResult.employee_id}</p>
              <p><strong>Temporary Password:</strong> <code style={{ background: 'rgba(24,24,27,0.6)', padding: '2px 8px', borderRadius: 4, fontSize: '1rem', color: 'var(--success)' }}>{hireResult.temp_password}</code></p>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Share these credentials with the new employee. They can change their password after first login.</p>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-primary" onClick={() => { setHireResult(null); setShowHire(false); }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function stageBadge(stage) {
  const colors = { applied: 'neutral', phone: 'info', first: 'primary', second: 'warning', third: 'danger', offer: 'success', hired: 'success', rejected: 'danger' };
  return <span className={`glass-badge glass-badge-${colors[stage] || 'neutral'}`}>{stage}</span>;
}
