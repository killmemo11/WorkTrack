// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../shared/api';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const leaveTypeColors = { annual: '#8b5cf6', sick: '#ef4444', casual: '#f59e0b', personal: '#06b6d4', unpaid: '#6b7280' };
const leaveTypeLabels = { annual: 'A', sick: 'S', casual: 'C', personal: 'P', unpaid: 'U' };

export default function Calendar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const urlYear = parseInt(searchParams.get('year')) || now.getFullYear();
  const urlMonth = parseInt(searchParams.get('month')) || (now.getMonth() + 1);
  const [year, setYear] = useState(urlYear);
  const [month, setMonth] = useState(urlMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const dateTo = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      const response = await api.get(`/attendance/calendar?date_from=${dateFrom}&date_to=${dateTo}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchCalendarData();
    setSearchParams({ year, month }, { replace: true });
  }, [year, month, fetchCalendarData, setSearchParams]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };
  const goToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };
  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
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

  const getDayClass = (day) => {
    let cls = 'cal-day cal-clickable';
    if (!day.in_period) cls += ' cal-outside-period';
    if (day.is_off_day) cls += ' cal-off';
    if (day.is_holiday) cls += ' cal-holiday';
    if (day.type === 'office') cls += ' cal-office';
    if (day.type === 'wfh') cls += ' cal-wfh';
    if (day.is_future) cls += ' cal-future';
    if (!day.signed_in && !day.is_off_day && !day.is_holiday && !day.is_future && day.in_period && day.leaves?.length === 0) cls += ' cal-absent';
    const today = new Date();
    if (day.year === today.getFullYear() && day.month === (today.getMonth() + 1) && day.day === today.getDate()) cls += ' cal-today';
    return cls;
  };

  const getDayDetails = (day) => {
    if (!day) return null;
    const parts = [];
    if (day.is_off_day) parts.push('Off Day');
    if (day.is_holiday) parts.push(`Holiday: ${day.holiday_name || '—'}`);
    if (day.type === 'office') parts.push('Office Attendance');
    if (day.type === 'wfh') parts.push('Work From Home');
    if (day.leaves?.length > 0) parts.push(`Leave: ${day.leaves.join(', ')}`);
    if (day.is_future) parts.push('Future Date');
    if (!day.signed_in && !day.is_off_day && !day.is_holiday && !day.is_future && day.in_period && day.leaves?.length === 0) parts.push('Absent');
    if (day.signed_in && day.sign_in_time) parts.push(`Sign In: ${new Date(day.sign_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    if (day.signed_in && day.sign_out_time) parts.push(`Sign Out: ${new Date(day.sign_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    return parts.length > 0 ? parts : ['No data'];
  };

  const monthDays = data?.months?.[0]?.days;
  const grid = monthDays ? buildCalendarGrid(monthDays) : [];
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1);

  return (
    <div className="page">
      <div className="glass-page-header">
        <div className="page-header-content">
          <div>
            <h1>Attendance Calendar</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>View and manage your attendance schedule</p>
          </div>
          <div className="header-actions">
            <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={refreshData} title="Refresh data">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', marginBottom: 20, borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="nav-buttons">
          <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={prevMonth}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <h2 className="calendar-nav-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, padding: '0 16px' }}>
            {monthNames[month - 1]} {year}
          </h2>
          <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={nextMonth}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
        </div>
        <div className="nav-actions">
          {!isCurrentMonth && (
            <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={goToday}>
              Today
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="glass-loading" style={{ padding: '40px 0', textAlign: 'center' }}>
          <div className="spinner" />
          <span>Loading calendar data...</span>
        </div>
      )}

      {!loading && data && monthDays && (
        <div className="calendar-container">
          <div className="calendar-info" style={{ padding: '0 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="period-info" style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              Period: {data.date_from} → {data.date_to}
            </div>
            <div className="stats-summary" style={{ display: 'flex', gap: 16, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>
                {data.months[0].days.filter(d => d.in_period).length} days in period
              </span>
              <span style={{ color: 'var(--text-dim)' }}>
                {data.months[0].days.filter(d => d.signed_in).length} days recorded
              </span>
            </div>
          </div>

          <div className="calendar-months">
            <div className="calendar-month">
              <h4 className="calendar-month-title" style={{ fontSize: '1.1rem', fontWeight: 600, padding: '0 20px 12px', color: 'var(--text-primary)' }}>
                {monthNames[month - 1]} {year}
              </h4>
              <div className="calendar-table-wrapper" style={{ overflowX: 'auto' }}>
                <table className="glass-calendar-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {dayHeaders.map((h) => (
                        <th key={h} className="calendar-header" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 8px', textAlign: 'center' }}>
                        {h}
                      </th>
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
                                {day.is_holiday && (
                                  <span className="cal-label cal-label-holiday" title={day.holiday_name}>
                                    H
                                  </span>
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
                                  <span 
                                    key={i} 
                                    className="cal-label" 
                                    style={{ 
                                      background: leaveTypeColors[lt] || '#6b7280', 
                                      color: '#fff', 
                                      fontSize: '0.65rem',
                                      marginRight: '2px'
                                    }}
                                  >
                                    {leaveTypeLabels[lt] || lt.charAt(0).toUpperCase()}
                                  </span>
                                ))}
                                {!day.signed_in && !day.is_off_day && !day.is_holiday && !day.is_future && day.in_period && day.leaves?.length === 0 && (
                                  <span className="cal-label cal-label-absent">A</span>
                                )}
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
          </div>

          <div className="calendar-legend" style={{ 
            padding: '16px 20px', 
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            justifyContent: 'center'
          }}>
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
      )}

      {!loading && !data?.months?.[0]?.days && (
        <div className="glass-empty" style={{ padding: '60px 0', textAlign: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          <h3 style={{ marginTop: '16px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>No calendar data available</h3>
          <p style={{ color: 'var(--text-dim)', marginTop: '8px' }}>Try selecting a different month or contact your administrator.</p>
        </div>
      )}

      {selectedDay && (
        <div className="glass-modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="glass-modal day-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="glass-modal-header">
              <h2>{monthNames[selectedDay.month - 1]} {selectedDay.day}, {selectedDay.year}</h2>
              <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setSelectedDay(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
            <div className="day-details-content">
              <table className="day-detail-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {getDayDetails(selectedDay).map((detail, i) => {
                    const colonIdx = detail.indexOf(':');
                    if (colonIdx > 0) {
                      return (
                        <tr key={i}>
                          <td style={{ padding: '12px 0', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500 }}>
                            {detail.slice(0, colonIdx)}
                          </td>
                          <td style={{ padding: '12px 0', textAlign: 'right' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{detail.slice(colonIdx + 1).trim()}</strong>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={i}>
                        <td colSpan={2} style={{ padding: '12px 0' }}>
                          <strong style={{ fontSize: '0.95rem' }}>{detail}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {selectedDay.signed_in && !selectedDay.signed_out && !selectedDay.is_future && (
                <div className="missing-signout-alert glass-alert glass-alert-warning">
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    Missing Sign-Out on this day
                  </div>
                  <button 
                    className="glass-btn glass-btn-sm glass-btn-danger"
                    onClick={() => { setSelectedDay(null); navigate('/requests'); }}
                  >
                    Submit Sign-Out Request
                  </button>
                </div>
              )}
            </div>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => setSelectedDay(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
