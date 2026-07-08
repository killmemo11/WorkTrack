import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../../shared/components/Icon';
import { useNavigate } from 'react-router-dom';
import hrApi from '../../../shared/api/hrApi';

const defaultForm = {
  candidate_id: '', workflow_stage_id: '', interview_date: '', duration: 60, mode: 'video',
  interviewer: '', location_or_link: '', notes: '',
  type: 'online', location_name: '', location_address: '', dress_code: '', what_to_bring: '', map_link: '',
  meeting_platform: '', meeting_link: '',
};

const modeOptions = [
  { value: 'video', label: 'Video Call' },
  { value: 'in-person', label: 'In Person' },
  { value: 'phone', label: 'Phone Call' },
];

export default function Interviews() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [workflowStages, setWorkflowStages] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [msg, setMsg] = useState('');

  const fetchInterviews = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: 15 };
      if (statusFilter) params.status = statusFilter;
      const res = await hrApi.get('/recruitment/interview-stages', { params });
      setInterviews(res.data.data);
      setPage(res.data.pagination.page);
      setPages(res.data.pagination.pages);
      setTotal(res.data.pagination.total);
    } catch { setMsg('Failed to load interviews'); }
    setLoading(false);
  };

  const fetchCandidates = async () => {
    try {
      const res = await hrApi.get('/recruitment/candidates', { params: { per_page: 200 } });
      setCandidates(res.data.data);
    } catch {}
  };

  const fetchWorkflowStages = async () => {
    try {
      const res = await hrApi.get('/recruitment/workflow-stages');
      setWorkflowStages(res.data);
    } catch {}
  };

  useEffect(() => { fetchInterviews(1); }, [statusFilter]);
  useEffect(() => { fetchCandidates(); fetchWorkflowStages(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEdit = (iv) => {
    setEditingId(iv.id);
    setForm({
      candidate_id: iv.candidate_id,
      workflow_stage_id: iv.workflow_stage_id || '',
      interview_date: iv.interview_date?.slice(0, 16) || '',
      duration: iv.duration || 60,
      mode: iv.mode || 'video',
      interviewer: iv.interviewer || '',
      location_or_link: iv.location_or_link || '',
      notes: iv.notes || '',
      type: iv.type || 'online',
      location_name: iv.location_name || '',
      location_address: iv.location_address || '',
      dress_code: iv.dress_code || '',
      what_to_bring: iv.what_to_bring || '',
      map_link: iv.map_link || '',
      meeting_platform: iv.meeting_platform || '',
      meeting_link: iv.meeting_link || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form };
      if (payload.workflow_stage_id === '') payload.workflow_stage_id = null;
      if (payload.type === 'online') {
        payload.location_name = ''; payload.location_address = ''; payload.dress_code = '';
        payload.what_to_bring = ''; payload.map_link = '';
      } else {
        payload.meeting_platform = ''; payload.meeting_link = ''; payload.mode = 'in-person';
      }
      if (editingId) {
        await hrApi.put(`/recruitment/interview-stages/${editingId}`, payload);
      } else {
        await hrApi.post('/recruitment/interview-stages', payload);
      }
      setShowModal(false);
      fetchInterviews();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to save interview');
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await hrApi.put(`/recruitment/interview-stages/${id}`, { status });
      fetchInterviews();
    } catch { setMsg('Failed to update status'); }
  };

  const handleAttendance = async (id, attendance) => {
    try {
      await hrApi.put(`/recruitment/interview-stages/${id}`, { attendance });
      if (attendance === 'attended') handleStatus(id, 'completed');
      fetchInterviews();
    } catch { setMsg('Failed to update attendance'); }
  };

  return (
    <div className="page fade-in-up" style={{ padding: 24 }}>
      <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-glass)', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon icon="lucide:video" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }} />
          Interview Scheduling
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="glass-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="glass-btn glass-btn-primary" onClick={openCreate}>
            <Icon icon="lucide:calendar-plus" /> Schedule Interview
          </button>
        </div>
      </div>

      {msg && (
        <div className="glass-alert glass-alert-info" style={{ marginBottom: 16 }}>
          <Icon icon="lucide:info" /> {msg}
          <button onClick={() => setMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <p style={{ color: 'var(--text-dim)', marginTop: -8, marginBottom: 16, fontSize: '0.9rem' }}>
        {total} interview{total !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div className="glass-loading">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      ) : interviews.length === 0 ? (
        <div className="glass-empty">
          <Icon icon="lucide:video-off"></Icon>
          <h3>No interviews scheduled</h3>
        </div>
      ) : (
        <div className="glass-table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Stage</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Interviewer</th>
                <th>Status</th>
                <th>Attendance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map(iv => (
                <tr key={iv.id}>
                  <td>
                    <span style={{ cursor: 'pointer', color: 'var(--brand-primary)', fontWeight: 600 }}
                      onClick={() => navigate(`/hr/recruitment/candidates/${iv.candidate_id}`)}>
                      {iv.candidate_name}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 2 }}>{iv.job_title}</div>
                  </td>
                  <td>
                    {iv.stage_name ? (
                      <span className="glass-badge glass-badge-primary">{iv.stage_name}</span>
                    ) : (
                      <span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    {new Date(iv.interview_date).toLocaleDateString()} {new Date(iv.interview_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <br /><span style={{ color: 'var(--text-faint)', fontSize: '0.8rem' }}>{iv.duration} min</span>
                  </td>
                  <td>
                    <span className={`glass-badge ${iv.type === 'online' ? 'glass-badge-info' : 'glass-badge-warning'}`}>
                      <Icon icon={iv.type === 'online' ? 'lucide:globe' : 'lucide:building'} style={{ marginRight: 2, fontSize: '0.65rem' }} />
                      {iv.type === 'online' ? 'Online' : 'Offline'}
                    </span>
                    {iv.type === 'online' && iv.meeting_link && (
                      <div style={{ marginTop: 4 }}>
                        <a href={iv.meeting_link} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--brand-primary)' }}>
                          {iv.meeting_platform || 'Link'} <Icon icon="lucide:external-link" style={{ fontSize: '0.6rem' }} />
                        </a>
                      </div>
                    )}
                    {iv.type === 'offline' && iv.location_name && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>{iv.location_name}</div>
                    )}
                  </td>
                  <td>{iv.interviewer || '—'}</td>
                  <td>
                    <span className={`glass-badge ${iv.status === 'scheduled' ? 'glass-badge-info' : iv.status === 'completed' ? 'glass-badge-success' : 'glass-badge-danger'}`}>
                      {iv.status}
                    </span>
                  </td>
                  <td>
                    <select className="glass-select" style={{ width: 110, padding: '4px 8px', fontSize: '0.75rem' }}
                      value={iv.attendance || 'pending'}
                      onChange={e => handleAttendance(iv.id, e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="attended">Attended</option>
                      <option value="absent">Absent</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => openEdit(iv)}>
                        <Icon icon="lucide:pencil" /> Edit
                      </button>
                      {iv.type === 'online' && iv.status === 'scheduled' && (
                        <button className="glass-btn glass-btn-xs glass-btn-success"
                          onClick={() => window.open(iv.meeting_link || `https://meet.jit.si/wfh-interview-${iv.id}`, '_blank')}>
                          <Icon icon="lucide:link" /> Join
                        </button>
                      )}
                      {iv.status === 'scheduled' && (
                        <>
                          <button className="glass-btn glass-btn-xs glass-btn-success" onClick={() => handleStatus(iv.id, 'completed')}>
                            <Icon icon="lucide:check" /> Complete
                          </button>
                          <button className="glass-btn glass-btn-xs glass-btn-danger" onClick={() => handleStatus(iv.id, 'cancelled')}>
                            <Icon icon="lucide:x" /> Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button disabled={page <= 1} onClick={() => fetchInterviews(page - 1)} className="glass-btn glass-btn-sm glass-btn-ghost">
            <Icon icon="lucide:chevron-left" /> Prev
          </button>
          <span className="glass-badge glass-badge-neutral" style={{ padding: '6px 12px' }}>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => fetchInterviews(page + 1)} className="glass-btn glass-btn-sm glass-btn-ghost">
            Next <Icon icon="lucide:chevron-right" />
          </button>
        </div>
      )}

      {showModal && (
        <motion.div className="glass-modal-overlay" onClick={() => setShowModal(false)}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <motion.div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}
            initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
            <div className="glass-modal-header">
              <h3 className="glass-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon={editingId ? 'lucide:pencil' : 'lucide:calendar-plus'} style={{ color: 'var(--brand-primary)' }} />
                {editingId ? 'Edit Interview' : 'Schedule Interview'}
              </h3>
              <button className="glass-modal-close" onClick={() => setShowModal(false)}><Icon icon="lucide:x" /></button>
            </div>

            <div className="glass-form-group">
              <label className="glass-label">Candidate *</label>
              <select value={form.candidate_id} onChange={e => setForm({ ...form, candidate_id: e.target.value })} className="glass-select">
                <option value="">Select candidate</option>
                {candidates.map(c => <option key={c.id} value={c.id}>{c.name} — {c.job_title}</option>)}
              </select>
            </div>

            <div className="glass-form-group">
              <label className="glass-label">Workflow Stage</label>
              <select value={form.workflow_stage_id} onChange={e => setForm({ ...form, workflow_stage_id: e.target.value })} className="glass-select">
                <option value="">— No stage —</option>
                {workflowStages.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.display_name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="glass-form-group" style={{ flex: 2, margin: 0 }}>
                <label className="glass-label">Date & Time *</label>
                <input type="datetime-local" value={form.interview_date} onChange={e => setForm({ ...form, interview_date: e.target.value })} className="glass-input" />
              </div>
              <div className="glass-form-group" style={{ flex: 1, margin: 0 }}>
                <label className="glass-label">Duration (min)</label>
                <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 60 })} className="glass-input" />
              </div>
            </div>

            <div className="glass-form-group">
              <label className="glass-label">Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['online', 'offline'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={`glass-btn glass-btn-sm ${form.type === t ? 'glass-btn-primary' : 'glass-btn-ghost'}`}
                    style={{ flex: 1, justifyContent: 'center' }}>
                    <Icon icon={t === 'online' ? 'lucide:globe' : 'lucide:building'} style={{ marginRight: 4 }} />
                    {t === 'online' ? 'Online' : 'Offline'}
                  </button>
                ))}
              </div>
            </div>

            {form.type === 'online' && (
              <>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="glass-form-group" style={{ flex: 1, margin: 0 }}>
                    <label className="glass-label">Platform</label>
                    <select value={form.meeting_platform} onChange={e => setForm({ ...form, meeting_platform: e.target.value })} className="glass-select">
                      <option value="">Select platform</option>
                      <option value="Jitsi">Jitsi Meet</option>
                      <option value="Zoom">Zoom</option>
                      <option value="Google Meet">Google Meet</option>
                      <option value="Teams">Microsoft Teams</option>
                    </select>
                  </div>
                  <div className="glass-form-group" style={{ flex: 1, margin: 0 }}>
                    <label className="glass-label">Mode</label>
                    <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })} className="glass-select">
                      {modeOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="glass-form-group">
                  <label className="glass-label">Meeting Link <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(leave blank for auto-generate)</span></label>
                  <input type="text" value={form.meeting_link} onChange={e => setForm({ ...form, meeting_link: e.target.value })} className="glass-input" placeholder="https://zoom.us/j/..." />
                </div>
              </>
            )}

            {form.type === 'offline' && (
              <>
                <div className="glass-form-group">
                  <label className="glass-label">Location Name *</label>
                  <input type="text" value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} className="glass-input" placeholder="e.g. Main HQ" />
                </div>
                <div className="glass-form-group">
                  <label className="glass-label">Full Address</label>
                  <input type="text" value={form.location_address} onChange={e => setForm({ ...form, location_address: e.target.value })} className="glass-input" placeholder="Street, Building, Floor, City" />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="glass-form-group" style={{ flex: 1, margin: 0 }}>
                    <label className="glass-label">Dress Code</label>
                    <input type="text" value={form.dress_code} onChange={e => setForm({ ...form, dress_code: e.target.value })} className="glass-input" placeholder="Formal / Smart Casual" />
                  </div>
                  <div className="glass-form-group" style={{ flex: 1, margin: 0 }}>
                    <label className="glass-label">What to Bring</label>
                    <input type="text" value={form.what_to_bring} onChange={e => setForm({ ...form, what_to_bring: e.target.value })} className="glass-input" placeholder="ID, Certificates..." />
                  </div>
                </div>
                <div className="glass-form-group">
                  <label className="glass-label">Google Maps Link</label>
                  <input type="text" value={form.map_link} onChange={e => setForm({ ...form, map_link: e.target.value })} className="glass-input" placeholder="https://maps.google.com/..." />
                </div>
              </>
            )}

            <div className="glass-form-group">
              <label className="glass-label">Interviewer</label>
              <input type="text" value={form.interviewer} onChange={e => setForm({ ...form, interviewer: e.target.value })} className="glass-input" placeholder="Interviewer name" />
            </div>
            <div className="glass-form-group">
              <label className="glass-label">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="glass-textarea" />
            </div>

            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="glass-btn glass-btn-primary" onClick={handleSave}
                disabled={!form.candidate_id || !form.interview_date || (form.type === 'offline' && !form.location_name)}>
                {editingId ? <><Icon icon="lucide:check" /> Update</> : <><Icon icon="lucide:send" /> Schedule</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
