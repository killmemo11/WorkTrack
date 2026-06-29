// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ConfirmModal from '../../../shared/components/ConfirmModal';
import Pagination from '../../../shared/components/Pagination';

export default function AdminDocuments() {
  const [data, setData] = useState({ documents: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [confirm, setConfirm] = useState(null);

  const fetchDocs = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 50 });
      if (statusFilter) params.set('status', statusFilter);
      const res = await hrApi.get('/documents?' + params.toString());
      setData(res.data);
      setPage(p);
    } catch (err) {
      setMessage('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(1); }, [statusFilter]);

  const handleVerify = async (id) => {
    try {
      await hrApi.put(`/documents/${id}/verify`);
      setMessage('Document verified');
      fetchDocs(page);
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleReject = async (id) => {
    try {
      await hrApi.put(`/documents/${id}/reject`, { rejection_reason: prompt('Rejection reason:') || '' });
      setMessage('Document rejected');
      fetchDocs(page);
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const statusBadge = (s) => {
    const colors = { pending: 'tag-amber', verified: 'tag-green', rejected: 'tag-red' };
    return <span className={`tag ${colors[s] || 'tag-gray'}`}>{s}</span>;
  };

  if (loading && data.documents.length === 0) return <div className="loading">Loading...</div>;

  return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Document Management</h1>
            <p className="subtitle">Uploaded employee documents — verify or reject</p>
          </div>
        </div>

        {message && <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

        <div className="filters" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <select className="form-control" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="table-wrapper">
          {data.documents.length === 0 ? (
            <p className="empty-state">No documents found.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Uploaded By</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.documents.map(doc => (
                  <tr key={doc.id}>
                    <td><a href={`/hr/employees/${doc.employee_id}/profile`} className="link">{doc.employee_name}</a></td>
                    <td><strong>{doc.doc_name}</strong></td>
                    <td><span className="tag tag-blue">{doc.doc_type}</span></td>
                    <td>{doc.uploaded_by_name || '—'}</td>
                    <td>{statusBadge(doc.status)}</td>
                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {doc.status === 'pending' && <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleVerify(doc.id)}>Verify</button>
                          <button className="btn btn-sm btn-outline" onClick={() => handleReject(doc.id)}>Reject</button>
                        </>}
                        {doc.status === 'rejected' && doc.rejection_reason && (
                          <span style={{ fontSize: 12, color: '#991b1b' }} title={doc.rejection_reason}>Reason</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={fetchDocs} />
        </div>
      </div>
  );
}
