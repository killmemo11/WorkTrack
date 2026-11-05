// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../../../shared/components/Icon';
import adminApi from '../../../shared/api/adminApi';

const POLICY_TYPES = [
  { value: 'leave', label: 'Leave Policy' },
  { value: 'penalties', label: 'Penalties & Discipline' },
  { value: 'privacy', label: 'Privacy Policy' },
  { value: 'other', label: 'General Policy' },
];

const TYPE_LABEL = Object.fromEntries(POLICY_TYPES.map((t) => [t.value, t.label]));

const EMPTY_FORM = { policy_type: 'leave', title: '', content: '', requires_ack: true };

export default function AdminPolicies() {
  const [policies, setPolicies] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null); // null + creating=true means new
  const [creating, setCreating] = useState(false);
  const [ackRows, setAckRows] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const selected = useMemo(
    () => policies.find((p) => p.id === selectedId) || null,
    [policies, selectedId]
  );

  const load = useCallback(async (selectId) => {
    try {
      const res = await adminApi.get('/policies');
      const rows = res.data.policies || [];
      setPolicies(rows);
      const next = selectId !== undefined ? selectId : (rows.find((p) => p.is_published === 1) || rows[0])?.id || null;
      setSelectedId(next);
    } catch (err) {
      setMessage('Failed to load policies: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setAckRows(null);
    if (!selected || selected.is_published !== 1) return;
    let cancelled = false;
    adminApi.get(`/policies/${selected.id}/acknowledgements`)
      .then((res) => { if (!cancelled) setAckRows(res.data.employees || []); })
      .catch(() => { if (!cancelled) setAckRows([]); });
    return () => { cancelled = true; };
  }, [selected]);

  const startNew = () => {
    const used = new Set(policies.map((p) => p.policy_type));
    const nextType = POLICY_TYPES.find((t) => !used.has(t.value))?.value;
    if (!nextType) {
      setMessage('All policy types already exist. Create a new version of an existing policy instead.');
      return;
    }
    setCreating(true);
    setEditingId(null);
    setSelectedId(null);
    setForm({ ...EMPTY_FORM, policy_type: nextType });
    setMessage('');
  };

  const startEdit = () => {
    if (!selected || selected.is_published === 1) return;
    setCreating(false);
    setEditingId(selected.id);
    setForm({
      policy_type: selected.policy_type,
      title: selected.title,
      content: selected.content,
      requires_ack: selected.requires_ack === 1,
    });
    setMessage('');
  };

  const cancelEdit = () => {
    setCreating(false);
    setEditingId(null);
    setMessage('');
  };

  const save = async () => {
    setBusy(true);
    setMessage('');
    try {
      if (creating) {
        const res = await adminApi.post('/policies', form);
        await load(res.data.policy.id);
        setMessage('Draft saved. Review it and publish when ready.');
      } else if (editingId) {
        await adminApi.put(`/policies/${editingId}`, {
          title: form.title,
          content: form.content,
          requires_ack: form.requires_ack,
        });
        await load(editingId);
        setMessage('Draft updated.');
      }
      setCreating(false);
      setEditingId(null);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to save policy');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!selected) return;
    if (!window.confirm(`Publish "${selected.title}" v${selected.version}? Employees will see it immediately.`)) return;
    setBusy(true);
    setMessage('');
    try {
      await adminApi.post(`/policies/${selected.id}/publish`, {});
      await load(selected.id);
      setMessage('Policy published.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to publish policy');
    } finally {
      setBusy(false);
    }
  };

  const newVersion = async () => {
    if (!selected) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await adminApi.post(`/policies/${selected.id}/new-version`, {});
      await load(res.data.policy.id);
      setMessage(`Draft v${res.data.policy.version} created. Edit it, then publish.`);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to create a new version');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selected || selected.is_published === 1) return;
    if (!window.confirm(`Delete draft "${selected.title}" v${selected.version}?`)) return;
    setBusy(true);
    try {
      await adminApi.delete(`/policies/${selected.id}`);
      await load(null);
      setMessage('Draft deleted.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to delete draft');
    } finally {
      setBusy(false);
    }
  };

  const isEditing = creating || (editingId && selected && editingId === selected.id);

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1>Company Policies</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Policies shown to everyone in your company. Published versions are locked; changes create a new version.
          </p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={startNew} disabled={busy}>
          <Icon icon="lucide:plus" /> New policy
        </button>
      </div>

      {message && (
        <div className={`glass-alert ${/fail|error|exist|cannot|already/i.test(message) ? 'glass-alert-danger' : 'glass-alert-success'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) 1fr', gap: 16, alignItems: 'start' }}>
          <div className="glass-card">
            <div className="glass-card-header"><h3>Versions</h3></div>
            <div className="glass-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {policies.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No policies yet.</p>}
              {policies.map((policy) => (
                <button
                  key={policy.id}
                  type="button"
                  className={`glass-btn glass-btn-sm ${selectedId === policy.id ? 'glass-btn-primary' : 'glass-btn-ghost'}`}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => { setSelectedId(policy.id); setCreating(false); setEditingId(null); }}
                >
                  <span style={{ flex: 1 }}>
                    {TYPE_LABEL[policy.policy_type] || policy.policy_type} · v{policy.version}
                  </span>
                  <span className={`glass-badge ${policy.is_published === 1 ? 'glass-badge-success' : 'glass-badge-neutral'}`}>
                    {policy.is_published === 1 ? 'Live' : 'Draft'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card">
            <div className="glass-card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <h3>{isEditing ? (creating ? 'New policy' : 'Edit draft') : (selected ? selected.title : 'Policy details')}</h3>
              {!isEditing && selected && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selected.is_published === 1 ? (
                    <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={newVersion} disabled={busy}>
                      <Icon icon="lucide:git-branch" /> New version
                    </button>
                  ) : (
                    <>
                      <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={startEdit} disabled={busy}>
                        <Icon icon="lucide:pencil" /> Edit
                      </button>
                      <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={publish} disabled={busy}>
                        <Icon icon="lucide:send" /> Publish
                      </button>
                      <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={remove} disabled={busy}>
                        <Icon icon="lucide:trash-2" /> Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="glass-card-body">
              {isEditing ? (
                <div className="settings-form">
                  <div className="settings-grid">
                    <label>
                      Policy type
                      <select
                        className="glass-select"
                        value={form.policy_type}
                        onChange={(e) => setForm({ ...form, policy_type: e.target.value })}
                        disabled={!creating}
                        style={{ width: '100%' }}
                      >
                        {POLICY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Title
                      <input
                        className="glass-input"
                        value={form.title}
                        maxLength={200}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        style={{ width: '100%' }}
                      />
                    </label>
                  </div>
                  <label style={{ display: 'block', marginTop: 12 }}>
                    Content
                    <textarea
                      className="glass-input"
                      value={form.content}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      rows={14}
                      style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <input
                      type="checkbox"
                      checked={form.requires_ack}
                      onChange={(e) => setForm({ ...form, requires_ack: e.target.checked })}
                    />
                    Employees must acknowledge this policy
                  </label>
                  <div className="settings-actions" style={{ marginTop: 16 }}>
                    <button className="glass-btn glass-btn-primary" onClick={save} disabled={busy || !form.title.trim() || !form.content.trim()}>
                      <Icon icon="lucide:save" /> {busy ? 'Saving...' : 'Save draft'}
                    </button>
                    <button className="glass-btn glass-btn-ghost" onClick={cancelEdit} disabled={busy}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : !selected ? (
                <p style={{ color: 'var(--text-dim)' }}>Select a policy on the left, or create a new one.</p>
              ) : (
                <>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 12 }}>
                    {TYPE_LABEL[selected.policy_type]} · v{selected.version}
                    {selected.is_published === 1
                      ? ` · Published ${selected.published_at ? new Date(selected.published_at).toLocaleString() : ''}`
                      : ' · Draft — not visible to employees'}
                    {selected.is_published === 1 && ` · Acknowledged by ${selected.acknowledgement_count}/${selected.active_employee_count} employees`}
                  </p>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{selected.content}</div>

                  {selected.is_published === 1 && (
                    <div style={{ marginTop: 20 }}>
                      <h4 style={{ marginBottom: 8 }}>Acknowledgements</h4>
                      {ackRows === null ? (
                        <p style={{ color: 'var(--text-dim)' }}>Loading...</p>
                      ) : (
                        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                                <th style={{ padding: 6 }}>Employee</th>
                                <th style={{ padding: 6 }}>Status</th>
                                <th style={{ padding: 6 }}>Acknowledged at</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ackRows.map((row) => (
                                <tr key={row.employee_id} style={{ borderTop: '1px solid var(--border-subtle, #3333)' }}>
                                  <td style={{ padding: 6 }}>{row.name}</td>
                                  <td style={{ padding: 6 }}>
                                    <span className={`glass-badge ${row.accepted_at ? 'glass-badge-success' : 'glass-badge-warning'}`}>
                                      {row.accepted_at ? 'Acknowledged' : 'Pending'}
                                    </span>
                                  </td>
                                  <td style={{ padding: 6 }}>{row.accepted_at ? new Date(row.accepted_at).toLocaleString() : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
