// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
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
    const map = { pending: 'warning', verified: 'success', rejected: 'danger' };
    return <span className={`glass-badge glass-badge-${map[s] || 'default'}`}>{s}</span>;
  };

  if (loading && data.documents.length === 0) return <div className="glass-loading"><div className="spinner"/><span>Loading...</span></div>;

  return (
      <div className="page">
        <div className="glass-page-header">
          <div>
            <h1>Document Management</h1>
            <p className="subtitle" style={{color:'var(--text-dim)'}}>Uploaded employee documents — verify or reject</p>
          </div>
        </div>

        {message && <div className={`glass-alert ${message.includes('Failed') ? 'glass-alert-danger' : 'glass-alert-success'}`}>{message}</div>}

        <div className="filter-bar">
          <div className="glass-form-group" style={{marginBottom:0}}>
            <select className="glass-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="glass-table-wrapper fade-in-up">
          {data.documents.length === 0 ? (
            <div className="glass-empty"><Icon icon="lucide:folder-open" /><p>No documents found.</p></div>
          ) : (
            <table className="glass-table">
              <thead>
                <tr>
                  <th><Icon icon="lucide:user" style={{verticalAlign:'middle', marginRight:4}} /> Employee</th>
                  <th><Icon icon="lucide:file-text" style={{verticalAlign:'middle', marginRight:4}} /> Document</th>
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
                    <td><strong><Icon icon="lucide:file-text" style={{verticalAlign:'middle', marginRight:4}} />{doc.doc_name}</strong></td>
                    <td><span className="glass-badge glass-badge-info">{doc.doc_type}</span></td>
                    <td>{doc.uploaded_by_name || '—'}</td>
                    <td>{statusBadge(doc.status)}</td>
                    <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {doc.status === 'pending' && <>
                          <button className="glass-btn glass-btn-primary glass-btn-sm" onClick={() => handleVerify(doc.id)}><Icon icon="lucide:check-circle" /> Verify</button>
                          <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => handleReject(doc.id)}><Icon icon="lucide:x-circle" /> Reject</button>
                        </>}
                        {doc.status === 'rejected' && doc.rejection_reason && (
                          <span className="glass-badge glass-badge-danger" title={doc.rejection_reason}><Icon icon="lucide:alert-circle" /> Reason</span>
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
