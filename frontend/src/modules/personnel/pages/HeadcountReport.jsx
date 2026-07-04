import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';

function ProgressBar({ filled, max }) {
  if (max === 0) return <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Unlimited</span>;
  const pct = Math.round((filled / max) * 100);
  const overLimit = filled > max;
  return (
    <div className="stat-bar" style={{ height: 6, borderRadius: 3, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
      <div className="stat-bar-fill" style={{
        width: `${overLimit ? 100 : pct}%`,
        height: '100%',
        borderRadius: 3,
        background: overLimit ? 'var(--color-danger)' : pct >= 90 ? 'var(--color-warning)' : 'var(--color-success)',
        transition: 'width .3s ease',
      }} />
    </div>
  );
}

function formatHC(n) {
  if (n == null || n === 0) return '\u221E';
  return n;
}

export default function HeadcountReport() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    hrApi.get('/reports/headcount').then(r => setReport(r.data)).catch(() => {});
  }, []);

  if (!report) return <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>;

  const { byDepartment, byTitle, byContract, summary } = report;

  return (
    <>
      <div className="glass-page-header">
        <h2><span className="iconify" data-icon="lucide:bar-chart-3" style={{ marginRight: 8 }} />Headcount Report</h2>
      </div>

      {summary && (
        <div className="glass-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
          {[
            { label: 'Total Departments', value: summary.total_depts, icon: 'lucide:building-2', class: 'gradient-purple' },
            { label: 'Max Headcount', value: summary.total_max, icon: 'lucide:users', class: 'gradient-blue' },
            { label: 'Filled', value: summary.total_filled, icon: 'lucide:user-check', class: 'gradient-green' },
            { label: 'Vacant', value: summary.total_vacant, icon: 'lucide:user-x', class: 'gradient-amber' },
            { label: 'Full Departments', value: summary.full_depts, icon: 'lucide:alert-circle', class: 'gradient-red' },
          ].map(s => (
            <div key={s.label} className={`glass-stat-card ${s.class} card-hover fade-in-up`}>
              <div className="stat-icon"><span className="iconify" data-icon={s.icon} /></div>
              <div className="stat-number">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card card-hover fade-in-up" style={{ marginBottom: 24 }}>
        <div className="glass-card-header">
          <h3><span className="iconify" data-icon="lucide:git-branch" style={{ marginRight: 8 }} />By Department</h3>
        </div>
        <div className="glass-card-body" style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead><tr><th>Department</th><th>Filled</th><th>Max</th><th>Vacant</th><th>Usage</th></tr></thead>
            <tbody>
              {byDepartment.map(d => {
                const pct = d.max_headcount > 0 ? Math.round((d.count / d.max_headcount) * 100) : null;
                return (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td>
                    <td>{d.count}</td>
                    <td>{formatHC(d.max_headcount)}</td>
                    <td style={{ color: d.vacant === 0 && d.max_headcount > 0 ? 'var(--color-danger)' : 'inherit' }}>
                      {d.vacant != null ? d.vacant : '\u221E'}
                    </td>
                    <td style={{ minWidth: 140 }}>
                      {pct != null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ProgressBar filled={d.count} max={d.max_headcount} />
                          <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{pct}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card card-hover fade-in-up" style={{ marginBottom: 24 }}>
        <div className="glass-card-header">
          <h3><span className="iconify" data-icon="lucide:badge-check" style={{ marginRight: 8 }} />By Title</h3>
        </div>
        <div className="glass-card-body" style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead><tr><th>Title</th><th>Department</th><th>Filled</th><th>Max</th><th>Vacant</th></tr></thead>
            <tbody>
              {byTitle.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.title}</strong></td>
                  <td>{t.department_name}</td>
                  <td>{t.count}</td>
                  <td>{formatHC(t.max_headcount)}</td>
                  <td style={{ color: t.vacant === 0 && t.max_headcount > 0 ? 'var(--color-danger)' : 'inherit' }}>
                    {t.vacant != null ? t.vacant : '\u221E'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card card-hover fade-in-up">
        <div className="glass-card-header">
          <h3><span className="iconify" data-icon="lucide:file-text" style={{ marginRight: 8 }} />By Contract Type</h3>
        </div>
        <div className="glass-card-body">
          <table className="glass-table">
            <thead><tr><th>Contract Type</th><th>Count</th></tr></thead>
            <tbody>
              {byContract.map(c => (
                <tr key={c.contract_type}><td>{c.contract_type}</td><td><strong>{c.count}</strong></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
