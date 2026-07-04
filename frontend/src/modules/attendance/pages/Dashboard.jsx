// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';
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

function AnimatedNumber({ value, duration = 600 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { start = value; clearInterval(timer); }
      setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
}

function ElapsedTimer({ signInTime }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(signInTime).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${h}h ${m}m ${s}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [signInTime]);
  return <span className="elapsed-timer">{elapsed}</span>;
}

function LoadingSkeleton() {
  return (
    <div className="dashboard">
      <div className="glass-skeleton" style={{ height: 140, borderRadius: '12px' }} />
      <div className="dashboard-top-grid">
        <div className="glass-skeleton" style={{ height: 280, borderRadius: '12px' }} />
        <div className="glass-skeleton" style={{ height: 280, borderRadius: '12px' }} />
      </div>
      <div className="dashboard-stats-row">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="glass-skeleton" style={{ height: 120, borderRadius: '12px' }} />)}
      </div>
      <div className="dashboard-charts-row">
        <div className="glass-skeleton" style={{ height: 240, borderRadius: '12px' }} />
        <div className="glass-skeleton" style={{ height: 240, borderRadius: '12px' }} />
      </div>
      <div className="dashboard-calendar">
        <div className="glass-skeleton" style={{ height: 320, borderRadius: '12px' }} />
      </div>
    </div>
  );
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
  const [refreshKey, setRefreshKey] = useState(0);

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
      <div className="glass-empty" style={{ paddingTop: 80 }}>
        <span className="iconify" data-icon="lucide:bar-chart-2" style={{ fontSize: 48, opacity: 0.3 }} />
        <h2>You have C-Level access</h2>
        <p>Visit Company Overview to view organization-wide analytics.</p>
        <button className="glass-btn glass-btn-primary" onClick={() => navigate('/ceo')}>
          <span className="iconify" data-icon="lucide:arrow-right" style={{ marginRight: 6 }} />
          Go to Company Overview
        </button>
      </div>
    );
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
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
      console.error('Error fetching data:', err);
      setSignError('Failed to load attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const signInWithLocation = async (type) => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 30000, maximumAge: 60000 });
      });
      
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
          setGpsError(`You are within the office area (${data.distance}m). Please use Office sign in.`);
        }
      } else {
        setSignError(data?.error || 'Failed to sign in');
      }
    } finally {
      setGpsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await api.post('/attendance/sign-out', { notes });
      await fetchData();
      setNotes('');
      setSignError('');
    } catch (err) {
      setSignError(err.response?.data?.error || 'Failed to sign out');
    }
  };

  function buildCalendarGrid(monthDays) {
    if (!monthDays || monthDays.length === 0) return [];
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

  const todayStr = new Date().toISOString().split('T')[0];
  const todayDow = now.getDay();
  const isWeekend = todayDow === 5 || todayDow === 6;
  const todayDay = calendarData?.months?.[0]?.days?.find(d => d.date === todayStr);
  const isHoliday = Boolean(isWeekend || todayDay?.is_off_day || todayDay?.is_holiday);
  const holidayName = todayDay?.holiday_name || '';
  const isMissingSignOut = (day) => day.signed_in && !day.signed_out && !day.is_future && day.date !== todayStr;

  const quickActions = [
    ...(services.service_leaves !== '0' ? [{ label: 'Leave Requests', icon: 'umbrella', path: '/leaves', color: '#4f46e5', meta: 'Submit or track' }] : []),
    { label: 'Attendance Calendar', icon: 'calendar', path: '/calendar', color: '#22c55e', meta: 'Plan your week' },
    { label: 'Attendance History', icon: 'clock', path: '/history', color: '#3b82f6', meta: 'Review records' },
    { label: 'Missing Sign-Out', icon: 'alert-triangle', path: '/missing-signout', color: '#f59e0b', meta: 'Resolve quickly' },
    { label: 'My Profile', icon: 'user', path: '/profile', color: '#8b5cf6', meta: 'Update details' },
  ];

  const insights = useMemo(() => buildDashboardInsights({
    attendanceRate,
    presentDays: summary?.total_present || 0,
    totalWorkDays: summary?.total_work_days || 0,
    status,
    monthName: monthNames[now.getMonth()],
    leaveDays: summary?.leave_days || 0,
    absenceDays: summary?.absence_days || 0,
    isHoliday,
    holidayName,
  }), [attendanceRate, summary, status, now, isHoliday, holidayName]);

  if (loading) return <LoadingSkeleton />;

  return (
    <>
      <div className="dashboard">
        <div className="welcome-card glass-card fade-in-up">
          <div className="welcome-card-content">
            <div>
              <div className="welcome-eyebrow">Today at a glance</div>
              <h1>Welcome back, {employee?.name}</h1>
              <p className="date">{today}</p>
              <p className="welcome-copy">Track attendance, keep requests moving, and stay focused on what matters today.</p>
            </div>
            <div className="welcome-actions">
              <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/calendar')}>View Calendar</button>
              <button className="glass-btn glass-btn-primary" onClick={() => navigate('/requests')}>Open Requests</button>
            </div>
          </div>
        </div>

        <div className="dashboard-top-grid">
          <div className="glass-card fade-in-up delay-1">
            {isHoliday ? (
              <div className="holiday-greeting">
                <div className="holiday-icon">🎉</div>
                <h2>Happy Holiday!</h2>
                <p>{holidayName || 'Enjoy your day off! 🎊'}</p>
                <p className="holiday-sub">No attendance tracking needed today</p>
              </div>
            ) : (
              <>
            {!status?.signedIn ? (
              <div className="status-not-started">
                <div className="status-icon-badge status-pending">
                  <span className="iconify" data-icon="lucide:clock" style={{ fontSize: 28 }} />
                </div>
                <h2>Not Signed In</h2>
                <p>Start your work day</p>
                {signError && <div className="glass-alert glass-alert-danger"><span className="iconify" data-icon="lucide:alert-triangle" style={{ marginRight: 6 }} /> {signError}</div>}
                {gpsError && <div className="glass-alert glass-alert-danger"><span className="iconify" data-icon="lucide:alert-triangle" style={{ marginRight: 6 }} /> {gpsError}</div>}
                {hasSignInServices ? (
                  <div className="signin-buttons">
                    {services.service_wfh === '1' && canWfh && (
                      <button onClick={() => signInWithLocation('wfh')} disabled={gpsLoading} className="glass-btn glass-btn-primary glass-btn-lg">
                        {gpsLoading ? <><span className="spinner" /> Getting location...</> : <><span className="iconify" data-icon="lucide:home" style={{ marginRight: 6 }} /> Sign In (WFH)</>}
                      </button>
                    )}
                    {services.service_office_attendance === '1' && (
                      <button onClick={() => signInWithLocation('office')} disabled={gpsLoading} className="glass-btn glass-btn-ghost glass-btn-lg">
                        {gpsLoading ? <><span className="spinner" /> Getting location...</> : <><span className="iconify" data-icon="lucide:building-2" style={{ marginRight: 6 }} /> Sign In (Office)</>}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="glass-empty" style={{ textAlign: 'center', padding: '12px 0' }}>
                    <p>No attendance methods are currently enabled. Contact your administrator.</p>
                  </div>
                )}
              </div>
            ) : !status?.signedOut ? (
              <div className="status-active">
                {signError && <div className="glass-alert glass-alert-danger" style={{ marginBottom: 16 }}><span className="iconify" data-icon="lucide:alert-triangle" style={{ marginRight: 6 }} /> {signError}</div>}
                <div className="status-icon-badge status-active-badge">
                  <span className="iconify" data-icon="lucide:check-circle" style={{ fontSize: 28 }} />
                </div>
                <h2>Signed In <span className="glass-badge glass-badge-success">
                  {(status.record.type || 'wfh').charAt(0).toUpperCase() + (status.record.type || 'wfh').slice(1)}
                </span></h2>
                <p className="signed-in-time">
                  Signed in at: {new Date(status.record.sign_in_time).toLocaleTimeString()}
                  <ElapsedTimer signInTime={status.record.sign_in_time} />
                </p>
                <div className="signout-form">
                  <textarea
                    className="glass-textarea"
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
                    }} className="glass-btn glass-btn-danger glass-btn-lg">
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="status-complete">
                <div className="status-icon-badge status-complete-badge">
                  <span className="iconify" data-icon="lucide:check-circle" style={{ fontSize: 28 }} />
                </div>
                <h2>Day Complete</h2>
                {status.record.type && (
                  <p className="glass-detail-row">Type: {(status.record.type).charAt(0).toUpperCase() + status.record.type.slice(1)}</p>
                )}
                <p className="glass-detail-row">Signed in: {new Date(status.record.sign_in_time).toLocaleTimeString()}</p>
                <p className="glass-detail-row">Signed out: {new Date(status.record.sign_out_time).toLocaleTimeString()}</p>
                <p className="day-duration">
                  Duration: {Math.round((new Date(status.record.sign_out_time) - new Date(status.record.sign_in_time)) / 3600000)}h
                </p>
              </div>
              )}
            </>
            )}
          </div>

          <div className="glass-card fade-in-up delay-1">
            <div className="glass-card-header">
              <div>
                <p className="focus-card-label">Your overview</p>
                <h3>Built for a smooth day</h3>
              </div>
              <span className="glass-badge glass-badge-success">Live</span>
            </div>
            <div className="focus-metrics">
              <div className="focus-metric">
                <span className="focus-metric-label">Attendance rate</span>
                <strong>{attendanceRate}%</strong>
              </div>
              <div className="focus-metric">
                <span className="focus-metric-label">Present days</span>
                <strong>{summary?.total_present || 0}</strong>
              </div>
              <div className="focus-metric">
                <span className="focus-metric-label">Leave days</span>
                <strong>{summary?.leave_days || 0}</strong>
              </div>
            </div>
            <div className="focus-actions">
              <button className="glass-btn glass-btn-ghost" style={{ width: '100%' }} onClick={() => navigate('/history')}>View History</button>
              <button className="glass-btn glass-btn-primary" style={{ width: '100%' }} onClick={() => navigate('/calendar')}>Open Calendar</button>
            </div>
          </div>
        </div>

        <div className="section-header">
          <div>
            <h3>Key metrics</h3>
            <p>Stay on top of the important numbers from one place.</p>
          </div>
        </div>

        <div className="glass-grid">
          {insights.map((item) => (
            <div key={item.title} className={`glass-stat-card insight-${item.tone}`}>
              <div className="glass-stat-label">{item.title}</div>
              <div className="glass-stat-number">{item.value}</div>
              <div className="insight-detail">{item.detail}</div>
            </div>
          ))}
        </div>

        <div className="stats-grid">
          {[
            { key: 'office_days', label: 'Office Days', cls: 'gradient-office', icon: 'building-2', path: '/history', caption: 'On-site attendance' },
            { key: 'wfh_days', label: 'WFH Days', cls: 'gradient-wfh', icon: 'home', path: '/history', caption: 'Remote days' },
            { key: 'absence_days', label: 'Absence Days', cls: 'gradient-absent', icon: 'x-circle', path: '/history', caption: 'Days missed' },
            { key: 'holidays_count', label: 'Public Holidays', cls: 'gradient-holiday', icon: 'calendar-days', path: null, caption: 'Holiday calendar' },
            { key: 'total_work_days', label: 'Work Days', cls: 'gradient-total', icon: 'calendar', path: null, caption: 'Scheduled days' },
          ].map((s) => (
            <div key={s.key} className={`stat-card ${s.cls}`}
              onClick={() => s.path && navigate(s.path)} title={s.path ? `View ${s.label}` : ''} style={{ cursor: s.path ? 'pointer' : 'default' }}>
              <span className="iconify stat-card-icon" data-icon={`lucide:${s.icon}`} />
              <div className="stat-value">
                {summary ? <AnimatedNumber value={summary[s.key] || 0} /> : 0}
              </div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-details">{s.caption}</div>
            </div>
          ))}
        </div>

        <div className="charts-grid">
          <div className="chart-card fade-in-up">
            {isHoliday ? (
              <div className="chart-card-header">
                <div>
                  <h3 className="chart-title">🎉 Holiday Time</h3>
                  <p className="chart-subtitle">Enjoy your well-deserved break</p>
                </div>
                <span className="glass-badge glass-badge-warning">Holiday! 🎉</span>
              </div>
            ) : (
              <>
                <div className="chart-card-header">
                  <div>
                    <h3 className="chart-title">Attendance Rate</h3>
                    <p className="chart-subtitle">Your consistency across the current month</p>
                  </div>
                  <span className={`glass-badge ${attendanceRate >= 90 ? 'glass-badge-success' : attendanceRate >= 75 ? 'glass-badge-warning' : 'glass-badge-danger'}`}>
                    {attendanceRate}%
                  </span>
                </div>
                <div className="stat-bar">
                  <div className="stat-bar-fill" style={{ width: `${attendanceRate}%`, background: attendanceRate >= 90 ? '#22c55e' : attendanceRate >= 75 ? '#f59e0b' : '#ef4444' }} />
                </div>
                <p className="progress-label">
                  {summary?.total_work_days - summary?.absence_days || 0} present out of {summary?.total_work_days || 0} work days
                </p>
              </>
            )}
          </div>

          <div className="chart-card fade-in-up">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-title">This Month</h3>
                <p className="chart-subtitle">A quick view of your attendance mix</p>
              </div>
            </div>
            {isHoliday ? (
              <div className="glass-empty" style={{ padding: '40px 0', textAlign: 'center' }}>
                <div className="holiday-greeting">
                  <div className="holiday-icon">🎉</div>
                  <h3>Happy Holiday!</h3>
                  <p>No attendance tracking today</p>
                </div>
              </div>
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={44}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="glass-empty" style={{ padding: '40px 0', textAlign: 'center' }}><p>No data yet</p></div>}
          </div>
        </div>

        {isHoliday ? (
          <div className="chart-card fade-in-up">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-title">Holiday Time! 🎉</h3>
                <p className="chart-subtitle">Enjoy your well-deserved break</p>
              </div>
            </div>
            <div className="chart-container" style={{ height: '260px', position: 'relative' }}>
              <div className="glass-empty" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div className="holiday-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                <h3>No work today!</h3>
                <p>Happy holiday!</p>
              </div>
            </div>
          </div>
        ) : barData.length > 1 && (
          <div className="chart-card fade-in-up">
            <div className="chart-card-header">
              <div>
                <h3 className="chart-title">Monthly Trend</h3>
                <p className="chart-subtitle">Office vs WFH attendance over the past 6 months</p>
              </div>
            </div>
            <div className="chart-container" style={{ height: '260px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barGap={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: '#94a3b8' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickMargin={10}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#94a3b8' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickMargin={5}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: 500 }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value, name) => {
                      const color = name === 'office' ? '#22c55e' : '#3b82f6';
                      return [`${value} days`, name];
                    }}
                  />
                  <Bar 
                    dataKey="office" 
                    name="Office" 
                    fill="#22c55e" 
                    radius={[8, 8, 0, 0]} 
                    animationDuration={500}
                  />
                  <Bar 
                    dataKey="wfh" 
                    name="WFH" 
                    fill="#3b82f6" 
                    radius={[8, 8, 0, 0]} 
                    animationDuration={500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="section-header">
          <div>
            <h3>Quick actions</h3>
            <p>Jump into the most useful tasks in a single click.</p>
          </div>
        </div>

        <div className="quick-actions-grid">
          {quickActions.map((a) => (
            <div 
              key={a.label} 
              className="quick-action-item glass-card card-hover fade-in-up" 
              style={{ 
                borderLeft: `4px solid ${a.color}`,
                transition: 'all 0.2s ease'
              }}
              onClick={() => navigate(a.path)}
            >
              <div className="quick-action-icon">
                <div className="quick-action-icon-bg" style={{ backgroundColor: a.color + '20' }}>
                  <span className="iconify" data-icon={`lucide:${a.icon}`} style={{ fontSize: 24, color: a.color }} />
                </div>
              </div>
              <div className="quick-action-content">
                <div className="quick-action-title">{a.label}</div>
                <div className="quick-action-description">{a.meta}</div>
              </div>
            </div>
          ))}
        </div>

        {calendarData && (
          <div className="glass-card fade-in-up" style={{ marginTop: '24px', borderRadius: '12px', overflow: 'hidden' }}>
            <div className="glass-card-header" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Attendance Calendar</h3>
              <span className="glass-badge glass-badge-default" style={{ fontSize: '0.85rem' }}>
                Period: {calendarData.date_from} → {calendarData.date_to}
              </span>
            </div>
            <div className="calendar-container" style={{ padding: '0' }}>
              <div className="calendar-months" style={{ padding: '0' }}>
                {calendarData.months.map((m) => {
                  const grid = buildCalendarGrid(m.days);
                  return (
                    <div key={`${m.year}-${m.month}`} className="calendar-month">
                      <h4 className="calendar-month-title" style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 600, 
                        padding: '16px 20px',
                        color: 'var(--text-primary)'
                      }}>
                        {monthNames[m.month - 1]} {m.year}
                      </h4>
                      <div className="calendar-table-wrapper" style={{ overflowX: 'auto' }}>
                        <table className="glass-calendar-table">
                          <thead>
                            <tr>
                              {dayHeaders.map((h) => (
                                <th key={h} className="calendar-header">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {grid.map((week, wi) => (
                              <tr key={wi}>
                                {week.map((day, di) => {
                                  if (!day) return <td key={di} className="cal-empty" style={{ padding: 0 }}></td>;
                                  return (
                                    <td 
                                      key={di} 
                                      className={getDayClass(day)} 
                                      onClick={() => setSelectedDay(day)}
                                      title={day.is_holiday ? day.holiday_name : day.leaves?.length > 0 ? `Leave: ${day.leaves.join(', ')}` : ''}
                                    >
                                      <div className="cal-day-content">
                                        <span className="cal-day-number">{day.day}</span>
                                        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                                          {day.is_holiday && (
                                            <span className="cal-label cal-label-holiday">H</span>
                                          )}
                                          {day.type === 'office' && (
                                            <span className={`cal-label ${day.signed_out ? 'cal-label-office' : 'cal-label-missing'}`}>
                                              {day.signed_out ? 'O' : '!'}
                                            </span>
                                          )}
                                          {day.type === 'wfh' && (
                                            <span className={`cal-label ${day.signed_out ? 'cal-label-wfh' : 'cal-label-missing'}`}>
                                              {day.signed_out ? 'W' : '!'}
                                            </span>
                                          )}
                                          {day.leaves?.map((lt, i) => (
                                            <span key={i} className="cal-label" style={{
                                              background: leaveTypeColors[lt] || '#6b7280',
                                              color: '#fff',
                                              fontSize: '0.6rem'
                                            }}>
                                              {leaveTypeLabels[lt] || lt.charAt(0).toUpperCase()}
                                            </span>
                                          ))}
                                          {!day.signed_in && !day.is_off_day && !day.is_holiday && !day.is_future && day.in_period && day.leaves?.length === 0 && (
                                            <span className="cal-label cal-label-absent">A</span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="calendar-legend" style={{ gap: 12 }}>
                <div className="legend-row">
                  <div className="legend-item">
                    <span className="legend-dot" style={{background:'#22c55e'}}></span>
                    <span>Office</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{background:'#3b82f6'}}></span>
                    <span>WFH</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{background:'#ef4444'}}></span>
                    <span>Absent</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{background:'#f59e0b'}}></span>
                    <span>Holiday</span>
                  </div>
                </div>
                <div className="legend-row">
                  <div className="legend-item">
                    <span className="legend-dot" style={{background:'#475569'}}></span>
                    <span>Off Day</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{background: '#450a0a', border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.6rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'}}>!</span>
                    <span>Missing Out</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{background:'#8b5cf6'}}></span>
                    <span>Annual</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{background:'#ef4444'}}></span>
                    <span>Sick</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="glass-modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{monthNames[(selectedDay.month || parseInt(selectedDay.date?.split('-')[1])) - 1]} {selectedDay.day}, {selectedDay.year || selectedDay.date?.split('-')[0]}</h2>
            <table className="glass-detail-table">
              <tbody>
                {getDayDetails(selectedDay).map((detail, i) => (
                  <tr key={i}>
                    <td>{detail.label}</td>
                    <td><strong>{detail.value}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isMissingSignOut(selectedDay) && (
              <div className="glass-alert glass-alert-warning">
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Missing Sign-Out on this day
                </div>
                <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => { setSelectedDay(null); navigate('/requests'); }}>
                  Submit Sign-Out Request
                </button>
              </div>
            )}
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => setSelectedDay(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
