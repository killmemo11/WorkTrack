// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../../shared/context/AuthContext';
import api from '../../../shared/api';
import hrApi from '../../../shared/api/hrApi';
import { formatManagerTime, getStatusBadgeClass } from './managerDashboardUtils';

const statusLabels = {
  signed_in: { label: 'Signed In', cls: 'badge-active' },
  signed_out: { label: 'Done', cls: 'badge' },
  absent: { label: 'Absent', cls: 'badge-inactive' },
  leave: { label: 'On Leave', cls: 'badge-warning' },
  off_day: { label: 'Off Day', cls: 'badge' },
};

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 600;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { start = value; clearInterval(timer); }
      setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

function ManagerIcon({ name, size = 18 }) {
  const commonProps = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

  switch (name) {
    case 'team':
      return <svg {...commonProps}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="3" /><path d="M17 8a3 3 0 1 0 0 6" /><path d="M22 21v-2a3 3 0 0 0-2-2.8" /></svg>;
    case 'clock':
      return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'done':
      return <svg {...commonProps}><path d="m5 12 4 4 10-10" /></svg>;
    case 'leave':
      return <svg {...commonProps}><path d="M5 12c0-4 3-7 7-7 3.2 0 5.7 2.1 6.5 5" /><path d="M4 15c1.2 2.2 3.1 3.5 5.5 3.5 2.5 0 4.2-1.2 5.5-3.2" /><path d="M15 9h2" /><path d="M17 11h2" /></svg>;
    case 'alert':
      return <svg {...commonProps}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 9v5" /><path d="M12 16h.01" /></svg>;
    case 'approval':
      return <svg {...commonProps}><path d="M9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
    default:
      return <svg {...commonProps}><circle cx="12" cy="12" r="9" /></svg>;
  }
}

