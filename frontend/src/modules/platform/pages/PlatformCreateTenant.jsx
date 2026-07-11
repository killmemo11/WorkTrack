import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../shared/components/Icon';

export default function PlatformCreateTenant() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    company_name: '',
    contact_email: '',
    contact_phone: '',
    plan: 'trial',
    max_employees: 50,
    trial_days: 14,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const token = localStorage.getItem('platformToken');
        const res = await fetch('/api/platform/plans', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPlans(data.filter(p => p.is_active));
        }
      } catch {}
    };
    fetchPlans();
  }, []);

  const handlePlanChange = (slug) => {
    const plan = plans.find(p => p.slug === slug);
    setForm({
      ...form,
      plan: slug,
      max_employees: plan ? plan.max_employees : 50,
      trial_days: plan ? plan.trial_days : 14,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch('/api/platform/tenants', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/platform/tenants/${data.tenantId}`);
      } else {
        setError(data.error || 'Failed to create tenant');
      }
    } catch {
      setError('Failed to create tenant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <Link to="/platform/tenants" className="platform-back-link">
            <Icon icon="lucide:arrow-left" size={16} /> Tenants
          </Link>
          <h1>Create New Tenant</h1>
          <p>Manually create a new tenant account</p>
        </div>
      </div>

      <div className="glass-card platform-form-card">
        {error && <div className="glass-alert glass-alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="platform-form-grid">
          <div className="glass-input-group">
            <label>Company Name *</label>
            <input
              className="glass-input"
              value={form.company_name}
              onChange={e => setForm({ ...form, company_name: e.target.value })}
              placeholder="Acme Corp"
              required
            />
          </div>

          <div className="glass-input-group">
            <label>Contact Email *</label>
            <input
              className="glass-input"
              type="email"
              value={form.contact_email}
              onChange={e => setForm({ ...form, contact_email: e.target.value })}
              placeholder="admin@acme.com"
              required
            />
          </div>

          <div className="glass-input-group">
            <label>Contact Phone</label>
            <input
              className="glass-input"
              value={form.contact_phone}
              onChange={e => setForm({ ...form, contact_phone: e.target.value })}
              placeholder="+1 234 567 890"
            />
          </div>

          <div className="glass-input-group">
            <label>Plan</label>
            <select className="glass-select" value={form.plan} onChange={e => handlePlanChange(e.target.value)}>
              {plans.map(p => (
                <option key={p.slug} value={p.slug}>{p.name} (${p.price_monthly}/mo)</option>
              ))}
            </select>
          </div>

          <div className="glass-input-group">
            <label>Max Employees</label>
            <input
              className="glass-input"
              type="number"
              min="1"
              value={form.max_employees}
              onChange={e => setForm({ ...form, max_employees: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="glass-input-group">
            <label>Trial Days</label>
            <input
              className="glass-input"
              type="number"
              min="0"
              value={form.trial_days}
              onChange={e => setForm({ ...form, trial_days: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="platform-form-actions">
            <Link to="/platform/tenants" className="glass-btn glass-btn-ghost">Cancel</Link>
            <button type="submit" className="glass-btn glass-btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
