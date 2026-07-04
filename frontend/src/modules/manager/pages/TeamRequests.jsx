// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/api';
import hrApi from '../../../shared/api/hrApi';
import { useAuth } from '../../../shared/context/AuthContext';

const PRIORITY_BADGE = { normal: 'glass-badge-default', urgent: 'glass-badge-danger' };
const STATUS_BADGE_MAP = { pending: 'glass-badge-warning', approved: 'glass-badge-success', rejected: 'glass-badge-danger' };

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
      <div className="page">
        <div className="glass-page-header">
          <div>
            <h1><span className="iconify" data-icon="lucide:users-round" style={{ marginRight: 10, verticalAlign: 'middle' }} />Hiring Requests</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Submit and track headcount needs for your team</p>
          </div>
          <button className="glass-btn glass-btn-primary" onClick={openRequestModal}>
            <span className="iconify" data-icon="lucide:plus" style={{ marginRight: 6 }} />
            New Hiring Request
          </button>
        </div>

        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Requests', value: summary.total, badge: 'glass-badge-info', icon: 'lucide:file-text' },
              { label: 'Pending', value: summary.pending, badge: 'glass-badge-warning', icon: 'lucide:clock' },
              { label: 'Approved', value: summary.approved, badge: 'glass-badge-success', icon: 'lucide:check-circle' },
              { label: 'Rejected', value: summary.rejected, badge: 'glass-badge-danger', icon: 'lucide:x-circle' },
            ].map((s, i) => (
              <div key={s.label} className="glass-card card-hover fade-in-up" style={{ textAlign: 'center', animationDelay: `${i * 60}ms` }}>
                <div className="glass-card-body" style={{ padding: 16 }}>
                  <span className="iconify" data-icon={s.icon} style={{ fontSize: '1.5rem', color: 'var(--text-dim)', marginBottom: 8 }} />
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>
        ) : error ? (
          <div className="glass-card fade-in-up">
            <div className="glass-card-body" style={{ textAlign: 'center', padding: 40 }}>
              <span className="iconify" data-icon="lucide:alert-triangle" style={{ fontSize: '2.5rem', color: 'var(--color-danger)', marginBottom: 12 }} />
              <h3 style={{ color: 'var(--text-primary)' }}>Something went wrong</h3>
              <p style={{ color: 'var(--text-dim)', margin: '8px 0 16px' }}>{error}</p>
              <button className="glass-btn glass-btn-ghost" onClick={() => { setLoading(true); fetchRequests(); }}>
                <span className="iconify" data-icon="lucide:refresh-cw" style={{ marginRight: 6 }} />Try Again
              </button>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="glass-card fade-in-up">
            <div className="glass-card-body" style={{ textAlign: 'center', padding: 40 }}>
              <span className="iconify" data-icon="lucide:file-plus-2" style={{ fontSize: '2.5rem', color: 'var(--text-dim)', marginBottom: 12 }} />
              <h3 style={{ color: 'var(--text-primary)' }}>No hiring requests yet</h3>
              <p style={{ color: 'var(--text-dim)', margin: '8px 0 16px' }}>Start by submitting your first request to expand your team.</p>
              <button className="glass-btn glass-btn-primary" onClick={() => setShowModal(true)}>
                <span className="iconify" data-icon="lucide:plus" style={{ marginRight: 6 }} />Create Your First Request
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {['all', 'pending', 'approved', 'rejected'].map((s) => (
                <button key={s} className={`glass-btn glass-btn-sm ${filter === s ? 'glass-btn-primary' : 'glass-btn-ghost'}`} onClick={() => setFilter(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="glass-table-wrapper fade-in-up">
              <table className="glass-table">
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
                    <tr><td colSpan={showNote ? 8 : 7} className="glass-empty">No {filter} requests.</td></tr>
                  ) : filtered.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.department_name}</strong></td>
                      <td>{r.title_name}</td>
                      <td>{r.quantity}</td>
                      <td><span className="glass-badge glass-badge-info">{r.job_type}</span></td>
                      <td>
                        <span className={`glass-badge ${PRIORITY_BADGE[r.priority]}`}>
                          {r.priority === 'urgent' ? 'Urgent' : 'Normal'}
                        </span>
                      </td>
                      <td>
                        <span className={`glass-badge ${STATUS_BADGE_MAP[r.status] || 'glass-badge-default'}`}>
                          {r.status === 'approved' ? <span className="iconify" data-icon="lucide:check" style={{ marginRight: 4 }} /> : r.status === 'rejected' ? <span className="iconify" data-icon="lucide:x" style={{ marginRight: 4 }} /> : <span className="iconify" data-icon="lucide:clock" style={{ marginRight: 4 }} />}
                          {r.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      {showNote && (
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rejection_reason || '—'}</td>
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
        <div className="glass-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
            <div className="glass-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="glass-modal-title"><span className="iconify" data-icon="lucide:user-plus" style={{ marginRight: 8 }} />New Hiring Request</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Submit a request to hire new team members</p>
              </div>
              <button className="glass-modal-close" onClick={() => setShowModal(false)}><span className="iconify" data-icon="lucide:x" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="glass-card-body">
                {!headcountLoading && headcountMap[`dept:${departmentId}`] && (
                  <div className="glass-card" style={{ marginBottom: 12, background: 'var(--glass-bg-subtle)' }}>
                    <div className="glass-card-body" style={{ padding: 12 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>Department Headcount</div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--border-glass)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          borderRadius: 3,
                          width: `${headcountMap[`dept:${departmentId}`].max_headcount > 0
                            ? Math.min(100, Math.round((headcountMap[`dept:${departmentId}`].count / headcountMap[`dept:${departmentId}`].max_headcount) * 100))
                            : 0}%`,
                          background: (headcountMap[`dept:${departmentId}`].vacant != null && headcountMap[`dept:${departmentId}`].vacant <= 0) ? 'var(--color-danger)' : 'var(--color-success)',
                        }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        <span>{headcountMap[`dept:${departmentId}`].count} filled</span>
                        <span>/</span>
                        <span>{headcountMap[`dept:${departmentId}`].max_headcount > 0 ? headcountMap[`dept:${departmentId}`].max_headcount : '\u221E'} max</span>
                        {headcountMap[`dept:${departmentId}`].vacant != null && (
                          <span style={{ color: headcountMap[`dept:${departmentId}`].vacant <= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                            &middot; {headcountMap[`dept:${departmentId}`].vacant} vacant
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {form.title_id && headcountMap[`title:${form.title_id}`] && (
                  <div className="glass-card" style={{ marginBottom: 12, background: 'var(--glass-bg-subtle)' }}>
                    <div className="glass-card-body" style={{ padding: 12 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>Title Headcount</div>
                      <div style={{ height: 6, borderRadius: 3, background: 'var(--border-glass)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          borderRadius: 3,
                          width: `${headcountMap[`title:${form.title_id}`].max_headcount > 0
                            ? Math.min(100, Math.round((headcountMap[`title:${form.title_id}`].count / headcountMap[`title:${form.title_id}`].max_headcount) * 100))
                            : 0}%`,
                          background: (headcountMap[`title:${form.title_id}`].vacant != null && headcountMap[`title:${form.title_id}`].vacant <= 0) ? 'var(--color-danger)' : 'var(--color-success)',
                        }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        <span>{headcountMap[`title:${form.title_id}`].count} filled</span>
                        <span>/</span>
                        <span>{headcountMap[`title:${form.title_id}`].max_headcount > 0 ? headcountMap[`title:${form.title_id}`].max_headcount : '\u221E'} max</span>
                        {headcountMap[`title:${form.title_id}`].vacant != null && (
                          <span style={{ color: headcountMap[`title:${form.title_id}`].vacant <= 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                            &middot; {headcountMap[`title:${form.title_id}`].vacant} vacant
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="glass-form-group" style={{ marginTop: form.title_id ? 12 : 0 }}>
                  <label>Title *</label>
                  <select className="glass-select" value={form.title_id}
                    onChange={(e) => setForm({ ...form, title_id: e.target.value })} required disabled={!departmentId}>
                    <option value="">{titlesLoading ? 'Loading titles...' : (titles.length ? 'Select Title' : 'No titles available')}</option>
                    {titles.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="glass-form-group">
                    <label>Quantity</label>
                    <input type="number" className="glass-input" min={1} value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div className="glass-form-group">
                    <label>Job Type</label>
                    <select className="glass-select" value={form.job_type}
                      onChange={(e) => setForm({ ...form, job_type: e.target.value })}>
                      <option>Full-Time</option>
                      <option>Part-Time</option>
                      <option>Contract</option>
                      <option>Internship</option>
                    </select>
                  </div>
                </div>
                <div className="glass-form-group">
                  <label>Priority</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['normal', 'urgent'].map((p) => (
                      <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })}
                        className={`glass-btn glass-btn-sm ${form.priority === p ? 'glass-btn-primary' : 'glass-btn-ghost'}`}
                        style={{ flex: 1 }}>
                        <span className={`glass-badge ${PRIORITY_BADGE[p]}`} style={{ marginRight: 6 }}>
                          {p === 'urgent' ? 'Urgent' : 'Normal'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="glass-form-group">
                  <label>Reason</label>
                  <textarea className="glass-textarea" rows={3} value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Why is this position needed? What skills and experience are required?" />
                </div>
              </div>
              <div className="glass-modal-footer">
                <button type="button" className="glass-btn glass-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="glass-btn glass-btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : <><span className="iconify" data-icon="lucide:send" style={{ marginRight: 6 }} />Submit Request</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
