import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import hrApi from '../../../shared/api/hrApi';
import ConfirmModal from '../../../shared/components/ConfirmModal';

export default function MessageTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [previewContext, setPreviewContext] = useState('{}');
  const [form, setForm] = useState({
    template_key: '', name: '', channel: 'email', subject: '',
    body_template: '', placeholders: '',
  });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await hrApi.get('/recruitment/message-templates');
      setTemplates(res.data);
    } catch { setMsg('Failed to load templates'); }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openCreate = () => {
    setForm({ template_key: '', name: '', channel: 'email', subject: '', body_template: '', placeholders: '' });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (t) => {
    setForm({
      template_key: t.template_key,
      name: t.name,
      channel: t.channel || 'email',
      subject: t.subject || '',
      body_template: t.body_template || '',
      placeholders: t.placeholders ? JSON.stringify(t.placeholders, null, 2) : '',
    });
    setEditing(t);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.template_key || !form.name || !form.body_template) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        placeholders: form.placeholders ? (() => { try { return JSON.parse(form.placeholders); } catch { return form.placeholders; } })() : null,
      };
      if (editing) {
        await hrApi.put(`/recruitment/message-templates/${editing.id}`, payload);
        setMsg('Template updated');
      } else {
        await hrApi.post('/recruitment/message-templates', payload);
        setMsg('Template created');
      }
      setShowForm(false);
      fetchTemplates();
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to save'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await hrApi.delete(`/recruitment/message-templates/${id}`);
      setMsg('Template deleted');
      fetchTemplates();
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to delete'); }
    setConfirm(null);
  };

  const handlePreview = async (id) => {
    setPreviewId(id);
    setPreviewResult(null);
    try {
      const ctx = (() => { try { return JSON.parse(previewContext); } catch { return {}; } })();
      const res = await hrApi.post(`/recruitment/message-templates/${id}/preview`, { context: ctx });
      setPreviewResult(res.data);
    } catch (err) { setMsg(err.response?.data?.error || 'Preview failed'); }
  };

  const channelIcon = (ch) => {
    switch (ch) {
      case 'email': return 'lucide:mail';
      case 'sms': return 'lucide:message-square';
      case 'portal': return 'lucide:globe';
      default: return 'lucide:bell';
    }
  };

  return (
    <div className="page fade-in-up">
      <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-glass)', marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon icon="lucide:file-text" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }} />
          Message Templates
        </h1>
        <button className="glass-btn glass-btn-primary" onClick={openCreate}>
          <Icon icon="lucide:plus" /> New Template
        </button>
      </div>

      {msg && (
        <div className="glass-alert glass-alert-info" style={{ marginBottom: 16 }}>
          <Icon icon="lucide:info" /> {msg}
          <button onClick={() => setMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div className="glass-table-wrapper fade-in-up delay-1">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Name</th>
              <th>Channel</th>
              <th>Subject</th>
              <th>System</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="glass-loading" style={{ padding: 40 }}><div className="spinner" /></div></td></tr>
            ) : templates.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="glass-empty">
                  <Icon icon="lucide:file-text" />
                  <h3>No templates found</h3>
                </div>
              </td></tr>
            ) : templates.map(t => (
              <tr key={t.id}>
                <td><code style={{ fontSize: '0.8rem' }}>{t.template_key}</code></td>
                <td><strong>{t.name}</strong></td>
                <td><Icon icon={channelIcon(t.channel)} style={{ marginRight: 4 }} />{t.channel}</td>
                <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {t.subject || '—'}
                </td>
                <td>{t.is_system ? <span className="glass-badge glass-badge-info">System</span> : <span className="glass-badge glass-badge-neutral">Custom</span>}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => openEdit(t)}>
                      <Icon icon="lucide:pencil" /> Edit
                    </button>
                    <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => { setPreviewId(t.id); setPreviewResult(null); setPreviewContext('{}'); }}>
                      <Icon icon="lucide:eye" /> Preview
                    </button>
                    {!t.is_system && (
                      <button className="glass-btn glass-btn-xs glass-btn-danger" onClick={() => setConfirm(t)}>
                        <Icon icon="lucide:trash-2" /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      {previewId && (
        <div className="glass-modal-overlay" onClick={() => { setPreviewId(null); setPreviewResult(null); }}>
          <div className="glass-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                <Icon icon="lucide:eye" style={{ color: 'var(--brand-primary)', marginRight: 8 }} />
                Template Preview
              </h3>
              <button className="glass-modal-close" onClick={() => { setPreviewId(null); setPreviewResult(null); }}><Icon icon="lucide:x" /></button>
            </div>
            <div style={{ padding: '20px 28px' }}>
              <div className="glass-form-group">
                <label className="glass-label">Context (JSON)</label>
                <textarea className="glass-textarea" rows={3} value={previewContext}
                  onChange={e => setPreviewContext(e.target.value)}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                  placeholder='{"candidate_name": "John", "job_title": "Developer"}' />
              </div>
              <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => handlePreview(previewId)}
                style={{ marginBottom: 16 }}>
                <Icon icon="lucide:play" /> Render Preview
              </button>
              {previewResult && (
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 16 }}>
                  {previewResult.subject && (
                    <div className="glass-form-group" style={{ margin: 0, marginBottom: 12 }}>
                      <label className="glass-label">Subject</label>
                      <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: '0.9rem' }}>
                        {previewResult.subject}
                      </div>
                    </div>
                  )}
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Body</label>
                    <div style={{
                      padding: '12px 16px', background: '#fff', color: '#1a1a2e', borderRadius: 6,
                      fontSize: '0.9rem', lineHeight: 1.6, maxHeight: 400, overflowY: 'auto',
                    }} dangerouslySetInnerHTML={{ __html: previewResult.body }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="glass-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="glass-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                <Icon icon={editing ? 'lucide:pencil' : 'lucide:plus'} style={{ color: 'var(--brand-primary)', marginRight: 8 }} />
                {editing ? 'Edit Template' : 'New Message Template'}
              </h3>
              <button className="glass-modal-close" onClick={() => setShowForm(false)}><Icon icon="lucide:x" /></button>
            </div>
            <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Template Key *</label>
                  <input className="glass-input" value={form.template_key}
                    onChange={e => setForm(f => ({ ...f, template_key: e.target.value.replace(/\s+/g, '_').toLowerCase() }))}
                    style={{ width: '100%' }} placeholder="e.g. offer_letter" disabled={editing?.is_system} />
                </div>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Channel</label>
                  <select className="glass-select" value={form.channel}
                    onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} style={{ width: '100%' }} disabled={editing?.is_system}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="portal">Portal Notification</option>
                  </select>
                </div>
              </div>
              <div className="glass-form-group" style={{ margin: 0 }}>
                <label className="glass-label">Name *</label>
                <input className="glass-input" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} disabled={editing?.is_system} />
              </div>
              <div className="glass-form-group" style={{ margin: 0 }}>
                <label className="glass-label">Subject</label>
                <input className="glass-input" value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} style={{ width: '100%' }}
                  placeholder="Use {{placeholders}} for dynamic values" />
              </div>
              <div className="glass-form-group" style={{ margin: 0 }}>
                <label className="glass-label">Body Template *</label>
                <textarea className="glass-textarea" rows={8} value={form.body_template}
                  onChange={e => setForm(f => ({ ...f, body_template: e.target.value }))}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', resize: 'vertical' }}
                  placeholder={'<p>Dear {{candidate_name}},</p><p>Your application for {{job_title}}...</p>'} />
              </div>
              <div className="glass-form-group" style={{ margin: 0 }}>
                <label className="glass-label">Placeholders (JSON)</label>
                <textarea className="glass-textarea" rows={3} value={form.placeholders}
                  onChange={e => setForm(f => ({ ...f, placeholders: e.target.value }))}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                  placeholder='{"candidate_name": "", "job_title": ""}' />
              </div>
            </div>
            <div className="glass-modal-footer" style={{ padding: '16px 28px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="glass-btn glass-btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={handleSave}
                disabled={saving || !form.template_key || !form.name || !form.body_template}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message={`Delete template "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
