// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
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
    const colors = { draft: 'glass-badge-warning', signed: 'glass-badge-success', expired: 'glass-badge-default', renewed: 'glass-badge-info' };
    return <span className={`glass-badge ${colors[s] || 'glass-badge-default'}`}>{s}</span>;
  };

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1>My Contracts</h1>
          <p className="subtitle" style={{ color: 'var(--text-dim)' }}>Employment contracts history</p>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="glass-empty">
          <Icon icon="lucide:file-text" style={{ fontSize: 48, opacity: 0.4 }}></Icon>
          <h3>No contracts available</h3>
          <p>You have no contracts on record yet.</p>
        </div>
      ) : (
        <div className="glass-table-wrapper">
          <table className="glass-table">
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
                    {c.signed_by_employee ? <Icon icon="lucide:check-circle" style={{ color: 'var(--success)', marginRight: 4, verticalAlign: 'middle' }}></Icon> : ''}
                    {c.signed_by_employee ? 'Employee' : ''}
                    {c.signed_by_employee && c.signed_by_company ? ' & ' : ''}
                    {c.signed_by_company ? <Icon icon="lucide:check-circle" style={{ color: 'var(--success)', marginRight: 4, verticalAlign: 'middle' }}></Icon> : ''}
                    {c.signed_by_company ? 'Company' : ''}
                    {!c.signed_by_employee && !c.signed_by_company ? '—' : ''}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => openContent(c.id)}>
                        <Icon icon="lucide:eye" style={{ marginRight: 4, fontSize: 12 }}></Icon>
                        View
                      </button>
                      <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={async () => {
                        try {
                          const res = await api.get(`/personnel/my-contracts/${c.id}/pdf`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const a = document.createElement('a'); a.href = url; a.download = `contract-${c.id}.pdf`;
                          document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                        } catch (e) { console.error('Failed to download PDF:', e); }
                      }}>
                        <Icon icon="lucide:download" style={{ marginRight: 4, fontSize: 12 }}></Icon>
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewContent && (
        <div className="glass-modal-overlay" onClick={() => setViewContent(null)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: 16 }}>Contract</h3>
            <div className="glass-card" dangerouslySetInnerHTML={{ __html: viewContent }} />
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => { const w = window.open(''); w.document.write(viewContent); w.print(); }}>
                <Icon icon="lucide:printer" style={{ marginRight: 4, fontSize: 14 }}></Icon>
                Print
              </button>
              <button className="glass-btn glass-btn-ghost" onClick={() => setViewContent(null)}>
                <Icon icon="lucide:x" style={{ marginRight: 4, fontSize: 14 }}></Icon>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
