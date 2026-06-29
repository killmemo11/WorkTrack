// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useAuth } from '../../../shared/context/AuthContext';
import api from '../../../shared/api';
import { buildDashboardInsights } from './dashboardInsights';
import { buildDayDetailRows } from './dayDetailUtils';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const leaveTypeColors = { annual: '#4f46e5', sick: '#ef4444', casual: '#f59e0b', personal: '#8b5cf6', unpaid: '#6b7280' };
const leaveTypeLabels = { annual: 'A', sick: 'S', casual: 'C', personal: 'P', unpaid: 'U' };

const PIE_COLORS = { office: '#22c55e', wfh: '#3b82f6', absent: '#ef4444', holiday: '#f59e0b', leave: '#8b5cf6', off: '#d1d5db' };
const BAR_COLORS = { office: '#22c55e', wfh: '#3b82f6' };

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

function ElapsedTimer({ signInTime }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(signInTime).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(`${h}h ${m}m`);
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, [signInTime]);
  return <span className="elapsed-timer">{elapsed}</span>;
}

function LoadingSkeleton() {
  return (
    <div className="dashboard">
      <div className="skeleton-card" style={{ height: 100 }} />
      <div className="dashboard-stats-row">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-card" style={{ height: 100 }} />)}
      </div>
      <div className="dashboard-charts-row">
        <div className="skeleton-card" style={{ height: 200 }} />
        <div className="skeleton-card" style={{ height: 200 }} />
      </div>
    </div>
  );
}

