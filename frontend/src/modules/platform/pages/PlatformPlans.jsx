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
    } catch {
    } finally {
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      if (res.ok) {
        fetchPlans();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch {
      alert('Network error');
    }
  };

  const toggleActive = async (plan) => {
    await fetch(`/api/platform/plans/${plan.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_active: !plan.is_active }),
    });
    fetchPlans();
  };

  const togglePublic = async (plan) => {
    await fetch(`/api/platform/plans/${plan.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ is_public: !plan.is_public }),
    });
    fetchPlans();
  };

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Subscription Plans</h1>
          <p style={{ color: '#71717a', fontSize: '0.85rem', margin: '4px 0 0' }}>
            Manage pricing, features, and limits for each plan
          </p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={openCreate}>
          <Icon icon="lucide:plus" /> New Plan
        </button>
      </div>

      {showForm && (
        <div className="glass-card" style={{ marginBottom: 24, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#f4f4f5' }}>
            {editing ? 'Edit Plan' : 'Create New Plan'}
          </h3>

          {error && <div className="glass-alert glass-alert-error" style={{ marginBottom: 12 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
              <div className="glass-input-group">
                <label>Trial Days</label>
                <input type="number" min="0" value={form.trial_days} onChange={(e) => handleChange('trial_days', e.target.value)} className="glass-input" />
              </div>
              <div className="glass-input-group">
                <label>Sort Order</label>
                <input type="number" min="0" value={form.sort_order} onChange={(e) => handleChange('sort_order', e.target.value)} className="glass-input" />
              </div>
              <div className="glass-input-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 16, paddingBottom: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#d4d4d8' }}>
                  <input type="checkbox" checked={form.is_active} onChange={(e) => handleChange('is_active', e.target.checked)} style={{ accentColor: '#6366f1' }} />
                  Active
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: '#d4d4d8' }}>
                  <input type="checkbox" checked={form.is_public} onChange={(e) => handleChange('is_public', e.target.checked)} style={{ accentColor: '#6366f1' }} />
                  Public
                </label>
              </div>
            </div>

            <div className="glass-input-group" style={{ marginTop: 12 }}>
              <label>Features</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input type="text" value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} className="glass-input" placeholder="Add a feature" style={{ flex: 1 }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                />
                <button type="button" className="glass-btn glass-btn-sm" onClick={addFeature}>Add</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {form.features.map((f, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 8,
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                    fontSize: '0.78rem', color: '#a5b4fc',
                  }}>
                    {f}
                    <button type="button" onClick={() => removeFeature(i)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
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
          <Icon icon="lucide:package" style={{ fontSize: '2rem', color: '#52525b', marginBottom: 12 }} />
          <p style={{ color: '#71717a' }}>No plans yet. Create your first plan.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {plans.map((plan) => {
            const features = plan.features ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features) : [];
            return (
              <div key={plan.id} className="glass-card" style={{
                padding: 24,
                opacity: plan.is_active ? 1 : 0.5,
                border: !plan.is_active ? '1px dashed rgba(255,255,255,0.1)' : undefined,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f4f4f5' }}>{plan.name}</h3>
                      {!plan.is_public && (
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 6, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>Hidden</span>
                      )}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#71717a' }}>{plan.description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => toggleActive(plan)} className="glass-btn glass-btn-sm glass-btn-ghost" title={plan.is_active ? 'Deactivate' : 'Activate'}>
                      <Icon icon={plan.is_active ? 'lucide:eye' : 'lucide:eye-off'} />
                    </button>
                    <button onClick={() => togglePublic(plan)} className="glass-btn glass-btn-sm glass-btn-ghost" title={plan.is_public ? 'Hide from public' : 'Show publicly'}>
                      <Icon icon={plan.is_public ? 'lucide:globe' : 'lucide:globe-lock'} />
                    </button>
                    <button onClick={() => openEdit(plan)} className="glass-btn glass-btn-sm glass-btn-ghost">
                      <Icon icon="lucide:pencil" />
                    </button>
                    <button onClick={() => handleDelete(plan)} className="glass-btn glass-btn-sm glass-btn-ghost" style={{ color: '#f87171' }}>
                      <Icon icon="lucide:trash-2" />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f4f4f5' }}>
                      {plan.price_monthly === 0 ? 'Free' : `${plan.currency === 'EGP' ? 'E£' : plan.currency === 'EUR' ? '€' : plan.currency === 'GBP' ? '£' : '$'}${plan.price_monthly}`}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yearly</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f4f4f5' }}>
                      {plan.price_yearly === 0 ? 'Free' : `${plan.currency === 'EGP' ? 'E£' : plan.currency === 'EUR' ? '€' : plan.currency === 'GBP' ? '£' : '$'}${plan.price_yearly}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16, fontSize: '0.78rem', color: '#a1a1aa' }}>
                  <span><Icon icon="lucide:users" style={{ fontSize: '0.7rem', marginRight: 4 }} />{plan.max_employees >= 9999 ? 'Unlimited' : plan.max_employees} employees</span>
                  <span><Icon icon="lucide:clock" style={{ fontSize: '0.7rem', marginRight: 4 }} />{plan.trial_days}d trial</span>
                </div>

                {features.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                    {features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: '0.78rem', color: '#a1a1aa' }}>
                        <Icon icon="lucide:check" style={{ fontSize: '0.65rem', color: '#22c55e' }} />
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
