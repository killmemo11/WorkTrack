// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import api from '../../../shared/api';

export default function MyContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewContent, setViewContent] = useState(null);

  const fetchContracts = async () => {
    try {
      const res = await api.get('/personnel/my-contracts');
      setContracts(res.data);
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContracts(); }, []);

  const openContent = async (id) => {
    try {
      const res = await api.get(`/personnel/my-contracts/${id}/content`);
      setViewContent(res.data.content);
    } catch (err) {
      console.error('Failed to load contract content:', err);
    }
  };

  const statusBadge = (s) => {
    const colors = { draft: 'tag-amber', signed: 'tag-green', expired: 'tag-gray', renewed: 'tag-blue' };
    return <span className={`tag ${colors[s] || 'tag-gray'}`}>{s}</span>;
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Contracts</h1>
          <p className="subtitle">Employment contracts history</p>
        </div>
      </div>

      {contracts.length === 0 ? (
        <p className="empty-state">No contracts available.</p>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Template</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Signed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.template_name || '—'}</strong></td>
                  <td>{c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'}</td>
                  <td>{c.end_date ? new Date(c.end_date).toLocaleDateString() : '—'}</td>
                  <td>{statusBadge(c.status)}</td>
                  <td>
                    {c.signed_by_employee ? '✅ Employee' : ''}
                    {c.signed_by_employee && c.signed_by_company ? ' & ' : ''}
                    {c.signed_by_company ? '✅ Company' : ''}
                    {!c.signed_by_employee && !c.signed_by_company ? '—' : ''}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => openContent(c.id)}>View</button>
                      <button className="btn btn-sm btn-primary" onClick={async () => {
                        try {
                          const res = await api.get(`/personnel/my-contracts/${c.id}/pdf`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const a = document.createElement('a'); a.href = url; a.download = `contract-${c.id}.pdf`;
                          document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                        } catch (e) { console.error('Failed to download PDF:', e); }
                      }}>PDF</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewContent && (
        <div className="modal-overlay" onClick={() => setViewContent(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Contract</h3>
            <div style={{ border: '1px solid #e2e8f0', padding: 24, borderRadius: 8, background: '#fff' }} dangerouslySetInnerHTML={{ __html: viewContent }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => { const w = window.open(''); w.document.write(viewContent); w.print(); }}>Print</button>
              <button className="btn btn-outline" onClick={() => setViewContent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