function DashboardIcon({ name, size = 20, className = '' }) {
  const commonProps = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', className };

  switch (name) {
    case 'office':
      return (
        <svg {...commonProps}>
          <path d="M3 21h18" />
          <path d="M5 21V8l7-4 7 4v13" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );
    case 'wfh':
      return (
        <svg {...commonProps}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10.5V20h14v-9.5" />
          <path d="M9 20v-5h6v5" />
        </svg>
      );
    case 'absent':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 8 8 8" />
          <path d="m16 8-8 8" />
        </svg>
      );
    case 'holiday':
      return (
        <svg {...commonProps}>
          <path d="M5 4v16" />
          <path d="M19 4v16" />
          <path d="M5 8h14" />
          <path d="M8 4v4" />
          <path d="M16 4v4" />
          <path d="M8 12h8" />
        </svg>
      );
    case 'workday':
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
        </svg>
      );
    case 'leave':
      return (
        <svg {...commonProps}>
          <path d="M5 12c0-4 3-7 7-7 3.2 0 5.7 2.1 6.5 5" />
          <path d="M4 15c1.2 2.2 3.1 3.5 5.5 3.5 2.5 0 4.2-1.2 5.5-3.2" />
          <path d="M15 9h2" />
          <path d="M17 11h2" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
        </svg>
      );
    case 'history':
      return (
        <svg {...commonProps}>
          <path d="M8 6h10" />
          <path d="M8 12h10" />
          <path d="M8 18h6" />
          <path d="M4 6h.01" />
          <path d="M4 12h.01" />
          <path d="M4 18h.01" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...commonProps}>
          <path d="M12 3 2 20h20L12 3Z" />
          <path d="M12 9v5" />
          <path d="M12 16h.01" />
        </svg>
      );
    case 'check':
      return (
        <svg {...commonProps}>
          <path d="m5 12 4 4 10-10" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

export default function Dashboard() {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [signError, setSignError] = useState('');
  const [summary, setSummary] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [services, setServices] = useState({ service_wfh: '1', service_office_attendance: '1', service_leaves: '1' });
  const [selectedDay, setSelectedDay] = useState(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const canWfh = employee?.can_wfh !== 0;
  const hasSignInServices = (services.service_wfh === '1' && canWfh) || services.service_office_attendance === '1';

  if (employee?.role === 'ceo') {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
        <h2>You have C-Level access</h2>
        <p style={{ color: '#666', marginBottom: 24, fontSize: '1.1rem' }}>
          Visit Company Overview to view organization-wide analytics.
        </p>
        <a href="/ceo" className="btn btn-primary btn-lg">Go to Company Overview</a>
      </div>
    );
  }

  const fetchData = async () => {
    try {
      const [statusRes, summaryRes, calRes, svcRes] = await Promise.all([
        api.get('/attendance/status'),
        api.get('/attendance/monthly-summary'),
        api.get(`/attendance/calendar?year=${currentYear}&month=${currentMonth}`),
        api.get('/settings/public'),
      ]);
      setStatus(statusRes.data);
      setSummary(summaryRes.data);
      setCalendarData(calRes.data);
      setServices({
        service_wfh: svcRes.data.service_wfh ?? '1',
        service_office_attendance: svcRes.data.service_office_attendance ?? '1',
        service_leaves: svcRes.data.service_leaves ?? '1',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const signInWithLocation = (type) => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const body = {
            type,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          await api.post('/attendance/sign-in', body);
          await fetchData();
          setSignError('');
          setGpsError('');
        } catch (err) {
          const data = err.response?.data;
          if (data?.distance) {
            if (type === 'office') {
              setGpsError(`You are ${data.distance}m away from the office (max ${data.maxRadius}m). Move closer or sign in as WFH.`);
            } else {
              setGpsError(`You are within the office area (${data.distance}m). Please use Office sign-in.`);
            }
          } else {
            setSignError(data?.error || 'Failed to sign in');
          }
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        const messages = {
          1: 'Location permission denied. Allow location access in your browser settings.',
          2: 'Location unavailable. Try again or use WFH sign in.',
          3: 'Location request timed out. Make sure your browser has location access enabled (HTTPS required).',
        };
        setGpsError(messages[err.code] || 'Failed to get location.');
      },
      { timeout: 30000, maximumAge: 60000 }
    );
  };

  function buildCalendarGrid(monthDays) {
    const firstDay = new Date(monthDays[0].date + 'T00:00:00').getDay();
    const grid = [];
    let dayIndex = 0;
    for (let w = 0; w < 6; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        if ((w === 0 && d < firstDay) || dayIndex >= monthDays.length) {
          week.push(null);
        } else {
          week.push(monthDays[dayIndex] || null);
          dayIndex++;
        }
      }
      grid.push(week);
      if (dayIndex >= monthDays.length) break;
    }
    return grid;
  }

  const attendanceRate = summary?.total_work_days > 0
    ? Math.round(((summary.total_work_days - summary.absence_days) / summary.total_work_days) * 100)
    : 0;

  const pieData = useMemo(() => {
    if (!calendarData?.months) return [];
    let officeCount = 0, wfhCount = 0, absentCount = 0, holidayCount = 0, leaveCount = 0, offCount = 0;
    for (const m of calendarData.months) {
      for (const day of m.days) {
        if (!day.in_period) continue;
        if (day.is_off_day) { offCount++; continue; }
        if (day.is_holiday) { holidayCount++; continue; }
        if (day.leaves?.length > 0) { leaveCount++; continue; }
        if (day.type === 'office') officeCount++;
        else if (day.type === 'wfh') wfhCount++;
        else if (!day.is_future && !day.signed_in) absentCount++;
      }
    }
    const entries = [];
    if (officeCount) entries.push({ name: 'Office', value: officeCount, color: PIE_COLORS.office });
    if (wfhCount) entries.push({ name: 'WFH', value: wfhCount, color: PIE_COLORS.wfh });
    if (absentCount) entries.push({ name: 'Absent', value: absentCount, color: PIE_COLORS.absent });
    if (holidayCount) entries.push({ name: 'Holiday', value: holidayCount, color: PIE_COLORS.holiday });
    if (leaveCount) entries.push({ name: 'Leave', value: leaveCount, color: PIE_COLORS.leave });
    if (offCount) entries.push({ name: 'Off', value: offCount, color: PIE_COLORS.off });
    return entries;
  }, [calendarData]);

  const barData = useMemo(() => {
    if (!calendarData?.months) return [];
    return calendarData.months.map((m) => {
      let office = 0, wfh = 0;
      for (const day of m.days) {
        if (!day.in_period) continue;
        if (day.type === 'office') office++;
        if (day.type === 'wfh') wfh++;
      }
      return { name: monthNames[m.month - 1].slice(0, 3), office, wfh };
    });
  }, [calendarData]);

  const getDayClass = (day) => {
    let cls = 'cal-day cal-clickable';
    if (!day.in_period) cls += ' cal-outside-period';
    if (day.is_off_day) cls += ' cal-off';
    if (day.is_holiday) cls += ' cal-holiday';
    if (day.type === 'office') cls += ' cal-office';
    if (day.type === 'wfh') cls += ' cal-wfh';
    if (day.is_future) cls += ' cal-future';
    if (!day.signed_in && !day.is_off_day && !day.is_holiday && !day.is_future && day.in_period && day.leaves?.length === 0) cls += ' cal-absent';
    return cls;
  };

  const getDayDetails = (day) => {
    return buildDayDetailRows(day);
  };

  const quickActions = [
    ...(services.service_leaves !== '0' ? [{ label: 'Leave Requests', icon: '🏖️', path: '/leaves', color: '#4f46e5' }] : []),
    { label: 'Attendance Calendar', icon: '📅', path: '/calendar', color: '#22c55e' },
    { label: 'Attendance History', icon: '📋', path: '/history', color: '#3b82f6' },
    { label: 'Missing Sign-Out', icon: '⚠️', path: '/missing-signout', color: '#f59e0b' },
    { label: 'My Profile', icon: '👤', path: '/profile', color: '#8b5cf6' },
  ];

  const insights = useMemo(() => buildDashboardInsights({
    attendanceRate,
    presentDays: summary?.total_present || 0,
    totalWorkDays: summary?.total_work_days || 0,
    status,
    monthName: monthNames[now.getMonth()],
    leaveDays: summary?.leave_days || 0,
    absenceDays: summary?.absence_days || 0,
  }), [attendanceRate, summary, status, now]);

  if (loading) return <LoadingSkeleton />;

  return (
    <>
      <div className="dashboard">
        <div className="welcome-card">
          <h1>Welcome, {employee?.name}</h1>
          <p className="date">{today}</p>
        </div>

        {/* Status Card — primary action, shown right after welcome */}
        <div className="status-card">
          {!status?.signedIn ? (
            <div className="status-not-started">
              <div className="status-icon-badge status-pending">
                <DashboardIcon name="clock" size={28} />
              </div>
              <h2>Not Signed In</h2>
              <p>Start your work day</p>
              {signError && <div className="alert alert-error"><span>⚠️</span> {signError}</div>}
              {gpsError && <div className="alert alert-error"><span>⚠️</span> {gpsError}</div>}
              {hasSignInServices ? (
                <div className="signin-buttons">
                  {services.service_wfh === '1' && canWfh && (
                    <button onClick={() => signInWithLocation('wfh')} disabled={gpsLoading} className="btn btn-primary btn-lg">
                      {gpsLoading ? <><span className="spinner" /> Getting location...</> : '🏠 Sign In (WFH)'}
                    </button>
                  )}
                  {services.service_office_attendance === '1' && (
                    <button onClick={() => signInWithLocation('office')} disabled={gpsLoading} className="btn btn-outline btn-lg">
                      {gpsLoading ? <><span className="spinner" /> Getting location...</> : '🏢 Sign In (Office)'}
                    </button>
                  )}
                </div>
              ) : (
                <p className="no-service-msg">No attendance methods are currently enabled. Contact your administrator.</p>
              )}
            </div>
          ) : !status?.signedOut ? (
            <div className="status-active">
              {signError && <div className="alert alert-error" style={{ marginBottom: 16 }}><span>⚠️</span> {signError}</div>}
              <div className="status-icon-badge status-active-badge">
                <DashboardIcon name="check" size={28} />
              </div>
              <h2>Signed In <span className="status-type-badge">
                {(status.record.type || 'wfh').charAt(0).toUpperCase() + (status.record.type || 'wfh').slice(1)}
              </span></h2>
              <p className="signed-in-time">
                Signed in at: {new Date(status.record.sign_in_time).toLocaleTimeString()}
                <ElapsedTimer signInTime={status.record.sign_in_time} />
              </p>
              <div className="signout-form">
                <textarea
                  placeholder="Add notes for today (optional)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <div className="signout-footer">
                  <span className="char-count">{notes.length}/500</span>
                  <button onClick={async () => {
                    try {
                      await api.post('/attendance/sign-out', { notes });
                      await fetchData();
                      setNotes('');
                      setSignError('');
                    } catch (err) {
                      setSignError(err.response?.data?.error || 'Failed to sign out');
                    }
                  }} className="btn btn-danger btn-lg">
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="status-complete">
              <div className="status-icon-badge status-complete-badge">
                <DashboardIcon name="check" size={28} />
              </div>
              <h2>Day Complete</h2>
              {status.record.type && (
                <p style={{ fontSize: '0.9rem', color: '#666' }}>Type: {(status.record.type).charAt(0).toUpperCase() + status.record.type.slice(1)}</p>
              )}
              <p>Signed in: {new Date(status.record.sign_in_time).toLocaleTimeString()}</p>
              <p>Signed out: {new Date(status.record.sign_out_time).toLocaleTimeString()}</p>
              <p className="day-duration">
                Duration: {Math.round((new Date(status.record.sign_out_time) - new Date(status.record.sign_in_time)) / 3600000)}h
              </p>
            </div>
          )}
        </div>

        <div className="insights-grid">
          {insights.map((item) => (
            <div key={item.title} className={`insight-card insight-${item.tone}`}>
              <div className="insight-title">{item.title}</div>
              <div className="insight-value">{item.value}</div>
              <div className="insight-detail">{item.detail}</div>
            </div>
          ))}
        </div>

        <div className="dashboard-stats-row">
          {[
            { key: 'office_days', label: 'Office Days', cls: 'stat-office', icon: '🏢', path: '/history' },
            { key: 'wfh_days', label: 'WFH Days', cls: 'stat-wfh', icon: '🏠', path: '/history' },
            { key: 'absence_days', label: 'Absence Days', cls: 'stat-absent', icon: '❌', path: '/history' },
            { key: 'holidays_count', label: 'Public Holidays', cls: 'stat-holiday', icon: '🎉', path: null },
            { key: 'total_work_days', label: 'Work Days', cls: 'stat-total', icon: '📅', path: null },
          ].map((s) => (
            <div key={s.key} className={`mini-stat-card ${s.cls} ${s.path ? 'clickable-stat' : ''}`}
              onClick={() => s.path && navigate(s.path)} title={s.path ? `View ${s.label}` : ''}>
              <div className="mini-stat-icon">
                {s.key === 'office_days' && <DashboardIcon name="office" size={18} />}
                {s.key === 'wfh_days' && <DashboardIcon name="wfh" size={18} />}
                {s.key === 'absence_days' && <DashboardIcon name="absent" size={18} />}
                {s.key === 'holidays_count' && <DashboardIcon name="holiday" size={18} />}
                {s.key === 'total_work_days' && <DashboardIcon name="workday" size={18} />}
              </div>
              <div className="mini-stat-number">
                {summary ? <AnimatedNumber value={summary[s.key] || 0} /> : 0}
              </div>
              <div className="mini-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="dashboard-charts-row">
          <div className="chart-card">
            <h3 className="chart-title">
              Attendance Rate
              <span className={`rate-badge ${attendanceRate >= 90 ? 'rate-good' : attendanceRate >= 75 ? 'rate-ok' : 'rate-bad'}`}>
                {attendanceRate}%
              </span>
            </h3>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${attendanceRate}%`, background: attendanceRate >= 90 ? '#22c55e' : attendanceRate >= 75 ? '#f59e0b' : '#ef4444' }} />
            </div>
            <p className="progress-label">
              {summary?.total_work_days - summary?.absence_days || 0} present out of {summary?.total_work_days || 0} work days
            </p>
          </div>

          <div className="chart-card">
            <h3 className="chart-title">This Month</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="empty-chart">No data yet</p>}
          </div>
        </div>

        {barData.length > 1 && (
          <div className="chart-card" style={{ padding: 24 }}>
            <h3 className="chart-title">Monthly Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData} barGap={4}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="office" name="Office" fill={BAR_COLORS.office} radius={[4, 4, 0, 0]} />
                <Bar dataKey="wfh" name="WFH" fill={BAR_COLORS.wfh} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="quick-actions-row">
          {quickActions.map((a) => (
            <div key={a.label} className="quick-action-card" style={{ borderLeftColor: a.color }}
              onClick={() => navigate(a.path)}>
              <span className="quick-action-icon">
                {a.label === 'Leave Requests' && <DashboardIcon name="leave" size={22} />}
                {a.label === 'Attendance Calendar' && <DashboardIcon name="calendar" size={22} />}
                {a.label === 'Attendance History' && <DashboardIcon name="history" size={22} />}
                {a.label === 'Missing Sign-Out' && <DashboardIcon name="alert" size={22} />}
                {a.label === 'My Profile' && <DashboardIcon name="profile" size={22} />}
              </span>
              <span className="quick-action-label">{a.label}</span>
            </div>
          ))}
        </div>

        {calendarData && (
          <div className="calendar-card">
            <div className="calendar-header">
              <h3>Attendance Calendar</h3>
              <span className="period-label">
                Period: {calendarData.date_from} → {calendarData.date_to}
              </span>
            </div>
            <div className="calendar-months">
              {calendarData.months.map((m) => {
                const grid = buildCalendarGrid(m.days);
                return (
                  <div key={`${m.year}-${m.month}`} className="calendar-month">
                    <h4>{monthNames[m.month - 1]} {m.year}</h4>
                    <table className="calendar-table">
                      <thead>
                        <tr>
                          {dayHeaders.map((h) => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {grid.map((week, wi) => (
                          <tr key={wi}>
                            {week.map((day, di) => {
                              if (!day) return <td key={di} className="cal-empty"></td>;
                              return (
                                <td key={di} className={getDayClass(day)} onClick={() => setSelectedDay(day)}>
                                  <span className="cal-day-number">{day.day}</span>
                                  {day.is_holiday && <span className="cal-label cal-label-holiday" title={day.holiday_name}>H</span>}
                                  {day.type === 'office' && <span className="cal-label cal-label-office">O</span>}
                                  {day.type === 'wfh' && <span className="cal-label cal-label-wfh">W</span>}
                                  {day.leaves?.map((lt, i) => (
                                    <span key={i} className="cal-label" style={{ background: leaveTypeColors[lt] || '#6b7280', color: '#fff', fontSize: '0.65rem' }}>
                                      {leaveTypeLabels[lt] || lt.charAt(0).toUpperCase()}
                                    </span>
                                  ))}
                                  {!day.signed_in && !day.is_off_day && !day.is_holiday && !day.is_future && day.in_period && day.leaves?.length === 0 && <span className="cal-label cal-label-absent">A</span>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            <div className="calendar-legend">
              <span><span className="legend-dot" style={{background:'#22c55e'}}></span> Office</span>
              <span><span className="legend-dot" style={{background:'#3b82f6'}}></span> WFH</span>
              <span><span className="legend-dot" style={{background:'#ef4444'}}></span> Absent</span>
              <span><span className="legend-dot" style={{background:'#f59e0b'}}></span> Holiday</span>
              <span><span className="legend-dot" style={{background:'#e5e7eb'}}></span> Off Day</span>
              <span><span className="legend-dot" style={{background:'#4f46e5'}}></span> Annual</span>
              <span><span className="legend-dot" style={{background:'#ef4444'}}></span> Sick</span>
              <span><span className="legend-dot" style={{background:'#f59e0b'}}></span> Casual</span>
            </div>
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="modal day-detail-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{monthNames[(selectedDay.month || parseInt(selectedDay.date?.split('-')[1])) - 1]} {selectedDay.day}, {selectedDay.year || selectedDay.date?.split('-')[0]}</h2>
            <table className="day-detail-table">
              <tbody>
                {getDayDetails(selectedDay).map((detail, i) => (
                  <tr key={i}>
                    <td>{detail.label}</td>
                    <td><strong>{detail.value}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setSelectedDay(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
