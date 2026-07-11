// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';

const defaultForm = {
  name: '',
  slug: '',
  description: '',
  price_monthly: 0,
  price_yearly: 0,
  currency: 'USD',
  max_employees: 50,
  trial_days: 14,
  is_active: true,
  is_public: true,
  sort_order: 0,
  features: [],
};

export default function PlatformPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [featureInput, setFeatureInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const token = localStorage.getItem('platformToken');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform/plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addFeature = () => {
    if (featureInput.trim()) {
      setForm((prev) => ({ ...prev, features: [...prev.features, featureInput.trim()] }));
      setFeatureInput('');
    }
  };

  const removeFeature = (idx) => {
    setForm((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowForm(true);
    setError('');
  };

  const openEdit = (plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      currency: plan.currency,
      max_employees: plan.max_employees,
      trial_days: plan.trial_days,
      is_active: !!plan.is_active,
      is_public: !!plan.is_public,
      sort_order: plan.sort_order,
      features: plan.features ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features) : [],
    });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        ...form,
        price_monthly: parseFloat(form.price_monthly) || 0,
        price_yearly: parseFloat(form.price_yearly) || 0,
        max_employees: parseInt(form.max_employees) || 50,
        trial_days: parseInt(form.trial_days) || 14,
        sort_order: parseInt(form.sort_order) || 0,
      };
      const url = editing ? `/api/platform/plans/${editing.id}` : '/api/platform/plans';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save plan');
        return;
      }
      setShowForm(false);
      fetchPlans();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/platform/plans/${plan.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchPlans();
      else { const data = await res.json(); alert(data.error || 'Failed to delete'); }
    } catch { alert('Network error'); }
  };

  const toggleActive = async (plan) => {
    await fetch(`/api/platform/plans/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !plan.is_active }),
    });
    fetchPlans();
  };

  const togglePublic = async (plan) => {
    await fetch(`/api/platform/plans/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_public: !plan.is_public }),
    });
    fetchPlans();
  };

  const formatCurrency = (amount, currency) => {
    if (amount === 0) return 'Free';
    const symbols = { USD: '$', EGP: 'E£', EUR: '€', GBP: '£', SAR: '﷼', AED: 'AED' };
    return `${symbols[currency] || currency}${amount}`;
  };

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Subscription Plans</h1>
          <p>Manage pricing, features, and limits for each plan</p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={openCreate}>
          <Icon icon="lucide:plus" /> New Plan
        </button>
      </div>

      {showForm && (
        <div className="glass-card platform-plans-form">
          <h3>{editing ? 'Edit Plan' : 'Create New Plan'}</h3>
          {error && <div className="glass-alert glass-alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="platform-plans-form-grid">
              <div className="glass-input-group">
                <label>Plan Name</label>
                <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required className="glass-input" placeholder="e.g. Professional" />
              </div>
              <div className="glass-input-group">
                <label>Slug</label>
                <input type="text" value={form.slug} onChange={(e) => handleChange('slug', e.target.value)} required className="glass-input" placeholder="e.g. professional" pattern="[a-z0-9-]+" />
              </div>
            </div>
            <div className="glass-input-group" style={{ marginTop: 12 }}>
              <label>Description</label>
              <input type="text" value={form.description} onChange={(e) => handleChange('description', e.target.value)} className="glass-input" placeholder="Short description of this plan" />
            </div>
            <div className="platform-plans-form-grid-4" style={{ marginTop: 12 }}>
              <div className="glass-input-group">
                <label>Monthly Price</label>
                <input type="number" step="0.01" min="0" value={form.price_monthly} onChange={(e) => handleChange('price_monthly', e.target.value)} className="glass-input" />
              </div>
              <div className="glass-input-group">
                <label>Yearly Price</label>
                <input type="number" step="0.01" min="0" value={form.price_yearly} onChange={(e) => handleChange('price_yearly', e.target.value)} className="glass-input" />
              </div>
              <div className="glass-input-group">
                <label>Currency</label>
                <select value={form.currency} onChange={(e) => handleChange('currency', e.target.value)} className="glass-input">
                  <option value="USD">USD ($)</option>
                  <option value="EGP">EGP (E£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="SAR">SAR (﷼)</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              <div className="glass-input-group">
                <label>Max Employees</label>
                <input type="number" min="1" value={form.max_employees} onChange={(e) => handleChange('max_employees', e.target.value)} className="glass-input" />
              </div>
            </div>
            <div className="platform-plans-form-grid-3" style={{ marginTop: 12 }}>
              <div className="glass-input-group">
                <label>Trial Days</label>
                <input type="number" min="0" value={form.trial_days} onChange={(e) => handleChange('trial_days', e.target.value)} className="glass-input" />
              </div>
              <div className="glass-input-group">
                <label>Sort Order</label>
                <input type="number" min="0" value={form.sort_order} onChange={(e) => handleChange('sort_order', e.target.value)} className="glass-input" />
              </div>
              <div className="glass-input-group platform-plans-checkbox-group">
                <label className="platform-plans-checkbox-label">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} />
                  Active
                </label>
                <label className="platform-plans-checkbox-label">
                  <input type="checkbox" checked={form.is_public} onChange={(e) => handleChange('is_public', e.target.checked)} />
                  Public
                </label>
              </div>
            </div>
            <div className="glass-input-group" style={{ marginTop: 12 }}>
              <label>Features</label>
              <div className="platform-plans-features-input">
                <input type="text" value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} className="glass-input" placeholder="Add a feature"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                />
                <button type="button" className="glass-btn glass-btn-sm" onClick={addFeature}>Add</button>
              </div>
              <div className="platform-plans-feature-tags">
                {form.features.map((f, i) => (
                  <span key={i} className="platform-plans-feature-tag">
                    {f}
                    <button type="button" onClick={() => removeFeature(i)}>×</button>
                  </span>
                ))}
              </div>
            </div>
            <div className="platform-plans-form-actions">
              <button type="submit" className="glass-btn glass-btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update Plan' : 'Create Plan'}
              </button>
              <button type="button" className="glass-btn glass-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="glass-loading"><div className="spinner" /></div>
      ) : plans.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 48 }}>
          <Icon icon="lucide:package" style={{ fontSize: '2rem', color: 'var(--text-muted)', marginBottom: 12 }} />
          <p className="text-dim">No plans yet. Create your first plan.</p>
        </div>
      ) : (
        <div className="platform-plans-grid">
          {plans.map((plan) => {
            const features = plan.features ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features) : [];
            return (
              <div key={plan.id} className={`glass-card platform-plan-card ${!plan.is_active ? 'inactive' : ''}`}>
                <div className="platform-plan-header">
                  <div>
                    <div className="platform-plan-name-row">
                      <h3>{plan.name}</h3>
                      {!plan.is_public && <span className="platform-plan-hidden-badge">Hidden</span>}
                    </div>
                    <p className="platform-plan-desc">{plan.description}</p>
                  </div>
                  <div className="platform-plan-actions">
                    <button onClick={() => toggleActive(plan)} className="glass-btn glass-btn-sm glass-btn-ghost" title={plan.is_active ? 'Deactivate' : 'Activate'}>
                      <Icon icon={plan.is_active ? 'lucide:eye' : 'lucide:eye-off'} />
                    </button>
                    <button onClick={() => togglePublic(plan)} className="glass-btn glass-btn-sm glass-btn-ghost" title={plan.is_public ? 'Hide from public' : 'Show publicly'}>
                      <Icon icon={plan.is_public ? 'lucide:globe' : 'lucide:globe-lock'} />
                    </button>
                    <button onClick={() => openEdit(plan)} className="glass-btn glass-btn-sm glass-btn-ghost">
                      <Icon icon="lucide:pencil" />
                    </button>
                    <button onClick={() => handleDelete(plan)} className="glass-btn glass-btn-sm glass-btn-danger">
                      <Icon icon="lucide:trash-2" />
                    </button>
                  </div>
                </div>

                <div className="platform-plan-pricing">
                  <div className="platform-plan-price-block">
                    <div className="platform-plan-price-label">Monthly</div>
                    <div className="platform-plan-price-value">{formatCurrency(plan.price_monthly, plan.currency)}</div>
                  </div>
                  <div className="platform-plan-price-block">
                    <div className="platform-plan-price-label">Yearly</div>
                    <div className="platform-plan-price-value">{formatCurrency(plan.price_yearly, plan.currency)}</div>
                  </div>
                </div>

                <div className="platform-plan-meta">
                  <span><Icon icon="lucide:users" /> {plan.max_employees >= 9999 ? 'Unlimited' : plan.max_employees} employees</span>
                  <span><Icon icon="lucide:clock" /> {plan.trial_days}d trial</span>
                </div>

                {features.length > 0 && (
                  <div className="platform-plan-features">
                    {features.map((f, i) => (
                      <div key={i} className="platform-plan-feature-item">
                        <Icon icon="lucide:check" className="check-icon" />
                        {f}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