export default function ManagerDashboard() {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [headcountSummary, setHeadcountSummary] = useState(null);
  const [error, setError] = useState('');

  const fetchTeam = async () => {
    try {
      const [teamRes, hcRes] = await Promise.all([
        api.get('/manager/team'),
        hrApi.get('/reports/headcount').catch(() => null),
      ]);
      setData(teamRes.data);
      if (hcRes) setHeadcountSummary(hcRes.data.summary);
    } catch (err) {
      console.error(err);
      setError('Failed to load team data');
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const barData = useMemo(() => {
    if (!data?.team) return [];
    return data.team.map((m) => ({
      name: m.name.split(' ')[0],
      days: m.period_days_worked || 0,
    }));
  }, [data]);

  if (!data && !error) {
    return (
      <div className="page">
        <h1>My Team</h1>
        <div className="loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h1>My Team</h1>
        <p className="empty" style={{ color: '#ef4444' }}>{error}</p>
      </div>
    );
  }

  const { team, summary } = data;

  const presentRate = summary?.total_members > 0
    ? Math.round(((summary.signed_in + summary.signed_out) / summary.total_members) * 100)
    : 0;

  return (
    <div className="page manager-dashboard-page">
      <div className="manager-hero-card">
        <div>
          <p className="manager-eyebrow">Team Operations</p>
          <h1>My Team</h1>
          <p className="subtitle">{summary?.department_name || 'Department'} · Live overview of attendance and team activity</p>
        </div>
        <div className="manager-hero-badge">
          <ManagerIcon name="team" size={18} />
          <span>{summary?.total_members || 0} Members</span>
        </div>
      </div>

      {summary && (
        <>
          <div className="dashboard-stats-row manager-stats-row">
            {[
              { key: 'total_members', label: 'Team Members', color: '#8b5cf6', icon: 'team' },
              { key: 'signed_in', label: 'Signed In', color: '#22c55e', icon: 'clock' },
              { key: 'signed_out', label: 'Done', color: '#3b82f6', icon: 'done' },
              { key: 'on_leave', label: 'On Leave', color: '#f59e0b', icon: 'leave' },
              { key: 'absent', label: 'Absent', color: '#ef4444', icon: 'alert' },
            ].map((s) => (
              <div key={s.key} className="mini-stat-card manager-mini-card" style={{ borderTop: `3px solid ${s.color}` }}>
                <div className="mini-stat-icon" style={{ color: s.color, background: `${s.color}12` }}>
                  <ManagerIcon name={s.icon} size={16} />
                </div>
                <div className="mini-stat-number" style={{ color: s.color }}>
                  <AnimatedNumber value={summary[s.key] || 0} />
                </div>
                <div className="mini-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="dashboard-charts-row manager-charts-row">
            <div className="chart-card">
              <h3 className="chart-title">
                Team Attendance Rate
                <span className={`rate-badge ${presentRate >= 90 ? 'rate-good' : presentRate >= 75 ? 'rate-ok' : 'rate-bad'}`}>
                  {presentRate}%
                </span>
              </h3>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${presentRate}%`, background: presentRate >= 90 ? '#22c55e' : presentRate >= 75 ? '#f59e0b' : '#ef4444' }} />
              </div>
              <p className="progress-label">
                {summary.signed_in + summary.signed_out} present out of {summary.total_members} members
              </p>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">Today's Status</h3>
              <div className="manager-status-pills">
                {[
                  { label: 'Signed In', value: summary.signed_in, color: '#22c55e' },
                  { label: 'Done', value: summary.signed_out, color: '#3b82f6' },
                  { label: 'On Leave', value: summary.on_leave, color: '#f59e0b' },
                  { label: 'Absent', value: summary.absent, color: '#ef4444' },
                ].map((s) => (
                  <div key={s.label} className="mini-stat-badge" style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
                    <strong>{s.value}</strong> {s.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="manager-actions-grid">
            {[
              { label: 'Pending Approvals', icon: 'approval', path: '/manager/approvals', color: '#4f46e5' },
              { label: 'Team Overview', icon: 'team', path: '/manager/team', color: '#3b82f6' },
            ].map((a) => (
              <div key={a.label} className="manager-action-card" style={{ borderLeftColor: a.color }} onClick={() => navigate(a.path)}>
                <div className="manager-action-icon" style={{ color: a.color }}>
                  <ManagerIcon name={a.icon} size={18} />
                </div>
                <span>{a.label}</span>
              </div>
            ))}
          </div>

          {headcountSummary && (
            <div className="chart-card" style={{ marginTop: 20 }}>
              <h3 className="chart-title">Company Headcount</h3>
              <div className="dashboard-stats-row" style={{ marginBottom: 0, gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                  { label: 'Max', value: headcountSummary.total_max, color: '#3b82f6' },
                  { label: 'Filled', value: headcountSummary.total_filled, color: '#22c55e' },
                  { label: 'Vacant', value: headcountSummary.total_vacant, color: '#f59e0b' },
                  { label: 'Full Depts', value: headcountSummary.full_depts, color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} className="mini-stat-card" style={{ borderTop: `3px solid ${s.color}`, padding: '10px 12px' }}>
                    <div className="mini-stat-number" style={{ color: s.color, fontSize: 20 }}><AnimatedNumber value={s.value} /></div>
                    <div className="mini-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {barData.length > 1 && (
            <div className="chart-card manager-chart-card">
              <h3 className="chart-title">Period Work Days by Team Member</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barGap={4}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="days" name="Days Worked" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      <div className="table-wrapper manager-table-wrapper">
        <div className="table-header-row">
          <h3>Team Attendance List</h3>
          <span className="table-pill">{team?.length || 0} Records</span>
        </div>
        <table className="table manager-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Emp ID</th>
              <th>Today Status</th>
              <th>Sign In</th>
              <th>Sign Out</th>
              <th>Period Days</th>
              <th>Pending Leaves</th>
            </tr>
          </thead>
          <tbody>
            {team.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No team members found.</td></tr>
            )}
            {team.map((m) => {
              const st = statusLabels[m.today_status] || { label: m.today_status, cls: '' };
              return (
                <tr key={m.id}>
                  <td>
                    <div className="employee-cell">
                      <div className="employee-avatar">{m.name?.charAt(0)?.toUpperCase() || 'U'}</div>
                      <div>
                        <strong>{m.name}</strong>
                        <div className="employee-subtext">{m.department_name || 'Team Member'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cell-mono">{m.employee_id || '—'}</td>
                  <td>
                    <span className={getStatusBadgeClass(m.today_status)}>
                      {m.on_leave_type ? `${st.label} (${m.on_leave_type})` : st.label}
                    </span>
                  </td>
                  <td>{formatManagerTime(m.today_sign_in)}</td>
                  <td>{formatManagerTime(m.today_sign_out)}</td>
                  <td className="cell-mono">
                    {m.period_days_worked > 0 ? m.period_days_worked : '—'}
                  </td>
                  <td>
                    {m.pending_leave_count > 0 ? (
                      <span className="badge badge-warning">{m.pending_leave_count}</span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
