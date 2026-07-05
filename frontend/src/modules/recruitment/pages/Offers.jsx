// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import { useNavigate } from 'react-router-dom';
import hrApi from '../../../shared/api/hrApi';

export default function Offers() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(null);

  const fetchOffers = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, per_page: 15 };
      if (statusFilter) params.status = statusFilter;
      const res = await hrApi.get('/recruitment/offers', { params });
      setOffers(res.data.data);
      setPage(res.data.pagination.page);
      setPages(res.data.pagination.pages);
      setTotal(res.data.pagination.total);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchOffers(1); }, [statusFilter]);

  const handleStatusChange = async (id, status) => {
    setActioning(id);
    try {
      await hrApi.put(`/recruitment/offers/${id}`, { status });
      fetchOffers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
    setActioning(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent': return 'glass-badge glass-badge-warning';
      case 'accepted': return 'glass-badge glass-badge-success';
      case 'rejected': return 'glass-badge glass-badge-danger';
      default: return 'glass-badge glass-badge-neutral';
    }
  };

  return (
    <div className="page fade-in-up" style={{ padding: 24 }}>
      <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-glass)', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon icon="lucide:gift" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}></Icon>
          Offer Management
        </h1>
        <select className="glass-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <p style={{ color: 'var(--text-dim)', marginTop: -8, marginBottom: 16, fontSize: '0.9rem' }}>
        {total} total offer{total !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div className="glass-loading">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      ) : offers.length === 0 ? (
        <div className="glass-empty">
          <Icon icon="lucide:inbox"></Icon>
          <h3>No offers found</h3>
        </div>
      ) : (
        <div className="glass-table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Job Title</th>
                <th>Department</th>
                <th>Salary</th>
                <th>Start Date</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id}>
                  <td>
                    <span style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--brand-primary)' }}
                      onClick={() => navigate(`/hr/recruitment/candidates/${o.candidate_id}`)}>
                      {o.candidate_name}
                    </span>
                  </td>
                  <td>{o.job_title}</td>
                  <td>{o.department || '—'}</td>
                  <td>
                    {o.salary ? (
                      <span className="glass-badge glass-badge-success">EGP {Number(o.salary).toLocaleString()}</span>
                    ) : '—'}
                  </td>
                  <td>{o.start_date ? new Date(o.start_date).toLocaleDateString() : '—'}</td>
                  <td><span className={getStatusBadge(o.status)}>{o.status}</span></td>
                  <td style={{ color: 'var(--text-dim)' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {o.status === 'sent' && (
                        <>
                          <button className="glass-btn glass-btn-xs glass-btn-success"
                            disabled={actioning === o.id}
                            onClick={() => handleStatusChange(o.id, 'accepted')}>
                            {actioning === o.id ? '...' : <><Icon icon="lucide:check" style={{ marginRight: 2 }}></Icon> Accept</>}
                          </button>
                          <button className="glass-btn glass-btn-xs glass-btn-danger"
                            disabled={actioning === o.id}
                            onClick={() => handleStatusChange(o.id, 'rejected')}>
                            {actioning === o.id ? '...' : <><Icon icon="lucide:x" style={{ marginRight: 2 }}></Icon> Reject</>}
                          </button>
                        </>
                      )}
                      {o.status !== 'sent' && <span style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>—</span>}
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
          <button disabled={page <= 1} onClick={() => fetchOffers(page - 1)} className="glass-btn glass-btn-sm glass-btn-ghost">
            <Icon icon="lucide:chevron-left"></Icon> Prev
          </button>
          <span className="glass-badge glass-badge-neutral" style={{ padding: '6px 12px' }}>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => fetchOffers(page + 1)} className="glass-btn glass-btn-sm glass-btn-ghost">
            Next <Icon icon="lucide:chevron-right"></Icon>
          </button>
        </div>
      )}
    </div>
  );
}
