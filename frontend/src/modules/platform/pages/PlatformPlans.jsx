// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import platformApi from '../../../shared/api/platformApi';

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
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [featureInput, setFeatureInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    try {
      const res = await platformApi.get('/plans');
      setPlans(res.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const selectPlan = (idx) => {
    setActiveTab(idx);
    setEditing(false);
    setError('');
    if (idx < plans.length) {
      const plan = plans[idx];
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
    } else {
      setForm(defaultForm);
      setEditing(true);
    }
  };

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
      const isEdit = activeTab < plans.length;
      if (isEdit) {
        await platformApi.put(`/plans/${plans[activeTab].id}`, body);
      } else {
        await platformApi.post('/plans', body);
      }
      setEditing(false);
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
      await platformApi.delete(`/plans/${plan.id}`);
      setActiveTab(0);
      fetchPlans();
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete'); }
  };

  const toggleActive = async (plan) => {
    await platformApi.put(`/plans/${plan.id}`, { is_active: !plan.is_active });
    fetchPlans();
  };

  const togglePublic = async (plan) => {
    await platformApi.put(`/plans/${plan.id}`, { is_public: !plan.is_public });
    fetchPlans();
  };

  const formatCurrency = (amount, currency) => {
    if (amount === 0) return 'Free';
    const symbols = { USD: '$', EGP: 'E£', EUR: '€', GBP: '£', SAR: '﷼', AED: 'AED' };
    return `${symbols[currency] || currency}${amount}`;
  };

  const currentPlan = activeTab < plans.length ? plans[activeTab] : null;
  const currentFeatures = currentPlan
    ? (currentPlan.features ? (typeof currentPlan.features === 'string' ? JSON.parse(currentPlan.features) : currentPlan.features) : [])
    : [];

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Subscription Plans</h1>
          <p>Manage pricing, features, and limits for each plan</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-loading"><div className="spinner" /></div>
      ) : (
        <>
          <div className="platform-plan-tabs">
            {plans.map((plan, idx) => (
              <button
                key={plan.id}
                className={`platform-plan-tab ${activeTab === idx ? 'active' : ''} ${!plan.is_active ? 'inactive' : ''}`}
                onClick={() => selectPlan(idx)}
              >
                {plan.name}
                {!plan.is_active && <span className="platform-plan-tab-dot" />}
              </button>
            ))}
            <button
              className={`platform-plan-tab platform-plan-tab-add ${activeTab === plans.length ? 'active' : ''}`}
              onClick={() => selectPlan(plans.length)}
            >
              <Icon icon="lucide:plus" /> New
            </button>
          </div>

          <div className="platform-plan-tab-content glass-card">
            {activeTab < plans.length ? (
              editing ? (
                <form onSubmit={handleSubmit} className="platform-plan-edit-form">
                  <div className="platform-plan-edit-header">
                    <h3>Edit {currentPlan.name}</h3>
                    <div className="platform-plan-edit-actions">
                      <button type="submit" className="glass-btn glass-btn-primary glass-btn-sm" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                    </div>
                  </div>
                  {error && <div className="glass-alert glass-alert-error">{error}</div>}
                  <div className="platform-plans-form-grid">
                    <div className="glass-input-group">
                      <label>Plan Name</label>
                      <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required className="glass-input" />
                    </div>
                    <div className="glass-input-group">
                      <label>Slug</label>
                      <input type="text" value={form.slug} onChange={(e) => handleChange('slug', e.target.value)} required className="glass-input" pattern="[a-z0-9-]+" />
                    </div>
                  </div>
                  <div className="glass-input-group" style={{ marginTop: 12 }}>
                    <label>Description</label>
                    <input type="text" value={form.description} onChange={(e) => handleChange('description', e.target.value)} className="glass-input" />
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
                </form>
              ) : (
                <div className="platform-plan-detail">
                  <div className="platform-plan-detail-header">
                    <div>
                      <div className="platform-plan-name-row">
                        <h3>{currentPlan.name}</h3>
                        {!currentPlan.is_public && <span className="platform-plan-hidden-badge">Hidden</span>}
                        {!currentPlan.is_active && <span className="platform-plan-inactive-badge">Inactive</span>}
                      </div>
                      <p className="platform-plan-desc">{currentPlan.description}</p>
                    </div>
                    <div className="platform-plan-actions">
                      <button onClick={() => toggleActive(currentPlan)} className="glass-btn glass-btn-sm glass-btn-ghost" title={currentPlan.is_active ? 'Deactivate' : 'Activate'}>
                        <Icon icon={currentPlan.is_active ? 'lucide:eye' : 'lucide:eye-off'} />
                      </button>
                      <button onClick={() => togglePublic(currentPlan)} className="glass-btn glass-btn-sm glass-btn-ghost" title={currentPlan.is_public ? 'Hide' : 'Show'}>
                        <Icon icon={currentPlan.is_public ? 'lucide:globe' : 'lucide:globe-lock'} />
                      </button>
                      <button onClick={() => setEditing(true)} className="glass-btn glass-btn-sm glass-btn-ghost">
                        <Icon icon="lucide:pencil" /> Edit
                      </button>
                      <button onClick={() => handleDelete(currentPlan)} className="glass-btn glass-btn-sm glass-btn-danger">
                        <Icon icon="lucide:trash-2" />
                      </button>
                    </div>
                  </div>

                  <div className="platform-plan-pricing">
                    <div className="platform-plan-price-block">
                      <div className="platform-plan-price-label">Monthly</div>
                      <div className="platform-plan-price-value">{formatCurrency(currentPlan.price_monthly, currentPlan.currency)}</div>
                    </div>
                    <div className="platform-plan-price-block">
                      <div className="platform-plan-price-label">Yearly</div>
                      <div className="platform-plan-price-value">{formatCurrency(currentPlan.price_yearly, currentPlan.currency)}</div>
                    </div>
                    <div className="platform-plan-price-block">
                      <div className="platform-plan-price-label">Max Employees</div>
                      <div className="platform-plan-price-value">{currentPlan.max_employees >= 9999 ? 'Unlimited' : currentPlan.max_employees}</div>
                    </div>
                    <div className="platform-plan-price-block">
                      <div className="platform-plan-price-label">Trial</div>
                      <div className="platform-plan-price-value">{currentPlan.trial_days}d</div>
                    </div>
                  </div>

                  {currentFeatures.length > 0 && (
                    <div className="platform-plan-features">
                      <div className="platform-plan-features-title">Features</div>
                      <div className="platform-plan-features-grid">
                        {currentFeatures.map((f, i) => (
                          <div key={i} className="platform-plan-feature-item">
                            <Icon icon="lucide:check" className="check-icon" />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="platform-plan-create">
                <h3>Create New Plan</h3>
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
                    <input type="text" value={form.description} onChange={(e) => handleChange('description', e.target.value)} className="glass-input" placeholder="Short description" />
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
                      {saving ? 'Creating...' : 'Create Plan'}
                    </button>
                    <button type="button" className="glass-btn glass-btn-ghost" onClick={() => { setActiveTab(0); selectPlan(0); }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
