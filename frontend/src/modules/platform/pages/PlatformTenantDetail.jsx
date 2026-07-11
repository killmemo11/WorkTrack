import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Icon from '../../../shared/components/Icon';

export default function PlatformTenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchTenant = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch(`/api/platform/tenants/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTenant(data);
        setForm({
          name: data.name || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          plan: data.plan || 'trial',
          max_employees: data.max_employees || 50,
        });
      } else {
        navigate('/platform/tenants');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenant(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch(`/api/platform/tenants/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEditing(false);
        fetchTenant();
      } else {
        alert('Failed to update');
      }
    } catch { alert('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleSuspend = async () => {
    const reason = prompt(`Suspend "${tenant.name}"? Enter reason:`);
    if (reason === null) return;
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch(`/api/platform/tenants/${id}/suspend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) fetchTenant();
    } catch { alert('Failed'); }
  };

  const handleActivate = async () => {
    if (!confirm(`Reactivate "${tenant.name}"?`)) return;
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch(`/api/platform/tenants/${id}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchTenant();
    } catch { alert('Failed'); }
  };

  const handleResendMagicLink = async (adminId) => {
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch(`/api/platform/tenants/admins/${adminId}/resend-magic-link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      alert(data.message || 'Magic link resent');
    } catch { alert('Failed'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

  if (loading) return <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>;
  if (!tenant) return null;

  const statusMap = {
    active: { label: 'Active', color: 'success' },
    trial: { label: 'Trial', color: 'info' },
    suspended: { label: 'Suspended', color: 'warning' },
    cancelled: { label: 'Cancelled', color: 'error' },
  };
  const status = statusMap[tenant.status] || { label: tenant.status, color: 'default' };

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <Link to="/platform/tenants" className="platform-back-link">
            <Icon icon="lucide:arrow-left" size={16} /> Tenants
          </Link>
          <h1>{tenant.name}</h1>
          <p>Slug: {tenant.slug}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="glass-btn glass-btn-ghost">Cancel</button>
              <button onClick={handleSave} className="glass-btn glass-btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="glass-btn glass-btn-ghost">
                <Icon icon="lucide:pencil" size={14} /> Edit
              </button>
              {tenant.status === 'suspended' ? (
                <button onClick={handleActivate} className="glass-btn glass-btn-success">
                  <Icon icon="lucide:check" size={14} /> Reactivate
                </button>
              ) : tenant.status !== 'cancelled' ? (
                <button onClick={handleSuspend} className="glass-btn glass-btn-warning">
                  <Icon icon="lucide:pause" size={14} /> Suspend
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="platform-detail-grid">
        <div className="glass-card">
          <h2 className="platform-section-title">Tenant Info</h2>
          {editing ? (
            <div className="platform-form-grid">
              <div className="glass-input-group">
                <label>Company Name</label>
                <input className="glass-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="glass-input-group">
                <label>Contact Email</label>
                <input className="glass-input" type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div className="glass-input-group">
                <label>Contact Phone</label>
                <input className="glass-input" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
              <div className="glass-input-group">
                <label>Plan</label>
                <select className="glass-select" value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
                  <option value="trial">Trial</option>
                  <option value="basic">Basic</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="glass-input-group">
                <label>Max Employees</label>
                <input className="glass-input" type="number" value={form.max_employees} onChange={e => setForm({ ...form, max_employees: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          ) : (
            <div className="platform-detail-info">
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className={`glass-badge glass-badge-${status.color}`}>{status.label}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Plan</span>
                <span className={`glass-badge glass-badge-${tenant.plan === 'enterprise' ? 'success' : tenant.plan === 'trial' ? 'info' : 'default'}`}>
                  {tenant.plan}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Contact Email</span>
                <span>{tenant.contact_email || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Contact Phone</span>
                <span>{tenant.contact_phone || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Employees</span>
                <span>{tenant.employee_count || 0} / {tenant.max_employees}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Admin Users</span>
                <span>{tenant.admin_count || 0}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Trial Ends</span>
                <span>{formatDate(tenant.trial_ends_at)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created</span>
                <span>{formatDate(tenant.created_at)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card">
          <h2 className="platform-section-title">Admin Users</h2>
          {!tenant.admins || tenant.admins.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No admin users</p>
          ) : (
            <div className="platform-admin-list">
              {tenant.admins.map(admin => (
                <div key={admin.id} className="platform-admin-item">
                  <div className="admin-info">
                    <strong>{admin.username}</strong>
                    <span>{admin.email}</span>
                    <span className={`glass-badge glass-badge-${admin.is_active ? 'success' : 'error'}`}>
                      {admin.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="admin-actions">
                    <button onClick={() => handleResendMagicLink(admin.id)} className="glass-btn glass-btn-sm glass-btn-ghost">
                      <Icon icon="lucide:mail" size={14} /> Magic Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {tenant.services && tenant.services.length > 0 && (
          <div className="glass-card">
            <h2 className="platform-section-title">Services</h2>
            <div className="platform-services-grid">
              {tenant.services.map(svc => (
                <div key={svc.service_key} className="platform-service-item">
                  <Icon icon={`lucide:${svc.icon || 'circle'}`} size={16} />
                  <span>{svc.service_name}</span>
                  <span className={`glass-badge glass-badge-${svc.is_enabled ? 'success' : 'default'}`}>
                    {svc.is_enabled ? 'On' : 'Off'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
