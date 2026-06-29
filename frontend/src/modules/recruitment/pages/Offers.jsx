// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
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

  const statusStyles = {
    sent: { background: '#fef3c7', color: '#92400e' },
    accepted: { background: '#d1fae5', color: '#065f46' },
    rejected: { background: '#fee2e2', color: '#991b1b' },
  };

  return (
    <div style={{ padding: 24 }}>
      <div className="admin-page-header">
        <h2 style={{ margin: 0 }}>Offer Management</h2>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db' }}>
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <p style={{ color: '#6b7280', marginTop: -8, marginBottom: 16, fontSize: '0.9rem' }}>
        {total} total offer{total !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div>
      ) : offers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          No offers found
        </div>
      ) : (
        <div className="table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                <th style={thStyle}>Candidate</th>
                <th style={thStyle}>Job Title</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>Salary</th>
                <th style={thStyle}>Start Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {offers.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={tdStyle}>
                    <span style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/hr/recruitment/candidates/${o.candidate_id}`)}>
                      {o.candidate_name}
                    </span>
                  </td>
                  <td style={tdStyle}>{o.job_title}</td>
                  <td style={tdStyle}>{o.department || '—'}</td>
                  <td style={tdStyle}>{o.salary ? `EGP ${Number(o.salary).toLocaleString()}` : '—'}</td>
                  <td style={tdStyle}>{o.start_date ? new Date(o.start_date).toLocaleDateString() : '—'}</td>
                  <td style={tdStyle}>
                    <span style={{ ...statusStyles[o.status] || {}, padding: '2px 10px', borderRadius: 12, fontSize: '0.8rem' }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={tdStyle}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {o.status === 'sent' && (
                        <>
                          <button className="btn btn-sm btn-success"
                            disabled={actioning === o.id}
                            onClick={() => handleStatusChange(o.id, 'accepted')}>
                            {actioning === o.id ? '...' : 'Accept'}
                          </button>
                          <button className="btn btn-sm btn-danger"
                            disabled={actioning === o.id}
                            onClick={() => handleStatusChange(o.id, 'rejected')}>
                            {actioning === o.id ? '...' : 'Reject'}
                          </button>
                        </>
                      )}
                      {o.status !== 'sent' && <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>—</span>}
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
          <button disabled={page <= 1} onClick={() => fetchOffers(page - 1)} className="btn btn-outline btn-sm">Prev</button>
          <span style={{ padding: '6px 12px' }}>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => fetchOffers(page + 1)} className="btn btn-outline btn-sm">Next</button>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '10px 12px', fontSize: '0.85rem', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e5e7eb' };
const tdStyle = { padding: '10px 12px', fontSize: '0.9rem', color: '#374151' };
