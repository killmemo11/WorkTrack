// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../../shared/api';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const leaveTypeColors = { annual: '#8b5cf6', sick: '#ef4444', casual: '#f59e0b', personal: '#06b6d4', unpaid: '#6b7280' };
const leaveTypeLabels = { annual: 'A', sick: 'S', casual: 'C', personal: 'P', unpaid: 'U' };

export default function Calendar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const now = new Date();
  const urlYear = parseInt(searchParams.get('year')) || now.getFullYear();
  const urlMonth = parseInt(searchParams.get('month')) || (now.getMonth() + 1);
  const [year, setYear] = useState(urlYear);
  const [month, setMonth] = useState(urlMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const dateTo = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      const response = await api.get(`/attendance/calendar?date_from=${dateFrom}&date_to=${dateTo}`);
      setData(response.data);
    } catch (error) {
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
    if (day.year === now.getFullYear() && day.month === (now.getMonth() + 1) && day.day === now.getDate()) cls += ' cal-today';
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
    <div className="page" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="glass-page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>Attendance Calendar</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>View and manage your attendance schedule</p>
        </div>
      </div>

      <div className="glass-card" style={{ borderRadius: 'var(--radius-lg)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-glass)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={prevMonth}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, padding: '0 8px' }}>
              {monthNames[month - 1]} {year}
            </h2>
            <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={nextMonth}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {data?.date_from && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginRight: 8 }}>{data.date_from} → {data.date_to}</span>
            )}
            {!isCurrentMonth && (
              <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={goToday}>Today</button>
            )}
          </div>
        </div>

        {loading && (
          <div className="glass-loading" style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="spinner" />
            <span style={{ color: 'var(--text-dim)' }}>Loading calendar data...</span>
          </div>
        )}

        {!loading && data && monthDays && (
          <>
            <div className="calendar-table-wrapper" style={{ padding: '12px', overflowX: 'auto' }}>
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
                        if (!day) return <td key={di} className="cal-empty" style={{ background: 'transparent', border: 'none' }}></td>;
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

            <div className="calendar-legend" style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-glass)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              justifyContent: 'center'
            }}>
              {[
                { color: '#22c55e', label: 'Office' },
                { color: '#3b82f6', label: 'WFH' },
                { color: '#ef4444', label: 'Absent' },
                { color: '#f59e0b', label: 'Holiday' },
                { color: '#475569', label: 'Off Day' },
                { color: '#ef4444', label: 'Missing', isMissing: true },
                { color: '#8b5cf6', label: 'Annual' },
                { color: '#ef4444', label: 'Sick' },
              ].map((item) => (
                <div key={item.label} className="legend-item" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <span className="legend-dot" style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: item.isMissing ? 'transparent' : item.color,
                    border: item.isMissing ? '1.5px solid #ef4444' : 'none',
                    position: 'relative'
                  }}>{item.isMissing ? '!' : ''}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !data?.months?.[0]?.days && (
          <div className="glass-empty" style={{ padding: '60px 0', textAlign: 'center' }}>
            <h3 style={{ color: 'var(--text-dim)' }}>No calendar data available</h3>
            <p style={{ color: 'var(--text-faint)', marginTop: 8 }}>Try selecting a different month.</p>
          </div>
        )}
      </div>

      {selectedDay && (
        <div className="glass-modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="glass-modal day-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="glass-modal-header">
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{monthNames[selectedDay.month - 1]} {selectedDay.day}, {selectedDay.year}</h2>
              <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setSelectedDay(null)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </button>
            </div>
            <div style={{ padding: '8px 0' }}>
              {getDayDetails(selectedDay).map((detail, i) => {
                const colonIdx = detail.indexOf(':');
                if (colonIdx > 0) {
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{detail.slice(0, colonIdx)}</span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{detail.slice(colonIdx + 1).trim()}</strong>
                    </div>
                  );
                }
                return (
                  <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{detail}</strong>
                  </div>
                );
              })}
            </div>
            {selectedDay.signed_in && !selectedDay.signed_out && !selectedDay.is_future && (
              <div className="glass-alert glass-alert-warning" style={{ marginTop: 8 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Missing Sign-Out on this day</div>
                <button className="glass-btn glass-btn-sm glass-btn-danger"
                  onClick={() => { setSelectedDay(null); navigate('/requests'); }}>
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
    </div>
  );
}
