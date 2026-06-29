// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import hrApi from '../../../shared/api/hrApi';

const defaultForm = {
  candidate_id: '', interview_date: '', duration: 60, mode: 'video', interviewer: '', location_or_link: '', notes: '',
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
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...defaultForm });

  const fetchInterviews = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: 15 };
      if (statusFilter) params.status = statusFilter;
      const res = await hrApi.get('/recruitment/interviews', { params });
      setInterviews(res.data.data);
      setPage(res.data.pagination.page);
      setPages(res.data.pagination.pages);
      setTotal(res.data.pagination.total);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchCandidates = async () => {
    try {
      const res = await hrApi.get('/recruitment/candidates', { params: { per_page: 200 } });
      setCandidates(res.data.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchInterviews(1); }, [statusFilter]);
  useEffect(() => { fetchCandidates(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEdit = (iv) => {
    setEditingId(iv.id);
    setForm({
      candidate_id: iv.candidate_id,
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
      if (payload.type === 'online') {
        payload.location_name = '';
        payload.location_address = '';
        payload.dress_code = '';
        payload.what_to_bring = '';
        payload.map_link = '';
      } else {
        payload.meeting_platform = '';
        payload.meeting_link = '';
        payload.mode = 'in-person';
      }
      if (editingId) {
        await hrApi.put(`/recruitment/interviews/${editingId}`, payload);
      } else {
        await hrApi.post('/recruitment/interviews', payload);
      }
      setShowModal(false);
      fetchInterviews();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save interview');
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await hrApi.put(`/recruitment/interviews/${id}`, { status });
      fetchInterviews();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const typeLabels = { online: 'Online', offline: 'Offline' };
  const statusStyles = {
    scheduled: { background: '#dbeafe', color: '#1e40af' },
    completed: { background: '#d1fae5', color: '#065f46' },
    cancelled: { background: '#fee2e2', color: '#991b1b' },
  };
  const candidateStatusStyles = {
    pending: { background: '#fef3c7', color: '#92400e' },
    accepted: { background: '#d1fae5', color: '#065f46' },
    declined: { background: '#fee2e2', color: '#991b1b' },
  };

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff' };

  return (
    <div style={{ padding: 24 }}>
      <div className="admin-page-header">
        <h2 style={{ margin: 0 }}>Interview Scheduling</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}>
            <option value="">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn btn-primary" onClick={openCreate}>+ Schedule Interview</button>
        </div>
      </div>

      <p style={{ color: '#6b7280', marginTop: -8, marginBottom: 16, fontSize: '0.9rem' }}>
        {total} interview{total !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div>
      ) : interviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>No interviews scheduled</div>
      ) : (
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={thStyle}>Candidate</th>
                <th style={thStyle}>Date & Time</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Interviewer</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Candidate</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map(iv => (
                <tr key={iv.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>
                    <span style={{ cursor: 'pointer', color: '#4f46e5' }}
                      onClick={() => navigate(`/hr/recruitment/candidates/${iv.candidate_id}`)}>
                      {iv.candidate_name}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{iv.job_title}</div>
                  </td>
                  <td style={tdStyle}>
                    {new Date(iv.interview_date).toLocaleDateString()} {new Date(iv.interview_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <br /><span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{iv.duration} min</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      background: iv.type === 'online' ? '#eef2fd' : '#fef3c7',
                      color: iv.type === 'online' ? '#4f46e5' : '#92400e',
                      padding: '2px 10px', borderRadius: 12, fontSize: '0.8rem',
                    }}>{typeLabels[iv.type] || iv.type}</span>
                    {iv.type === 'online' && iv.meeting_link && (
                      <div style={{ marginTop: 4 }}>
                        <a href={iv.meeting_link} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#4f46e5' }}>
                          {iv.meeting_platform || 'Link'} ↗
                        </a>
                      </div>
                    )}
                    {iv.type === 'offline' && iv.location_name && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>{iv.location_name}</div>
                    )}
                  </td>
                  <td style={tdStyle}>{iv.interviewer || '—'}</td>
                  <td style={tdStyle}>
                    <span style={{ ...statusStyles[iv.status] || {}, padding: '2px 10px', borderRadius: 12, fontSize: '0.8rem' }}>
                      {iv.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ ...candidateStatusStyles[iv.candidate_status] || {}, padding: '2px 10px', borderRadius: 12, fontSize: '0.8rem' }}>
                      {iv.candidate_status || 'pending'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => openEdit(iv)}>Edit</button>
                      {iv.type === 'online' && iv.status === 'scheduled' && (
                        <button className="btn btn-sm btn-success"
                          onClick={() => window.open(iv.meeting_link || `https://meet.jit.si/wfh-interview-${iv.id}`, '_blank')}>
                          🔗 Join Meeting
                        </button>
                      )}
                      {iv.status === 'scheduled' && (
                        <>
                          <button className="btn btn-sm btn-success" onClick={() => handleStatus(iv.id, 'completed')}>Complete</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleStatus(iv.id, 'cancelled')}>Cancel</button>
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
          <button disabled={page <= 1} onClick={() => fetchInterviews(page - 1)} className="btn btn-outline btn-sm">Prev</button>
          <span style={{ padding: '6px 12px' }}>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => fetchInterviews(page + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}

      {/* Schedule / Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 999, overflow: 'auto', padding: '20px 0'
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: 28, width: 560, maxWidth: '95vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflow: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px' }}>{editingId ? 'Edit Interview' : 'Schedule Interview'}</h3>

            {/* Candidate */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Candidate *</label>
              <select value={form.candidate_id} onChange={e => setForm({ ...form, candidate_id: e.target.value })}
                style={inputStyle}>
                <option value="">Select candidate</option>
                {candidates.map(c => <option key={c.id} value={c.id}>{c.name} — {c.job_title}</option>)}
              </select>
            </div>

            {/* Date & Duration */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Date & Time *</label>
                <input type="datetime-local" value={form.interview_date} onChange={e => setForm({ ...form, interview_date: e.target.value })}
                  style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Duration (min)</label>
                <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 60 })}
                  style={inputStyle} />
              </div>
            </div>

            {/* Type: Online / Offline */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['online', 'offline'].map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: 6, border: `2px solid ${form.type === t ? '#4f46e5' : '#d1d5db'}`,
                      background: form.type === t ? '#eef2fd' : '#fff', fontWeight: 600,
                      cursor: 'pointer', color: form.type === t ? '#4f46e5' : '#6b7280',
                    }}>
                    {t === 'online' ? '🌐 Online' : '🏢 Offline'}
                  </button>
                ))}
              </div>
            </div>

            {/* Online Fields */}
            {form.type === 'online' && (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Platform</label>
                    <select value={form.meeting_platform} onChange={e => setForm({ ...form, meeting_platform: e.target.value })}
                      style={inputStyle}>
                      <option value="">Select platform</option>
                      <option value="Jitsi">Jitsi Meet</option>
                      <option value="Zoom">Zoom</option>
                      <option value="Google Meet">Google Meet</option>
                      <option value="Teams">Microsoft Teams</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Mode</label>
                    <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}
                      style={inputStyle}>
                      {modeOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Meeting Link <span style={{ color: '#9ca3af', fontWeight: 400 }}>(leave blank for Jitsi auto-generate)</span></label>
                  <input type="text" value={form.meeting_link} onChange={e => setForm({ ...form, meeting_link: e.target.value })}
                    style={inputStyle} placeholder="https://zoom.us/j/..." />
                </div>
              </>
            )}

            {/* Offline Fields */}
            {form.type === 'offline' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Location Name *</label>
                  <input type="text" value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })}
                    style={inputStyle} placeholder="e.g. Main HQ" />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Full Address</label>
                  <input type="text" value={form.location_address} onChange={e => setForm({ ...form, location_address: e.target.value })}
                    style={inputStyle} placeholder="Street, Building, Floor, City" />
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Dress Code</label>
                    <input type="text" value={form.dress_code} onChange={e => setForm({ ...form, dress_code: e.target.value })}
                      style={inputStyle} placeholder="Formal / Smart Casual" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>What to Bring</label>
                    <input type="text" value={form.what_to_bring} onChange={e => setForm({ ...form, what_to_bring: e.target.value })}
                      style={inputStyle} placeholder="ID, Certificates..." />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Google Maps Link</label>
                  <input type="text" value={form.map_link} onChange={e => setForm({ ...form, map_link: e.target.value })}
                    style={inputStyle} placeholder="https://maps.google.com/..." />
                </div>
              </>
            )}

            {/* Interviewer + Notes */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Interviewer</label>
              <input type="text" value={form.interviewer} onChange={e => setForm({ ...form, interviewer: e.target.value })}
                style={inputStyle} placeholder="Interviewer name" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: '#374151' }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                style={{ ...inputStyle, minHeight: 60 }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}
                disabled={!form.candidate_id || !form.interview_date || (form.type === 'offline' && !form.location_name)}>
                {editingId ? 'Update & Notify' : 'Schedule & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '10px 12px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' };
const tdStyle = { padding: '10px 12px', fontSize: '0.9rem', color: '#374151' };
