// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useCallback, useEffect, useState } from 'react';
import Icon from '../../../shared/components/Icon';
import platformApi from '../../../shared/api/platformApi';
import { formatDateTime, parseDate } from '../../../shared/utils/date';

const STAGES = ['lead', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const STAGE_META = {
  lead: { label: 'Lead', badge: 'info' },
  contacted: { label: 'Contacted', badge: 'default' },
  qualified: { label: 'Qualified', badge: 'info' },
  proposal: { label: 'Proposal', badge: 'warning' },
  won: { label: 'Won', badge: 'success' },
  lost: { label: 'Lost', badge: 'error' },
};
const ACTIVITY_TYPES = [
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'follow_up', label: 'Follow-up' },
];

const emptyContact = {
  company_name: '',
  contact_name: '',
  job_title: '',
  email: '',
  phone: '',
  industry: '',
  employee_count: '',
  plan_interest: '',
  stage: 'lead',
  next_follow_up_at: '',
  notes: '',
};

// The API stores Cairo wall-clock strings; the datetime-local input needs
// "YYYY-MM-DDTHH:mm".
function toDateTimeInput(value) {
  const date = parseDate(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
  return parts.replace(' ', 'T');
}

function fromDateTimeInput(value) {
  if (!value) return null;
  return `${value.replace('T', ' ')}:00`;
}

export default function PlatformCrm() {
  const [overview, setOverview] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ q: '', stage: '', follow_up: '' });
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyContact);
  const [activity, setActivity] = useState({ type: 'note', subject: '', body: '', next_follow_up_at: '' });
  const [editState, setEditState] = useState({ stage: '', next_follow_up_at: '', notes: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await platformApi.get('/crm/overview');
      setOverview(res.data);
    } catch {}
  }, []);

  const fetchContacts = useCallback(async (nextPage = page, nextFilters = filters) => {
    try {
      const params = { page: nextPage, limit: 25 };
      if (nextFilters.q.trim()) params.q = nextFilters.q.trim();
      if (nextFilters.stage) params.stage = nextFilters.stage;
      if (nextFilters.follow_up) params.follow_up = nextFilters.follow_up;
      const res = await platformApi.get('/crm/contacts', { params });
      setContacts(res.data.contacts || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      setError('Failed to load contacts');
    }
  }, [page, filters]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { fetchContacts(page, filters); }, [fetchContacts, page, filters]);

  const openContact = async (id) => {
    setError('');
    try {
      const res = await platformApi.get(`/crm/contacts/${id}`);
      setSelected(res.data);
      setEditState({
        stage: res.data.stage,
        next_follow_up_at: toDateTimeInput(res.data.next_follow_up_at),
        notes: res.data.notes || '',
      });
      setActivity({ type: 'note', subject: '', body: '', next_follow_up_at: '' });
    } catch {
      setError('Failed to load contact');
    }
  };

  const refreshAll = async (contactId) => {
    await Promise.all([
      fetchOverview(),
      fetchContacts(page, filters),
      contactId ? openContact(contactId) : Promise.resolve(),
    ]);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const body = {
        ...form,
        employee_count: form.employee_count ? parseInt(form.employee_count, 10) : null,
        next_follow_up_at: fromDateTimeInput(form.next_follow_up_at),
      };
      const res = await platformApi.post('/crm/contacts', body);
      setCreating(false);
      setForm(emptyContact);
      await refreshAll(res.data?.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create contact');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveContact = async () => {
    if (!selected) return;
    setError('');
    setBusy(true);
    try {
      await platformApi.put(`/crm/contacts/${selected.id}`, {
        stage: editState.stage,
        next_follow_up_at: fromDateTimeInput(editState.next_follow_up_at),
        notes: editState.notes,
      });
      await refreshAll(selected.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update contact');
    } finally {
      setBusy(false);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setBusy(true);
    try {
      await platformApi.post(`/crm/contacts/${selected.id}/activities`, {
        ...activity,
        next_follow_up_at: fromDateTimeInput(activity.next_follow_up_at),
      });
      await refreshAll(selected.id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log activity');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Delete CRM contact "${selected.company_name}"?`)) return;
    try {
      await platformApi.delete(`/crm/contacts/${selected.id}`);
      setSelected(null);
      await refreshAll(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete contact');
    }
  };

  const applyFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
  };

  const revenueLabel = overview?.revenue_30_days?.length
    ? overview.revenue_30_days.map((r) => `${Number(r.total).toLocaleString()} ${r.currency}`).join(' · ')
    : '0';

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Marketing CRM</h1>
          <p>Pipeline, follow-ups and account contacts — no employee data</p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={() => { setCreating(true); setForm(emptyContact); setError(''); }}>
          <Icon icon="lucide:user-plus" size={16} /> New Contact
        </button>
      </div>

      {error && <div className="glass-alert glass-alert-error">{error}</div>}

      <div className="platform-stats-grid">
        <div className="platform-stat-card">
          <div className="platform-stat-icon info"><Icon icon="lucide:users" /></div>
          <div className="platform-stat-content">
            <div className="platform-stat-value">{overview?.pipeline?.total ?? '—'}</div>
            <div className="platform-stat-label">Contacts</div>
          </div>
        </div>
        <div className="platform-stat-card">
          <div className="platform-stat-icon warning"><Icon icon="lucide:clock" /></div>
          <div className="platform-stat-content">
            <div className="platform-stat-value">{overview?.follow_ups?.overdue ?? '—'}</div>
            <div className="platform-stat-label">Overdue follow-ups</div>
          </div>
        </div>
        <div className="platform-stat-card">
          <div className="platform-stat-icon primary"><Icon icon="lucide:file-text" /></div>
          <div className="platform-stat-content">
            <div className="platform-stat-value">{overview?.requests?.pending ?? '—'}</div>
            <div className="platform-stat-label">Pending signups</div>
          </div>
        </div>
        <div className="platform-stat-card">
          <div className="platform-stat-icon success"><Icon icon="lucide:badge-check" /></div>
          <div className="platform-stat-content">
            <div className="platform-stat-value">{overview?.pipeline?.won ?? '—'}</div>
            <div className="platform-stat-label">Won accounts</div>
          </div>
        </div>
        <div className="platform-stat-card">
          <div className="platform-stat-icon success"><Icon icon="lucide:banknote" /></div>
          <div className="platform-stat-content">
            <div className="platform-stat-value">{revenueLabel}</div>
            <div className="platform-stat-label">Verified revenue · 30 days</div>
          </div>
        </div>
      </div>

      {creating && (
        <div className="glass-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 className="platform-section-title" style={{ margin: 0 }}>New Contact</h2>
            <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setCreating(false)}>
              <Icon icon="lucide:x" size={14} /> Close
            </button>
          </div>
          <form onSubmit={handleCreate}>
            <div className="platform-form-grid">
              <div className="glass-input-group">
                <label>Company *</label>
                <input className="glass-input" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
              <div className="glass-input-group">
                <label>Contact name</label>
                <input className="glass-input" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div className="glass-input-group">
                <label>Email *</label>
                <input className="glass-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="glass-input-group">
                <label>Phone</label>
                <input className="glass-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="glass-input-group">
                <label>Job title</label>
                <input className="glass-input" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
              </div>
              <div className="glass-input-group">
                <label>Industry</label>
                <input className="glass-input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </div>
              <div className="glass-input-group">
                <label>Employees</label>
                <input className="glass-input" type="number" min="1" value={form.employee_count} onChange={(e) => setForm({ ...form, employee_count: e.target.value })} />
              </div>
              <div className="glass-input-group">
                <label>Plan interest</label>
                <input className="glass-input" value={form.plan_interest} onChange={(e) => setForm({ ...form, plan_interest: e.target.value })} placeholder="basic / professional" />
              </div>
              <div className="glass-input-group">
                <label>Stage</label>
                <select className="glass-select" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                  {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_META[stage].label}</option>)}
                </select>
              </div>
              <div className="glass-input-group">
                <label>Next follow-up</label>
                <input className="glass-input" type="datetime-local" value={form.next_follow_up_at} onChange={(e) => setForm({ ...form, next_follow_up_at: e.target.value })} />
              </div>
            </div>
            <div className="glass-input-group" style={{ marginTop: 12 }}>
              <label>Notes</label>
              <textarea className="glass-input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div style={{ marginTop: 12 }}>
              <button type="submit" className="glass-btn glass-btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Create contact'}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0, 1.5fr) minmax(320px, 1fr)' : '1fr', gap: 20, alignItems: 'start' }}>
        <div className="glass-card">
          <div className="platform-page-header" style={{ marginBottom: 12 }}>
            <div>
              <h2 className="platform-section-title" style={{ margin: 0 }}>Contacts</h2>
              <p style={{ margin: '4px 0 0' }}>{total} contact{total === 1 ? '' : 's'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <input
              className="glass-input"
              style={{ flex: '1 1 200px' }}
              placeholder="Search company, name, email or phone"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchContacts(1, filters); }}
            />
            <select className="glass-select" value={filters.stage} onChange={(e) => applyFilter('stage', e.target.value)}>
              <option value="">All stages</option>
              {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_META[stage].label}</option>)}
            </select>
            <select className="glass-select" value={filters.follow_up} onChange={(e) => applyFilter('follow_up', e.target.value)}>
              <option value="">Any follow-up</option>
              <option value="due">Due now</option>
              <option value="week">Next 7 days</option>
            </select>
            <button className="glass-btn glass-btn-ghost" onClick={() => fetchContacts(1, filters)}>
              <Icon icon="lucide:search" size={14} />
            </button>
          </div>

          {contacts.length === 0 ? (
            <p className="text-muted">No contacts match these filters.</p>
          ) : (
            <div className="platform-table-wrapper">
              <table className="platform-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Stage</th>
                    <th>Follow-up</th>
                    <th>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => {
                    const meta = STAGE_META[contact.stage] || { label: contact.stage, badge: 'default' };
                    const overdue = contact.next_follow_up_at && new Date(contact.next_follow_up_at) <= new Date()
                      && !['won', 'lost'].includes(contact.stage);
                    return (
                      <tr
                        key={contact.id}
                        onClick={() => openContact(contact.id)}
                        style={{ cursor: 'pointer', background: selected?.id === contact.id ? 'rgba(255,255,255,0.04)' : undefined }}
                      >
                        <td className="platform-table-company">
                          <strong>{contact.company_name}</strong>
                          <span>{contact.email}</span>
                        </td>
                        <td>
                          {contact.contact_name || '—'}
                          {contact.job_title ? <div className="text-muted">{contact.job_title}</div> : null}
                        </td>
                        <td><span className={`glass-badge glass-badge-${meta.badge}`}>{meta.label}</span></td>
                        <td style={{ color: overdue ? '#f87171' : undefined }}>
                          {contact.next_follow_up_at ? formatDateTime(contact.next_follow_up_at) : '—'}
                        </td>
                        <td>{contact.owner_username || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button className="glass-btn glass-btn-sm glass-btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button className="glass-btn glass-btn-sm glass-btn-ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </div>

        {selected && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 className="platform-section-title" style={{ margin: 0 }}>{selected.company_name}</h2>
                <p style={{ margin: '4px 0 0' }}>{selected.email}</p>
              </div>
              <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setSelected(null)}>
                <Icon icon="lucide:x" size={14} />
              </button>
            </div>

            <div className="platform-detail-info" style={{ marginTop: 12 }}>
              <div className="detail-row"><span className="detail-label">Contact</span><span>{selected.contact_name || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Phone</span><span>{selected.phone || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Industry</span><span>{selected.industry || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Employees</span><span>{selected.employee_count || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Plan interest</span><span>{selected.plan_interest || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Source</span><span>{selected.source}</span></div>
              {selected.tenant_name && (
                <div className="detail-row"><span className="detail-label">Tenant</span><span>{selected.tenant_name}</span></div>
              )}
            </div>

            <div className="platform-form-grid" style={{ marginTop: 16 }}>
              <div className="glass-input-group">
                <label>Stage</label>
                <select className="glass-select" value={editState.stage} onChange={(e) => setEditState({ ...editState, stage: e.target.value })}>
                  {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_META[stage].label}</option>)}
                </select>
              </div>
              <div className="glass-input-group">
                <label>Next follow-up</label>
                <input className="glass-input" type="datetime-local" value={editState.next_follow_up_at} onChange={(e) => setEditState({ ...editState, next_follow_up_at: e.target.value })} />
              </div>
            </div>
            <div className="glass-input-group" style={{ marginTop: 12 }}>
              <label>Notes</label>
              <textarea className="glass-input" rows={3} value={editState.notes} onChange={(e) => setEditState({ ...editState, notes: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="glass-btn glass-btn-primary glass-btn-sm" onClick={handleSaveContact} disabled={busy}>
                {busy ? 'Saving...' : 'Save'}
              </button>
              {!selected.tenant_id && !selected.tenant_request_id && (
                <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={handleDelete}>
                  <Icon icon="lucide:trash-2" size={14} /> Delete
                </button>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '18px 0' }} />

            <h3 className="platform-section-title" style={{ marginTop: 0 }}>Log activity</h3>
            <form onSubmit={handleAddActivity}>
              <div className="platform-form-grid">
                <div className="glass-input-group">
                  <label>Type</label>
                  <select className="glass-select" value={activity.type} onChange={(e) => setActivity({ ...activity, type: e.target.value })}>
                    {ACTIVITY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
                <div className="glass-input-group">
                  <label>Set next follow-up</label>
                  <input className="glass-input" type="datetime-local" value={activity.next_follow_up_at} onChange={(e) => setActivity({ ...activity, next_follow_up_at: e.target.value })} />
                </div>
              </div>
              <div className="glass-input-group" style={{ marginTop: 8 }}>
                <label>Subject</label>
                <input className="glass-input" value={activity.subject} onChange={(e) => setActivity({ ...activity, subject: e.target.value })} />
              </div>
              <div className="glass-input-group" style={{ marginTop: 8 }}>
                <label>Details</label>
                <textarea className="glass-input" rows={2} value={activity.body} onChange={(e) => setActivity({ ...activity, body: e.target.value })} />
              </div>
              <button type="submit" className="glass-btn glass-btn-sm glass-btn-primary" style={{ marginTop: 8 }} disabled={busy}>
                Add activity
              </button>
            </form>

            <h3 className="platform-section-title" style={{ marginTop: 20 }}>Timeline</h3>
            {(!selected.activities || selected.activities.length === 0) ? (
              <p className="text-muted">No activity yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selected.activities.map((item) => (
                  <div key={item.id} style={{ borderLeft: '2px solid rgba(255,255,255,0.12)', paddingLeft: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong style={{ textTransform: 'capitalize' }}>{item.subject || item.type.replace('_', ' ')}</strong>
                      <span className="text-muted" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(item.occurred_at)}</span>
                    </div>
                    {item.body && <div style={{ marginTop: 2 }}>{item.body}</div>}
                    <div className="text-muted" style={{ marginTop: 2 }}>
                      {item.type.replace('_', ' ')}{item.admin_username ? ` · ${item.admin_username}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
