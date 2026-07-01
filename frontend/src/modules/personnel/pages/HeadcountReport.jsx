import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';

function ProgressBar({ filled, max }) {
  if (max === 0) return <span className="text-muted" style={{ fontSize: 13 }}>Unlimited</span>;
  const pct = Math.round((filled / max) * 100);
  const overLimit = filled > max;
  return (
    <div className="hc-progress-track">
      <div className="hc-progress-fill" style={{
        width: `${overLimit ? 100 : pct}%`,
        background: overLimit ? '#ef4444' : pct >= 90 ? '#f59e0b' : '#22c55e',
      }} />
      {overLimit && <span className="hc-over-icon">!</span>}
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

  if (!report) return <div className="loading">Loading...</div>;

  const { byDepartment, byTitle, byContract, summary } = report;

  return (
    <>
      <div className="page-header"><h2>Headcount Report</h2></div>

      {summary && (
        <div className="dashboard-stats-row" style={{ marginBottom: 20 }}>
          {[
            { label: 'Total Departments', value: summary.total_depts, color: '#8b5cf6' },
            { label: 'Max Headcount', value: summary.total_max, color: '#3b82f6' },
            { label: 'Filled', value: summary.total_filled, color: '#22c55e' },
            { label: 'Vacant', value: summary.total_vacant, color: '#f59e0b' },
            { label: 'Full Departments', value: summary.full_depts, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="mini-stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
              <div className="mini-stat-number" style={{ color: s.color }}>{s.value}</div>
              <div className="mini-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3>By Department</h3></div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Department</th><th>Filled</th><th>Max</th><th>Vacant</th><th>Usage</th></tr></thead>
            <tbody>
              {byDepartment.map(d => {
                const pct = d.max_headcount > 0 ? Math.round((d.count / d.max_headcount) * 100) : null;
                return (
                  <tr key={d.id}>
                    <td><strong>{d.name}</strong></td>
                    <td>{d.count}</td>
                    <td>{formatHC(d.max_headcount)}</td>
                    <td style={{ color: d.vacant === 0 && d.max_headcount > 0 ? '#ef4444' : 'inherit' }}>
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

      <div className="card">
        <div className="card-header"><h3>By Title</h3></div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Title</th><th>Department</th><th>Filled</th><th>Max</th><th>Vacant</th></tr></thead>
            <tbody>
              {byTitle.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.title}</strong></td>
                  <td>{t.department_name}</td>
                  <td>{t.count}</td>
                  <td>{formatHC(t.max_headcount)}</td>
                  <td style={{ color: t.vacant === 0 && t.max_headcount > 0 ? '#ef4444' : 'inherit' }}>
                    {t.vacant != null ? t.vacant : '\u221E'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>By Contract Type</h3></div>
        <div className="card-body">
          <table className="table">
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
