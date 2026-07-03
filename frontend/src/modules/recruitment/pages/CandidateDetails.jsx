// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useRef } from 'react';
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

  if (loading) return <div className="loading">Loading...</div>;
  if (!candidate) return <div className="admin-page"><p>Candidate not found</p></div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <button className="btn btn-outline" onClick={() => navigate('/hr/candidates')}>&larr; Back</button>
        <h2 style={{ margin: '8px 0' }}>{candidate.name}</h2>
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      <div className="tabs" style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {['info', 'screening', 'history', 'scorecards', 'offers'].map(tab => (
          <button key={tab} className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div><strong>Email:</strong> {candidate.email}</div>
              <div><strong>Phone:</strong> {candidate.phone || '—'}</div>
              <div><strong>Position:</strong> {candidate.job_title || '—'}</div>
              <div><strong>Stage:</strong> {candidate.stage}</div>
              <div><strong>Source:</strong> {candidate.source || '—'}</div>
              <div><strong>Scores:</strong> C:{candidate.score_comm || 0} T:{candidate.score_tech || 0} F:{candidate.score_fit || 0}</div>
              {candidate.education_level && <div><strong>Education:</strong> {EDU_LABEL[candidate.education_level] || candidate.education_level}</div>}
              {candidate.experience_years && <div><strong>Experience:</strong> {EXP_LABEL[candidate.experience_years] || candidate.experience_years}</div>}
              {candidate.skills_display?.length > 0 && <div><strong>Skills:</strong> {candidate.skills_display.join(', ')}</div>}
              {candidate.certs_display?.length > 0 && <div><strong>Certs:</strong> {candidate.certs_display.join(', ')}</div>}
              <div>
                <strong>CV:</strong>{' '}
                {candidate.cv_filename ? (
                  <span>
                    <a href={candidate.cv_path} target="_blank" rel="noreferrer">{candidate.cv_filename}</a>
                    {' | '}
                    <label style={{ color: '#4f46e5', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Replace
                      <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }}
                        onChange={e => { fileRef.current = e.target; handleUploadCv(); }} />
                    </label>
                  </span>
                ) : (
                  <span>
                    <label style={{ color: '#4f46e5', cursor: 'pointer', fontSize: '0.85rem' }}>
                      {cvUploading ? 'Uploading...' : '+ Upload CV'}
                      <input type="file" ref={fileRef} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style={{ display: 'none' }}
                        onChange={handleUploadCv} />
                    </label>
                  </span>
                )}
              </div>
            </div>

            {editing ? (
              <div style={{ marginTop: 16 }}>
                <div className="form-group"><label>Name</label><input className="form-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div className="form-group"><label>Email</label><input className="form-control" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                <div className="form-group"><label>Phone</label><input className="form-control" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                <div className="form-group"><label>Position</label><input className="form-control" value={editForm.job_title} onChange={e => setEditForm({ ...editForm, job_title: e.target.value })} /></div>
                <div className="form-group"><label>Notes</label><textarea className="form-control" rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
                <button className="btn btn-primary" onClick={handleUpdate}>Save</button>
                <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            ) : (
              <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => setEditing(true)}>Edit</button>
            )}

            <hr />
            <h4>Move Stage</h4>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select className="form-control" style={{ width: 150 }} value={moveStage} onChange={e => setMoveStage(e.target.value)}>
                <option value="">Select stage...</option>
                {STAGES.filter(s => s !== candidate.stage).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="form-control" style={{ width: 200 }} placeholder="Note (optional)" value={moveNote} onChange={e => setMoveNote(e.target.value)} />
              <button className="btn btn-primary" onClick={handleMove} disabled={!moveStage}>Move</button>
              <button className="btn btn-success" onClick={openHireModal} style={{ marginLeft: 8 }}>Hire</button>
            </div>
          </div>
        </div>
      )}

       {/* Screening Tab */}
       {activeTab === 'screening' && (
         <div className="card">
           <div className="card-body">
             {!candidate.screening ? (
               <p className="text-center" style={{ color: '#8892a8' }}>No auto-screening result available for this candidate.</p>
             ) : (
               <>
                 <div className="dashboard-header" style={{ marginBottom: '24px', padding: '24px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                     <span style={{ fontSize: '48px' }}>
                       {candidate.screening.overall_status === 'most_recommended' ? '🔵' : candidate.screening.overall_status === 'recommended' ? '✅' : '❌'}
                     </span>
                     <div>
                       <div style={{ fontSize: '24px', fontWeight: '700', textTransform: 'capitalize' }}>
                         {candidate.screening.overall_status === 'most_recommended' ? 'Most Recommended'
                           : candidate.screening.overall_status === 'recommended' ? 'Recommended'
                           : 'Rejected'}
                       </div>
                       <div style={{ fontSize: '14px', opacity: '0.8' }}>{formatDateTime(candidate.screening.created_at)}</div>
                     </div>
                   </div>
                 </div>
                 
                 <div style={{
                   background: candidate.screening.overall_status === 'most_recommended' ? 'rgba(34, 197, 94, 0.1)'
                     : candidate.screening.overall_status === 'recommended' ? 'rgba(59, 130, 246, 0.1)'
                     : 'rgba(239, 68, 68, 0.1)',
                   border: candidate.screening.overall_status === 'most_recommended' ? '1px solid rgba(34, 197, 94, 0.3)'
                     : candidate.screening.overall_status === 'recommended' ? '1px solid rgba(59, 130, 246, 0.3)'
                     : '1px solid rgba(239, 68, 68, 0.3)',
                   padding: '16px', borderRadius: '12px', marginBottom: '24px',
                   color: candidate.screening.overall_status === 'most_recommended' ? '#16a34a'
                     : candidate.screening.overall_status === 'recommended' ? '#2563eb'
                     : '#dc2626',
                 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                       <strong style={{ fontSize: '16px' }}>Screening Result</strong>
                       <div style={{ fontSize: '14px', opacity: '0.8', marginTop: '4px' }}>
                         Requirements met: {candidate.screening.requirements_met} / {candidate.screening.requirements_total}
                       </div>
                     </div>
                     <div style={{ fontSize: '14px', opacity: '0.8' }}>
                       Auto-screened on {formatDate(candidate.screening.created_at)}
                     </div>
                   </div>
                 </div>
                 
                 {candidate.screening.requirement_results && (
                   <div>
                     <h4 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#f4f4f5' }}>
                       Requirement Breakdown
                     </h4>
                     <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
                       <table className="table" style={{ margin: 0 }}>
                         <thead style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                           <tr>
                             <th style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Requirement</th>
                             <th style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Expected</th>
                             <th style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Provided</th>
                             <th style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#a1a1aa' }}>Status</th>
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
                               <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                 <td style={{ padding: '12px', fontSize: '14px', color: '#f4f4f5' }}>
                                   {labelMap[r.requirement] || r.requirement}
                                 </td>
                                 <td style={{ padding: '12px', fontSize: '14px', color: '#a1a1aa' }}>
                                   {expectedStr || '—'}
                                 </td>
                                 <td style={{ padding: '12px', fontSize: '14px', color: '#a1a1aa' }}>
                                   {providedStr || '—'}
                                 </td>
                                 <td style={{ padding: '12px', fontSize: '14px' }}>
                                   {r.status === 'most_recommended' ? 
                                     <span style={{ color: '#22c55e', fontWeight: '600' }}>🔵 Most Recommended</span>
                                     : r.status === 'recommended' ? 
                                     <span style={{ color: '#3b82f6', fontWeight: '600' }}>✅ Recommended</span>
                                     : <span style={{ color: '#ef4444', fontWeight: '600' }}>❌ Rejected</span>}
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
        <div className="card">
          <div className="card-body">
            {(!candidate.history || candidate.history.length === 0) ? (
              <p className="text-center">No history</p>
            ) : (
              <table className="table">
                <thead><tr><th>Date</th><th>Stage</th><th>Note</th><th>By</th></tr></thead>
                <tbody>
                  {candidate.history.map(h => (
                    <tr key={h.id}>
                      <td>{formatDateTime(h.created_at)}</td>
                      <td>{h.stage}</td>
                      <td>{h.note || '—'}</td>
                      <td>{h.created_by || 'system'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Scorecards Tab */}
      {activeTab === 'scorecards' && (
        <div className="card">
          <div className="card-body">
            <h4>Add Scorecard</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="form-group"><label>Interview</label><input className="form-control" value={scoreForm.interview} onChange={e => setScoreForm({ ...scoreForm, interview: e.target.value })} /></div>
              <div className="form-group"><label>Communication (0-10)</label><input className="form-control" type="number" min={0} max={10} value={scoreForm.comm} onChange={e => setScoreForm({ ...scoreForm, comm: +e.target.value })} /></div>
              <div className="form-group"><label>Technical (0-10)</label><input className="form-control" type="number" min={0} max={10} value={scoreForm.technical} onChange={e => setScoreForm({ ...scoreForm, technical: +e.target.value })} /></div>
              <div className="form-group"><label>Fit (0-10)</label><input className="form-control" type="number" min={0} max={10} value={scoreForm.fit} onChange={e => setScoreForm({ ...scoreForm, fit: +e.target.value })} /></div>
              <div className="form-group"><label>Overall (0-10)</label><input className="form-control" type="number" min={0} max={10} value={scoreForm.overall} onChange={e => setScoreForm({ ...scoreForm, overall: +e.target.value })} /></div>
              <div className="form-group"><label>Decision</label><select className="form-control" value={scoreForm.decision} onChange={e => setScoreForm({ ...scoreForm, decision: e.target.value })}><option>pending</option><option>pass</option><option>fail</option></select></div>
            </div>
            <div className="form-group"><label>Notes</label><textarea className="form-control" rows={2} value={scoreForm.notes} onChange={e => setScoreForm({ ...scoreForm, notes: e.target.value })} /></div>
            <button className="btn btn-primary" onClick={handleAddScorecard}>Add Scorecard</button>

            {candidate.scorecards && candidate.scorecards.length > 0 && (
              <>
                <hr />
                <h4>Previous Scorecards</h4>
                <table className="table">
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
                        <td>{sc.decision}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* Offers Tab */}
      {activeTab === 'offers' && (
        <div className="card">
          <div className="card-body">
            <h4>Create Offer</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="form-group"><label>Position</label><input className="form-control" value={offerForm.position} onChange={e => setOfferForm({ ...offerForm, position: e.target.value })} /></div>
              <div className="form-group"><label>Department</label><input className="form-control" value={offerForm.department} onChange={e => setOfferForm({ ...offerForm, department: e.target.value })} /></div>
              <div className="form-group"><label>Salary</label><input className="form-control" value={offerForm.salary} onChange={e => setOfferForm({ ...offerForm, salary: e.target.value })} /></div>
              <div className="form-group"><label>Start Date</label><input className="form-control" type="date" value={offerForm.start_date} onChange={e => setOfferForm({ ...offerForm, start_date: e.target.value })} /></div>
              <div className="form-group"><label>Reports To</label><input className="form-control" value={offerForm.reports_to} onChange={e => setOfferForm({ ...offerForm, reports_to: e.target.value })} /></div>
              <div className="form-group"><label>Benefits</label><input className="form-control" value={offerForm.benefits} onChange={e => setOfferForm({ ...offerForm, benefits: e.target.value })} /></div>
            </div>
            <button className="btn btn-primary" onClick={handleCreateOffer}>Send Offer</button>

            {candidate.offers && candidate.offers.length > 0 && (
              <>
                <hr />
                <h4>Sent Offers</h4>
                <table className="table">
                  <thead><tr><th>Position</th><th>Salary</th><th>Start Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {candidate.offers.map(o => (
                      <tr key={o.id}>
                        <td>{o.position}</td>
                        <td>{o.salary}</td>
                        <td>{formatDate(o.start_date)}</td>
                        <td>{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {showHire && !hireResult && (
        <div className="modal-overlay" onClick={() => setShowHire(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3>Hire: {candidate.name}</h3>
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
              <button className="btn btn-outline" onClick={() => setShowHire(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleHire} disabled={hiring}>
                {hiring ? 'Hiring...' : 'Confirm Hire'}
              </button>
            </div>
          </div>
        </div>
      )}

      {hireResult && (
        <div className="modal-overlay" onClick={() => { setHireResult(null); setShowHire(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3 style={{ color: '#2e7d32' }}>Hired Successfully</h3>
            <div style={{ background: '#e8f5e9', padding: 16, borderRadius: 8, margin: '12px 0' }}>
              <p><strong>Employee #:</strong> {hireResult.employee_id}</p>
              <p><strong>Temporary Password:</strong> <code style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '1rem' }}>{hireResult.temp_password}</code></p>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>Share these credentials with the new employee. They can change their password after first login.</p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => { setHireResult(null); setShowHire(false); }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
