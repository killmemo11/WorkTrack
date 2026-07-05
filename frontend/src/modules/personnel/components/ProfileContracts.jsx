// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';

export default function ProfileContracts({ employeeId, profile }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({ template_id: '', start_date: '', end_date: '' });
  const [generatedContent, setGeneratedContent] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    hrApi.get(`/employees/${employeeId}/contracts`)
      .then(r => setContracts(r.data)).catch(() => {}).finally(() => setLoading(false));
    hrApi.get('/contract-templates').then(r => setTemplates(r.data)).catch(() => {});
  }, [employeeId]);

  const generate = async () => {
    if (!genForm.template_id) { setMessage('Select a template'); setTimeout(() => setMessage(''), 3000); return; }
    try {
      const res = await hrApi.post(`/employees/${employeeId}/contracts/generate`, genForm);
      setGeneratedContent(res.data.content);
      setMessage('Contract generated');
      const updated = await hrApi.get(`/employees/${employeeId}/contracts`);
      setContracts(updated.data);
    } catch (err) { setMessage('Failed: ' + (err.response?.data?.error || err.message)); }
    setTimeout(() => setMessage(''), 3000);
  };

  const sign = async (cid, type) => {
    try {
      await hrApi.post(`/employees/${employeeId}/contracts/${cid}/sign`, { [type]: true });
      setMessage('Contract signed');
      const updated = await hrApi.get(`/employees/${employeeId}/contracts`);
      setContracts(updated.data);
    } catch (err) { setMessage('Failed'); }
    setTimeout(() => setMessage(''), 3000);
  };

  const statusBadge = (s) => {
    const colors = { draft: 'amber', signed: 'success', expired: 'neutral', renewed: 'info' };
    return <span className={`glass-badge glass-badge-${colors[s] || 'neutral'}`}>{s}</span>;
  };

  if (loading) return <p className="loading">Loading...</p>;

  return (
    <div>
      {message && <div className={`glass-alert ${message.includes('Failed') ? 'glass-alert-danger' : 'glass-alert-success'}`}>{message}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>Contracts</h3>
        <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => setShowGenerate(!showGenerate)}>+ Generate Contract</button>
      </div>

      {showGenerate && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group">
              <label>Template</label>
              <select className="glass-form-control" value={genForm.template_id} onChange={e => setGenForm({...genForm, template_id: e.target.value})}>
                <option value="">Select...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" className="glass-form-control" value={genForm.start_date} onChange={e => setGenForm({...genForm, start_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" className="glass-form-control" value={genForm.end_date} onChange={e => setGenForm({...genForm, end_date: e.target.value})} />
            </div>
          </div>
          <button className="glass-btn glass-btn-primary" style={{ marginTop: 8 }} onClick={generate}>Generate</button>
          <p style={{ fontSize: '0.8rem', color: '#666', marginTop: 8 }}>
            Company info, salary components, and employee data are auto-filled.
          </p>
        </div>
      )}

      {generatedContent && (
        <div className="glass-modal-overlay" onClick={() => setGeneratedContent(null)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Generated Contract Preview</h3>
            <div style={{ border: '1px solid #e2e8f0', padding: 24, borderRadius: 8, background: '#fff' }} dangerouslySetInnerHTML={{ __html: generatedContent }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="glass-btn glass-btn-ghost" onClick={() => { const w = window.open(''); w.document.write(generatedContent); w.print(); }}>Print</button>
              <button className="glass-btn glass-btn-ghost" onClick={() => setGeneratedContent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-table-wrapper">
        {contracts.length === 0 ? (
          <p className="glass-empty">No contracts yet.</p>
        ) : (
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
                    {c.signed_by_employee ? '✅ Employee ' : ''}
                    {c.signed_by_company ? '✅ Company' : ''}
                    {!c.signed_by_employee && !c.signed_by_company ? '—' : ''}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {c.status === 'draft' && <>
                        <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => sign(c.id, 'signed_by_company')}>Sign (Company)</button>
                      </>}
                      <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => {
                        hrApi.get(`/employees/${employeeId}/contracts`).then(r => {
                          const ctr = r.data.find(x => x.id === c.id);
                          if (ctr?.content_html) {
                            const w = window.open('');
                            w.document.write(ctr.content_html);
                            w.print();
                          }
                        });
                      }}>View / Print</button>
                      <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={async () => {
                        try {
                          const res = await hrApi.get(`/employees/${employeeId}/contracts/${c.id}/pdf`, { responseType: 'blob' });
                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          const a = document.createElement('a'); a.href = url; a.download = `contract-${c.id}.pdf`;
                          document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                        } catch (e) { setMessage('Failed to download PDF'); }
                      }}>PDF</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
