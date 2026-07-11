import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';

export default function PlatformClientAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [form, setForm] = useState({ tenant_id: '', username: '', email: '', password: '' });
  const [resetPwId, setResetPwId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('platformToken');

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filterTenant) params.append('tenant_id', filterTenant);
      if (search) params.append('search', search);
      const res = await fetch(`/api/platform/client-accounts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts);
        setTotalPages(data.totalPages);
      }
    } catch {} finally { setLoading(false); }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch('/api/platform/tenants?limit=200', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTenants(data.tenants || []);
      }
    } catch {}
  };

  useEffect(() => { fetchTenants(); }, []);
  useEffect(() => { fetchAccounts(); }, [page, filterTenant]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAccounts();
  };

  const openCreate = () => {
    setEditAccount(null);
    setForm({ tenant_id: filterTenant || (tenants[0]?.id || ''), username: '', email: '', password: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (account) => {
    setEditAccount(account);
    setForm({ tenant_id: account.tenant_id, username: account.username, email: account.email, password: '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editAccount) {
        const res = await fetch(`/api/platform/client-accounts/${editAccount.id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      } else {
        const res = await fetch('/api/platform/client-accounts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      }
      setShowModal(false);
      fetchAccounts();
    } catch { setError('Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (account) => {
    if (!confirm(`Delete admin "${account.username}" from "${account.tenant_name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/platform/client-accounts/${account.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchAccounts();
      else { const d = await res.json(); alert(d.error); }
    } catch { alert('Failed'); }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/platform/client-accounts/${resetPwId}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) { setResetPwId(null); setNewPassword(''); alert('Password reset successfully'); }
      else { const d = await res.json(); alert(d.error); }
    } catch { alert('Failed'); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (account) => {
    try {
      const res = await fetch(`/api/platform/client-accounts/${account.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !account.is_active }),
      });
      if (res.ok) fetchAccounts();
    } catch {}
  };

  const handleSendMagicLink = async (account) => {
    try {
      const res = await fetch(`/api/platform/tenants/admins/${account.id}/resend-magic-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) alert(`Magic link sent to ${account.email}`);
      else { const d = await res.json(); alert(d.error); }
    } catch { alert('Failed'); }
  };

  const getTenantName = (id) => {
    const t = tenants.find(t => t.id === id);
    return t ? t.name : 'Unknown';
  };

  if (loading && accounts.length === 0) return <div className="glass-loading"><div className="spinner" /></div>;

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Client Accounts</h1>
          <p>Manage admin accounts for all client tenants</p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={openCreate}>
          <Icon icon="lucide:plus" size={16} /> Add Account
        </button>
      </div>

      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
            <input
              className="glass-input"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="glass-btn glass-btn-primary glass-btn-sm">
              <Icon icon="lucide:search" size={14} />
            </button>
          </form>
          <select
            className="glass-input"
            value={filterTenant}
            onChange={e => { setFilterTenant(e.target.value); setPage(1); }}
            style={{ minWidth: 180 }}
          >
            <option value="">All Tenants</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card">
        <div className="platform-admins-grid">
          {accounts.map(account => (
            <div key={account.id} className="platform-admin-card">
              <div className="admin-details">
                <strong>{account.username}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{account.email}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                  <span className="glass-badge glass-badge-info" style={{ fontSize: '0.7rem' }}>
                    {account.tenant_name || 'No Tenant'}
                  </span>
                  <span className={`glass-badge glass-badge-${account.is_active ? 'success' : 'error'}`}>
                    {account.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {account.must_change_password === 1 && (
                    <span className="glass-badge glass-badge-warning">Must Change PW</span>
                  )}
                </div>
              </div>
              <div className="admin-controls">
                <button onClick={() => handleSendMagicLink(account)} className="glass-btn glass-btn-sm glass-btn-ghost" title="Send Magic Link">
                  <Icon icon="lucide:mail" size={14} />
                </button>
                <button onClick={() => openEdit(account)} className="glass-btn glass-btn-sm glass-btn-ghost" title="Edit">
                  <Icon icon="lucide:pencil" size={14} />
                </button>
                <button onClick={() => { setResetPwId(account.id); setNewPassword(''); }} className="glass-btn glass-btn-sm glass-btn-ghost" title="Reset Password">
                  <Icon icon="lucide:key" size={14} />
                </button>
                <button onClick={() => handleToggleActive(account)} className="glass-btn glass-btn-sm glass-btn-ghost" title={account.is_active ? 'Deactivate' : 'Activate'}>
                  <Icon icon={account.is_active ? 'lucide:pause' : 'lucide:check'} size={14} />
                </button>
                <button onClick={() => handleDelete(account)} className="glass-btn glass-btn-sm glass-btn-danger" title="Delete">
                  <Icon icon="lucide:trash-2" size={14} />
                </button>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              No client accounts found
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="glass-btn glass-btn-sm glass-btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages}
          </span>
          <button className="glass-btn glass-btn-sm glass-btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {showModal && (
        <div className="platform-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="platform-modal" onClick={e => e.stopPropagation()}>
            <h2>{editAccount ? 'Edit Client Account' : 'Create New Client Account'}</h2>
            {error && <div className="glass-alert glass-alert-error">{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!editAccount && (
                <div className="glass-input-group">
                  <label>Tenant</label>
                  <select className="glass-input" value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })}>
                    <option value="">Select tenant...</option>
                    {tenants.filter(t => t.status === 'active' || t.status === 'trial').map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {!editAccount && (
                <div className="glass-input-group">
                  <label>Username</label>
                  <input className="glass-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                </div>
              )}
              <div className="glass-input-group">
                <label>Email</label>
                <input className="glass-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              {!editAccount && (
                <div className="glass-input-group">
                  <label>Password</label>
                  <input className="glass-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
                </div>
              )}
            </div>
            <div className="platform-modal-actions">
              <button className="glass-btn glass-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="glass-btn glass-btn-primary" onClick={handleSave} disabled={saving || (!editAccount && (!form.tenant_id || !form.username || !form.email || !form.password))}>
                {saving ? 'Saving...' : editAccount ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetPwId && (
        <div className="platform-modal-overlay" onClick={() => setResetPwId(null)}>
          <div className="platform-modal" onClick={e => e.stopPropagation()}>
            <h2>Reset Password</h2>
            <div className="glass-input-group">
              <label>New Password</label>
              <input className="glass-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" autoFocus />
            </div>
            <div className="platform-modal-actions">
              <button className="glass-btn glass-btn-ghost" onClick={() => setResetPwId(null)}>Cancel</button>
              <button className="glass-btn glass-btn-primary" onClick={handleResetPassword} disabled={saving || newPassword.length < 8}>
                {saving ? 'Saving...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
