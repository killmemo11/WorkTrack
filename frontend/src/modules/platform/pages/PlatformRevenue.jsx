// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import platformApi from '../../../shared/api/platformApi';

const STATUS_COLORS = {
  verified: '#22c55e',
  pending: '#f59e0b',
  rejected: '#ef4444',
};

export default function PlatformRevenue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    platformApi.get('/revenue')
      .then(res => setData(res.data))
      .catch(e => setError(e.response?.data?.error || e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (n) => {
    if (!n && n !== 0) return '0';
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const formatMonth = (m) => {
    if (!m) return '';
    const [y, mo] = m.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(mo) - 1]} ${y}`;
  };

  if (loading) return <div className="glass-loading"><div className="spinner" /><span>Loading analytics...</span></div>;
  if (error) return <div className="glass-alert glass-alert-error">{error}</div>;
  if (!data) return null;

  const { summary, monthly, topTenants, recentPayments, byMethod, byPlan } = data;
  const maxMonthly = Math.max(...(monthly || []).map(m => Number(m.revenue) || 0), 1);

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Revenue Analytics</h1>
          <p>Track earnings, payment trends, and top tenants</p>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="platform-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 24 }}>
        <div className="glass-card platform-stat-card">
          <div className="platform-stat-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
            <Icon icon="lucide:trending-up" size={20} />
          </div>
          <div className="platform-stat-content">
            <span className="platform-stat-value">{formatCurrency(summary.total_revenue)}</span>
            <span className="platform-stat-label">Total Revenue ({summary.total_transactions > 0 ? (data.recentPayments[0]?.currency || 'EGP') : 'EGP'})</span>
          </div>
        </div>
        <div className="glass-card platform-stat-card">
          <div className="platform-stat-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
            <Icon icon="lucide:check-circle" size={20} />
          </div>
          <div className="platform-stat-content">
            <span className="platform-stat-value">{formatCurrency(summary.verified_revenue)}</span>
            <span className="platform-stat-label">Verified Revenue</span>
          </div>
        </div>
        <div className="glass-card platform-stat-card">
          <div className="platform-stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
            <Icon icon="lucide:calculator" size={20} />
          </div>
          <div className="platform-stat-content">
            <span className="platform-stat-value">{formatCurrency(summary.avg_per_verified)}</span>
            <span className="platform-stat-label">Avg per Verified</span>
          </div>
        </div>
        <div className="glass-card platform-stat-card">
          <div className="platform-stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <Icon icon="lucide:clock" size={20} />
          </div>
          <div className="platform-stat-content">
            <span className="platform-stat-value">{summary.pending_count || 0}</span>
            <span className="platform-stat-label">Pending Payments</span>
          </div>
        </div>
        <div className="glass-card platform-stat-card">
          <div className="platform-stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
            <Icon icon="lucide:receipt" size={20} />
          </div>
          <div className="platform-stat-content">
            <span className="platform-stat-value">{summary.total_transactions || 0}</span>
            <span className="platform-stat-label">Total Transactions</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* ── Monthly Revenue Chart ── */}
        <div className="glass-card" style={{ padding: 24, gridColumn: monthly.length > 6 ? '1 / -1' : undefined }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="lucide:bar-chart-3" size={18} /> Monthly Revenue
          </h3>
          {monthly.length === 0 ? (
            <div className="platform-empty-state small"><p>No payment data yet</p></div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 200, padding: '0 8px' }}>
              {[...monthly].reverse().map((m, i) => {
                const rev = Number(m.revenue) || 0;
                const pct = maxMonthly > 0 ? (rev / maxMonthly) * 100 : 0;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.65rem', color: '#a1a1aa', fontWeight: 600 }}>{formatCurrency(rev)}</span>
                    <div style={{
                      width: '100%', maxWidth: 48, borderRadius: 6, transition: 'height 0.3s',
                      height: `${Math.max(pct, 4)}%`,
                      background: `linear-gradient(180deg, #6366f1, #818cf8)`,
                      position: 'relative',
                    }}>
                      <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', fontSize: '0.6rem', color: '#71717a', whiteSpace: 'nowrap' }}>
                        {m.verified}/{m.transactions}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.6rem', color: '#52525b', whiteSpace: 'nowrap' }}>{formatMonth(m.month)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* ── By Payment Method ── */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="lucide:wallet" size={18} /> By Payment Method
          </h3>
          {byMethod.length === 0 ? (
            <div className="platform-empty-state small"><p>No data</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {byMethod.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{m.payment_method || 'Unknown'}</span>
                    <span style={{ fontSize: '0.75rem', color: '#71717a', marginLeft: 8 }}>{m.count} tx</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.9rem' }}>{formatCurrency(m.total)} EGP</div>
                    <div style={{ fontSize: '0.7rem', color: '#71717a' }}>{m.verified} verified</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── By Plan ── */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="lucide:layers" size={18} /> Revenue by Plan
          </h3>
          {byPlan.length === 0 ? (
            <div className="platform-empty-state small"><p>No data</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {byPlan.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>{p.plan || 'Unknown'}</span>
                    <span style={{ fontSize: '0.75rem', color: '#71717a', marginLeft: 8 }}>{p.count} tenants</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.9rem' }}>{formatCurrency(p.total)} EGP</div>
                    <div style={{ fontSize: '0.7rem', color: '#71717a' }}>avg {formatCurrency(p.avg_amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* ── Top Paying Tenants ── */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="lucide:crown" size={18} /> Top Paying Tenants
          </h3>
          {topTenants.length === 0 ? (
            <div className="platform-empty-state small"><p>No verified payments yet</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topTenants.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === 0 ? 'rgba(234,179,8,0.15)' : i === 1 ? 'rgba(156,163,175,0.15)' : i === 2 ? 'rgba(180,83,9,0.15)' : 'rgba(99,102,241,0.1)',
                    color: i === 0 ? '#eab308' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#818cf8',
                    fontWeight: 700, fontSize: '0.8rem',
                  }}>
                    #{i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.company_name || 'Unknown'}</div>
                    <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{t.payment_count} payments · {t.requested_plan}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#22c55e' }}>{formatCurrency(t.total_paid)} EGP</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Recent Payments ── */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="lucide:clock" size={18} /> Recent Payments
          </h3>
          {recentPayments.length === 0 ? (
            <div className="platform-empty-state small"><p>No payments yet</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentPayments.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: STATUS_COLORS[p.status] || '#71717a',
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.company_name || 'Unknown'}</div>
                    <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{formatDate(p.created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '0.85rem' }}>{formatCurrency(p.amount)} {p.currency}</div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase',
                      color: STATUS_COLORS[p.status] || '#71717a',
                    }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
