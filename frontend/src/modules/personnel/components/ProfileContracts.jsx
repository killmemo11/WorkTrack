import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ProfileSection from './ProfileSection';
import { sanitizeHTML } from '../../../shared/utils/sanitize';
import '../styles/profile.css';

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

  if (loading) return (
    <ProfileSection title="Contracts" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}>
      <div className="doc-skeleton"><div className="doc-skeleton-card" style={{ height: 80 }} /><div className="doc-skeleton-card" style={{ height: 80 }} /></div>
    </ProfileSection>
  );

  return (
    <ProfileSection
      title="Contracts"
      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
      actions={<button className="profile-btn profile-btn-primary profile-btn-sm" onClick={() => setShowGenerate(!showGenerate)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Generate
      </button>}
    >
      {message && <div className={`profile-message profile-message-${message.includes('Failed') ? 'error' : 'success'}`}>{message}</div>}

      {showGenerate && (
        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.04)', animation: 'slideDown 300ms ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Template</label>
              <select className="profile-field-input" value={genForm.template_id} onChange={e => setGenForm({...genForm, template_id: e.target.value})}>
                <option value="">Select...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Start Date</label>
              <input type="date" className="profile-field-input" value={genForm.start_date} onChange={e => setGenForm({...genForm, start_date: e.target.value})} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>End Date</label>
              <input type="date" className="profile-field-input" value={genForm.end_date} onChange={e => setGenForm({...genForm, end_date: e.target.value})} />
            </div>
          </div>
          <button className="profile-btn profile-btn-primary" style={{ marginTop: 12 }} onClick={generate}>Generate Contract</button>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-faint)', marginTop: 8 }}>Company info, salary components, and employee data are auto-filled.</p>
        </div>
      )}

      {generatedContent && (
        <div className="doc-preview-overlay" onClick={() => setGeneratedContent(null)}>
          <div className="doc-preview-modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
            <div className="doc-preview-header">
              <h3 style={{ margin: 0 }}>Contract Preview</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="profile-btn profile-btn-primary profile-btn-sm" onClick={() => { const w = window.open(''); w.document.write(sanitizeHTML(generatedContent)); w.print(); }}>Print</button>
                <button className="profile-btn profile-btn-ghost profile-btn-sm" onClick={() => setGeneratedContent(null)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Close
                </button>
              </div>
            </div>
            <div className="doc-preview-body" style={{ display: 'block', background: 'white', color: '#333' }}>
              <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(generatedContent) }} />
            </div>
          </div>
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="doc-empty" style={{ padding: '20px' }}>
          <span className="doc-empty-icon" style={{ fontSize: 36 }}>📋</span>
          <h4>No contracts yet</h4>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Template', 'Start', 'End', 'Status', 'Signed', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-dim)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {contracts.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 200ms ease' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 12px' }}><strong>{c.template_name || '—'}</strong></td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{c.end_date ? new Date(c.end_date).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{statusBadge(c.status)}</td>
                  <td style={{ padding: '10px 12px', fontSize: '0.8rem' }}>
                    {c.signed_by_employee ? '✅ Employee ' : ''}{c.signed_by_company ? '✅ Company' : ''}
                    {!c.signed_by_employee && !c.signed_by_company ? '—' : ''}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {c.status === 'draft' && <button className="profile-btn profile-btn-xs profile-btn-primary" onClick={() => sign(c.id, 'signed_by_company')}>Sign</button>}
                      <button className="profile-btn profile-btn-xs profile-btn-ghost" onClick={() => { hrApi.get(`/employees/${employeeId}/contracts`).then(r => { const ctr = r.data.find(x => x.id === c.id); if (ctr?.content_html) { const w = window.open(''); w.document.write(sanitizeHTML(ctr.content_html)); } }); }}>View</button>
                      <button className="profile-btn profile-btn-xs profile-btn-ghost" onClick={async () => { try { const res = await hrApi.get(`/employees/${employeeId}/contracts/${c.id}/pdf`, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([res.data])); const a = document.createElement('a'); a.href = url; a.download = `contract-${c.id}.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch {} }}>PDF</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ProfileSection>
  );
}
