// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../../shared/api';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PIE_COLORS = { present: '#22c55e', leave: '#f59e0b', absent: '#ef4444' };
const DEPT_COLORS = ['#4f46e5', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function CEODashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/ceo/dashboard?year=${year}&month=${month}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year, month]);

  const todayStatusText = (emp) => {
    const t = emp.today;
    if (!t || t.status === 'off') return '-';
    if (t.status === 'on_leave') return { text: 'On Leave', cls: 'badge badge-warning' };
    if (t.status === 'signed_in') return { text: t.type === 'office' ? 'Office' : 'WFH', cls: `badge ${t.type === 'office' ? 'badge-active' : 'badge-info'}` };
    if (t.status === 'signed_out') return { text: 'Done', cls: 'badge badge-active' };
    if (t.status === 'absent') return { text: 'Absent', cls: 'badge badge-error' };
    return { text: '-', cls: 'badge' };
  };

  const roleLabel = (role) => {
    if (role === 'ceo') return 'C-Level';
    if (role === 'manager') return 'Manager';
    if (role === 'admin') return 'Admin';
    return 'Employee';
  };

  const pieData = useMemo(() => {
    if (!data?.summary) return [];
    return [
      { name: 'Present', value: data.summary.present_today, color: PIE_COLORS.present },
      { name: 'On Leave', value: data.summary.on_leave_today, color: PIE_COLORS.leave },
      { name: 'Absent', value: data.summary.absent_today, color: PIE_COLORS.absent },
    ].filter((d) => d.value > 0);
  }, [data]);

  const deptBarData = useMemo(() => {
    if (!data?.departments) return [];
    return data.departments.map((d, i) => ({
      name: d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name,
      present: d.today.present,
      leave: d.today.on_leave,
      absent: d.today.absent,
      rate: d.month.attendance_rate,
      fullName: d.name,
      color: DEPT_COLORS[i % DEPT_COLORS.length],
    }));
  }, [data]);

  if (loading) return <div className="loading" />;
  if (error) return <div className="page"><p className="empty" style={{color:'#ef4444'}}>{error}</p></div>;

  return (
    <div className="page">
      <div className="page-header ceo-hero-card card-glass card-animate">
        <div>
          <p className="manager-eyebrow">Executive Overview</p>
          <h1>Company Overview</h1>
          <p className="subtitle">C-Level dashboard — attendance & leave analytics</p>
        </div>
        <div className="ceo-select-group">
          <select className="form-control" value={month} onChange={(e) => setMonth(parseInt(e.target.value))} style={{ width: 'auto', minWidth: 140 }}>
            {monthNames.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select className="form-control" value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ width: 'auto', minWidth: 90 }}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {data && (
        <>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
            Showing data for <strong>{data.month.label}</strong>
            {data.is_current_month && <span> (up to today — <strong>{data.today}</strong>)</span>}
          </p>

          <div className="dashboard-stats-row">
            {[
              { key: 'total_employees', label: 'Total Employees', color: '#8b5cf6', icon: '👥' },
              { key: 'present_today', label: 'Present Today', color: '#22c55e', icon: '🟢' },
              { key: 'on_leave_today', label: 'On Leave Today', color: '#f59e0b', icon: '🏖️' },
              { key: 'absent_today', label: 'Absent Today', color: '#ef4444', icon: '❌' },
              { key: null, label: 'Attendance Rate', color: '#3b82f6', icon: '📊', value: data.summary.attendance_rate + '%' },
            ].map((s) => (
              <div key={s.label} className="mini-stat-card card-surface card-animate" style={{ borderTop: `3px solid ${s.color}` }}>
                <div className="mini-stat-icon">{s.icon}</div>
                <div className="mini-stat-number" style={{ color: s.color }}>{s.value ?? data.summary[s.key]}</div>
                <div className="mini-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="dashboard-charts-row">
            {pieData.length > 0 && (
              <div className="chart-card card-surface card-animate">
                <h3 className="chart-title">Today's Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '0.75rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {pieData.length > 0 && (
              <div className="chart-card card-surface card-animate">
                <h3 className="chart-title">
                  Overall Attendance Rate
                  <span className={`rate-badge ${data.summary.attendance_rate >= 90 ? 'rate-good' : data.summary.attendance_rate >= 75 ? 'rate-ok' : 'rate-bad'}`}>
                    {data.summary.attendance_rate}%
                  </span>
                </h3>
                <div className="progress-track" style={{ marginTop: 8, height: 16 }}>
                  <div className="progress-fill" style={{
                    width: `${data.summary.attendance_rate}%`,
                    background: data.summary.attendance_rate >= 90 ? '#22c55e' : data.summary.attendance_rate >= 75 ? '#f59e0b' : '#ef4444',
                  }} />
                </div>
                <p className="progress-label" style={{ marginTop: 8 }}>
                  {data.summary.present_today} present / {data.summary.total_employees} total employees
                </p>
              </div>
            )}
          </div>

          {deptBarData.length > 1 && (
            <div className="chart-card card-surface card-animate" style={{ padding: 24, marginBottom: 20 }}>
              <h3 className="chart-title">Department Comparison — Today</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deptBarData} barGap={4}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val, name) => [val, name.charAt(0).toUpperCase() + name.slice(1)]} />
                  <Bar dataKey="present" name="Present" fill={PIE_COLORS.present} radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="leave" name="On Leave" fill={PIE_COLORS.leave} radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="absent" name="Absent" fill={PIE_COLORS.absent} radius={[4, 4, 0, 0]} stackId="a" />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '0.75rem' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.departments.map((dept) => (
            <div key={dept.id} className="card card-surface card-animate" style={{ marginBottom: 20 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{dept.name}</h3>
                  {dept.manager && (
                    <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#666' }}>
                      👤 {dept.manager}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="mini-stat-badge" style={{ background: '#f0f0ff', color: '#4f46e5', border: '1px solid #e0e0ff' }}>
                    <strong>{dept.employee_count}</strong> employees
                  </span>
                  <span className="mini-stat-badge" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                    Today: <strong>{dept.today.present}</strong> present
                  </span>
                  <span className="mini-stat-badge" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                    <strong>{dept.today.on_leave}</strong> leave
                  </span>
                  <span className="mini-stat-badge" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                    <strong>{dept.today.absent}</strong> absent
                  </span>
                  <span className="mini-stat-badge" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                    Rate: <strong>{dept.month.attendance_rate}%</strong>
                  </span>
                  {dept.pending_leaves > 0 && (
                    <span className="mini-stat-badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                      Pending: <strong>{dept.pending_leaves}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="table-wrapper card-surface">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Today</th>
                      <th>Office</th>
                      <th>WFH</th>
                      <th>Ann/Cas</th>
                      <th>Attendance</th>
                      <th>Leave Days</th>
                      <th>Absence</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dept.employees.length === 0 && (
                      <tr><td colSpan={10} className="empty-state">No employees in this department.</td></tr>
                    )}
                    {dept.employees.map((emp) => {
                      const tStatus = todayStatusText(emp);
                      return (
                        <tr key={emp.id} style={{ background: emp.role === 'manager' || emp.role === 'ceo' ? '#f8fafc' : undefined }}>
                          <td><strong>{emp.name}</strong></td>
                          <td>
                            <span className={emp.role === 'ceo' ? 'badge badge-info' : emp.role === 'manager' ? 'badge badge-active' : 'badge'} style={{ fontSize: '0.75rem' }}>
                              {roleLabel(emp.role)}
                            </span>
                          </td>
                          <td>
                            {typeof tStatus === 'object' ? (
                              <span className={tStatus.cls} style={{ fontSize: '0.75rem' }}>{tStatus.text}</span>
                            ) : (
                              <span style={{ color: '#999' }}>{tStatus}</span>
                            )}
                          </td>
                          <td className="cell-mono">{emp.month.office_days}</td>
                          <td className="cell-mono">{emp.month.wfh_days}</td>
                          <td className="cell-mono">{emp.month.annual_casual_days || 0}</td>
                          <td className="cell-mono">{emp.month.attendance_days} / {emp.month.total_work_days}</td>
                          <td className="cell-mono">{emp.month.leave_days}</td>
                          <td className="cell-mono">{Math.max(0, emp.month.absence_days || 0)}</td>
                          <td>
                            <span style={{
                              color: emp.month.attendance_rate >= 90 ? '#22c55e' : emp.month.attendance_rate >= 75 ? '#f59e0b' : '#ef4444',
                              fontWeight: 600,
                            }}>
                              {emp.month.attendance_rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {data.departments.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              No employee data found.
            </div>
          )}
        </>
      )}
    </div>
  );
}
