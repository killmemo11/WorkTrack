// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/api';
import hrApi from '../../../shared/api/hrApi';
import { useAuth } from '../../../shared/context/AuthContext';

function HiringIcon({ name, size = 18 }) {
  const commonProps = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

  switch (name) {
    case 'request':
      return <svg {...commonProps}><path d="M7 3h10" /><path d="M7 7h10" /><path d="M7 11h6" /><rect x="4" y="3" width="16" height="18" rx="2" /></svg>;
    case 'check':
      return <svg {...commonProps}><path d="m5 12 4 4 10-10" /></svg>;
    case 'pending':
      return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'alert':
      return <svg {...commonProps}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 9v5" /><path d="M12 16h.01" /></svg>;
    case 'plus':
      return <svg {...commonProps}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
    default:
      return <svg {...commonProps}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

const priorityColors = { normal: '#6b7280', urgent: '#ef4444' };
const statusColors = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };

export default function TeamRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { employee } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [titles, setTitles] = useState([]);
  const [titlesLoading, setTitlesLoading] = useState(false);
  const [headcountMap, setHeadcountMap] = useState({});
  const [headcountLoading, setHeadcountLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');

  const [form, setForm] = useState({
    department_id: '', title_id: '', quantity: 1, job_type: 'Full-Time', reason: '', priority: 'normal'
  });

  const fetchRequests = () => {
    setError('');
    api.get('/manager/headcount-requests')
      .then(({ data }) => setRequests(data))
      .catch((e) => { console.error(e); setError('Failed to load requests'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
    hrApi.get('/reports/headcount')
      .then(({ data }) => {
        const map = {};
        (data.byDepartment || []).forEach(d => { map[`dept:${d.id}`] = d; });
        (data.byTitle || []).forEach(t => { map[`title:${t.id}`] = t; });
        setHeadcountMap(map);
      })
      .catch(() => {})
      .finally(() => setHeadcountLoading(false));
  }, []);

  const departmentId = form.department_id || employee?.department_id || employee?.department?.id || '';

  useEffect(() => {
    if (!departmentId) {
      setTitles([]);
      return;
    }

    setTitlesLoading(true);
    api.get('/manager/department-titles', { params: { department_id: departmentId } })
      .then(({ data }) => setTitles(Array.isArray(data) ? data : []))
      .catch(() => setTitles([]))
      .finally(() => setTitlesLoading(false));
  }, [departmentId]);

  const openRequestModal = () => {
    const deptId = employee?.department_id || employee?.department?.id || '';
    setForm({ department_id: deptId, title_id: '', quantity: 1, job_type: 'Full-Time', reason: '', priority: 'normal' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, department_id: departmentId };
    if (!payload.department_id || !payload.title_id) return;
    setSubmitting(true);
    try {
      await api.post('/manager/headcount-requests', payload);
      setShowModal(false);
      setForm({ department_id: departmentId, title_id: '', quantity: 1, job_type: 'Full-Time', reason: '', priority: 'normal' });
      fetchRequests();
    } catch (err) { alert(err.response?.data?.error || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  const summary = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const showNote = requests.some((r) => r.rejection_reason);

  return (
    <>
      <div className="page hiring-request-page">
        <div className="hiring-hero-card">
          <div>
            <p className="manager-eyebrow">Team Planning</p>
            <h1>Hiring Request</h1>
            <p className="subtitle">Submit and track headcount needs for your team with a clean and professional workflow.</p>
          </div>
          <button className="btn btn-primary hiring-create-btn" onClick={openRequestModal}>
            <HiringIcon name="plus" size={16} />
            New Hiring Request
          </button>
        </div>

        {!loading && !error && (
          <div className="dashboard-stats-row hiring-stats-row">
            {[
              { label: 'Total Requests', value: summary.total, color: '#6366f1', icon: 'request' },
              { label: 'Pending', value: summary.pending, color: '#f59e0b', icon: 'pending' },
              { label: 'Approved', value: summary.approved, color: '#22c55e', icon: 'check' },
              { label: 'Rejected', value: summary.rejected, color: '#ef4444', icon: 'alert' },
            ].map((s) => (
              <div key={s.label} className="mini-stat-card hiring-stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
                <div className="mini-stat-icon" style={{ color: s.color, background: `${s.color}12` }}>
                  <HiringIcon name={s.icon} size={16} />
                </div>
                <div className="mini-stat-number" style={{ color: s.color }}>{s.value}</div>
                <div className="mini-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="loading" />
        ) : error ? (
          <div className="empty-state-card">
            <div className="empty-state-icon"><HiringIcon name="alert" size={34} /></div>
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button className="btn btn-outline" onClick={() => { setLoading(true); fetchRequests(); }}>Try Again</button>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon"><HiringIcon name="request" size={34} /></div>
            <h3>No hiring requests yet</h3>
            <p>Start by submitting your first request to expand your team.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Your First Request</button>
          </div>
        ) : (
          <>
            <div className="filter-row">
              {['all', 'pending', 'approved', 'rejected'].map((s) => (
                <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(s)}>
                  {s}
                </button>
              ))}
            </div>
            <div className="table-wrapper hiring-table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Title</th>
                    <th>Qty</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    {showNote && <th>Note</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={showNote ? 8 : 7} className="empty-state">No {filter} requests.</td></tr>
                  ) : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.department_name}</strong></td>
                      <td>{r.title_name}</td>
                      <td className="cell-mono">{r.quantity}</td>
                      <td><span className="badge badge-secondary">{r.job_type}</span></td>
                      <td>
                        <span className="priority-pill" style={{ color: priorityColors[r.priority] || '#6b7280' }}>
                          <span className="priority-dot" style={{ background: priorityColors[r.priority] || '#6b7280' }} />
                          {r.priority === 'urgent' ? 'Urgent' : 'Normal'}
                        </span>
                      </td>
                      <td>
                        <span className="status-pill" style={{ background: `${statusColors[r.status]}15`, color: statusColors[r.status], border: `1px solid ${statusColors[r.status]}30` }}>
                          {r.status === 'approved' ? '✓' : r.status === 'rejected' ? '✗' : '○'}
                          {r.status}
                        </span>
                      </td>
                      <td className="cell-mono">
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      {showNote && (
                        <td className="note-cell">{r.rejection_reason || '—'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal hiring-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>New Hiring Request</h2>
                <p>Submit a request to hire new team members</p>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Headcount Utilization */}
                {!headcountLoading && headcountMap[`dept:${departmentId}`] && (
                  <div className="hc-util-card">
                    <div className="hc-util-label">Department Headcount</div>
                    <div className="hc-util-bar">
                      <div className="hc-util-fill" style={{
                        width: `${headcountMap[`dept:${departmentId}`].max_headcount > 0
                          ? Math.min(100, Math.round((headcountMap[`dept:${departmentId}`].count / headcountMap[`dept:${departmentId}`].max_headcount) * 100))
                          : 0}%`,
                        background: (headcountMap[`dept:${departmentId}`].vacant != null && headcountMap[`dept:${departmentId}`].vacant <= 0) ? '#ef4444' : '#22c55e',
                      }} />
                    </div>
                    <div className="hc-util-text">
                      <span>{headcountMap[`dept:${departmentId}`].count} filled</span>
                      <span>/</span>
                      <span>{headcountMap[`dept:${departmentId}`].max_headcount > 0 ? headcountMap[`dept:${departmentId}`].max_headcount : '\u221E'} max</span>
                      {headcountMap[`dept:${departmentId}`].vacant != null && (
                        <span className={headcountMap[`dept:${departmentId}`].vacant <= 0 ? 'hc-util-warning' : 'hc-util-ok'}>
                          &middot; {headcountMap[`dept:${departmentId}`].vacant} vacant
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {form.title_id && headcountMap[`title:${form.title_id}`] && (
                  <div className="hc-util-card" style={{ marginTop: 8 }}>
                    <div className="hc-util-label">Title Headcount</div>
                    <div className="hc-util-bar">
                      <div className="hc-util-fill" style={{
                        width: `${headcountMap[`title:${form.title_id}`].max_headcount > 0
                          ? Math.min(100, Math.round((headcountMap[`title:${form.title_id}`].count / headcountMap[`title:${form.title_id}`].max_headcount) * 100))
                          : 0}%`,
                        background: (headcountMap[`title:${form.title_id}`].vacant != null && headcountMap[`title:${form.title_id}`].vacant <= 0) ? '#ef4444' : '#22c55e',
                      }} />
                    </div>
                    <div className="hc-util-text">
                      <span>{headcountMap[`title:${form.title_id}`].count} filled</span>
                      <span>/</span>
                      <span>{headcountMap[`title:${form.title_id}`].max_headcount > 0 ? headcountMap[`title:${form.title_id}`].max_headcount : '\u221E'} max</span>
                      {headcountMap[`title:${form.title_id}`].vacant != null && (
                        <span className={headcountMap[`title:${form.title_id}`].vacant <= 0 ? 'hc-util-warning' : 'hc-util-ok'}>
                          &middot; {headcountMap[`title:${form.title_id}`].vacant} vacant
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="form-group" style={{ marginTop: form.title_id ? 12 : 0 }}>
                  <label>Title *</label>
                  <select className="form-control" value={form.title_id}
                    onChange={(e) => setForm({ ...form, title_id: e.target.value })} required disabled={!departmentId}>
                    <option value="">{titlesLoading ? 'Loading titles...' : (titles.length ? 'Select Title' : 'No titles available')}</option>
                    {titles.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" className="form-control" min={1} value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div className="form-group">
                    <label>Job Type</label>
                    <select className="form-control" value={form.job_type}
                      onChange={(e) => setForm({ ...form, job_type: e.target.value })}>
                      <option>Full-Time</option>
                      <option>Part-Time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <div className="priority-selector">
                    {['normal', 'urgent'].map((p) => (
                      <label key={p} onClick={() => setForm({ ...form, priority: p })} className={`priority-option ${form.priority === p ? 'active' : ''}`}>
                        <span className="priority-dot" style={{ background: p === 'urgent' ? '#ef4444' : '#6b7280' }} />
                        {p === 'urgent' ? 'Urgent' : 'Normal'}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Reason</label>
                  <textarea className="form-control" rows={3} value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Why is this position needed? What skills and experience are required?" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner-sm" /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}