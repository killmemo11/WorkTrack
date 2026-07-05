// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import hrApi from '../../../shared/api/hrApi';


const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AdminReports() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    setLoading(true);
    setError('');
    hrApi.get(`/report/monthly?year=${year}&month=${month}`)
      .then((res) => setData(res.data))
      .catch((err) => { console.error(err); setError('Failed to load report data'); })
      .finally(() => setLoading(false));
  }, [year, month]);

  const downloadReport = async (endpoint, filename) => {
    try {
      const params = {};
      if (fromDate) params.date_from = fromDate;
      if (toDate) params.date_to = toDate;
      const res = await hrApi.get(endpoint, { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); setError('Failed to export'); }
  };

  const exportAttendance = () => downloadReport('/reports/attendance', `attendance_${year}_${month}.xlsx`);
  const exportLeaves = () => downloadReport('/reports/leaves', `leaves_${year}_${month}.xlsx`);
  const exportKayan = () => downloadReport('/reports/kayan', `kayan_${year}_${month}.xlsx`);
  const exportSummary = () => {
    if (!fromDate || !toDate) { setError('Please select From and To dates first'); return; }
    downloadReport('/reports/summary', `summary_${year}_${month}.xlsx`);
  };

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  return (
      <div className="page">
        <div className="glass-page-header">
          <div>
            <h1>Monthly Report</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Per-employee attendance summary</p>
          </div>
          <div className="filter-actions" style={{alignItems:'center'}}>
            <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={prevMonth}><Icon icon="lucide:chevron-left" /> Prev</button>
            <strong style={{ minWidth: 180, textAlign: 'center', fontSize:'1.05rem', color: 'var(--text-primary)' }}>{MONTHS[month - 1]} {year}</strong>
            <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={nextMonth}>Next <Icon icon="lucide:chevron-right" /></button>
          </div>
        </div>

        {loading && <div className="glass-loading"><div className="spinner"/><span>Loading...</span></div>}
        {error && <div className="glass-alert glass-alert-danger">{error}</div>}
        {!loading && data && (
          <>
            <div className="glass-grid" style={{ marginBottom: 20 }}>
              <div className="glass-card card-hover fade-in-up" style={{ padding: '20px 24px', textAlign: 'center' }}>
                <div className="stat-number" style={{color:'var(--brand-primary)', fontSize:'1.75rem', fontWeight:700}}>{data.summary.total_employees}</div>
                <div className="stat-label" style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: 4 }}>Total Employees</div>
              </div>
              <div className="glass-card card-hover fade-in-up" style={{ padding: '20px 24px', textAlign: 'center' }}>
                <div className="stat-number" style={{ color: 'var(--success)', fontSize:'1.75rem', fontWeight:700 }}>{data.summary.active_employees}</div>
                <div className="stat-label" style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: 4 }}>Active This Month</div>
              </div>
              <div className="glass-card card-hover fade-in-up" style={{ padding: '20px 24px', textAlign: 'center' }}>
                <div className="stat-number" style={{color:'var(--brand-primary)', fontSize:'1.75rem', fontWeight:700 }}>{data.summary.total_hours}</div>
                <div className="stat-label" style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: 4 }}>Total Hours</div>
              </div>
              <div className="glass-card card-hover fade-in-up" style={{ padding: '20px 24px', textAlign: 'center' }}>
                <div className="stat-number" style={{ color: 'var(--warning)', fontSize:'1.75rem', fontWeight:700 }}>{data.summary.total_days}</div>
                <div className="stat-label" style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: 4 }}>Total Attendance Days</div>
              </div>
            </div>

              <div className="glass-summary-bar">
                <span style={{ color: 'var(--text-dim)' }}>Employees with records: <strong>{data.summary.active_employees}</strong></span>
                <span style={{ color: 'var(--text-dim)' }}>Attendance rate: <strong>
                  {data.summary.total_employees > 0
                    ? Math.round((data.summary.active_employees / data.summary.total_employees) * 100)
                    : 0}%
                </strong></span>
                <span style={{ color: 'var(--text-dim)', borderLeft:'1px solid var(--border-glass)',paddingLeft:20,marginLeft:4 }}>Total Absences: <strong>{data.report.reduce((s, r) => s + (r.absence_days || 0), 0)}</strong></span>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', padding: '16px 0', borderBottom: '1px solid var(--border-glass)', marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="glass-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>From</label>
                  <input type="date" className="glass-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="glass-form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>To</label>
                  <input type="date" className="glass-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <button className="glass-btn glass-btn-ghost" onClick={exportAttendance}><Icon icon="lucide:download" /> Excel: Attendance</button>
                <button className="glass-btn glass-btn-ghost" onClick={exportKayan}><Icon icon="lucide:download" /> Excel: Kayan</button>
                <button className="glass-btn glass-btn-ghost" onClick={exportLeaves}><Icon icon="lucide:download" /> Excel: Leaves</button>
                <button className="glass-btn glass-btn-primary" onClick={exportSummary}><Icon icon="lucide:download" /> Excel: Summary</button>
              </div>

            <div className="glass-table-wrapper">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th style={{width:40}}>#</th>
                    <th>Employee</th>
                    <th>Emp ID</th>
                    <th>Days Worked</th>
                    <th>Absence Days</th>
                    <th>WFH Days</th>
                    <th>Office Days</th>
                    <th>Total Hours</th>
                    <th>Avg / Day</th>
                    <th>Missing Sign-Outs</th>
                  </tr>
                </thead>
                <tbody>
                    {data.report.length === 0 ? (
                      <tr><td colSpan={10}><div className="glass-empty"><Icon icon="lucide:inbox" style={{fontSize:40,opacity:0.3}} /><h3>No employees found</h3><p>No data available for this period.</p></div></td></tr>
                    ) : (
                      data.report.map((emp, i) => (
                        <tr key={emp.id} className={emp.days_worked === 0 ? 'row-inactive' : ''}>
                          <td className="cell-mono">{i + 1}</td>
                          <td><strong>{emp.name}</strong></td>
                          <td className="cell-mono">{emp.employee_id || '—'}</td>
                          <td><strong>{emp.days_worked}</strong></td>
                          <td>{emp.absence_days > 0 ? <span className="glass-badge glass-badge-default">{emp.absence_days}</span> : '—'}</td>
                          <td><span className="glass-badge glass-badge-info">{emp.wfh_days || 0}</span></td>
                          <td><span className="glass-badge glass-badge-primary">{emp.office_days || 0}</span></td>
                          <td className="cell-mono">{emp.total_hours}h</td>
                          <td className="cell-mono">{emp.avg_hours_per_day}h</td>
                          <td>{emp.missing_sign_outs > 0 ? <span className="glass-badge glass-badge-warning">{emp.missing_sign_outs}</span> : '—'}</td>
                        </tr>
                      ))
                    )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
   
  );
}
