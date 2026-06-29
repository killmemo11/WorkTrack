// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../../shared/api';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const leaveTypeColors = { annual: '#4f46e5', sick: '#ef4444', casual: '#f59e0b', personal: '#8b5cf6', unpaid: '#6b7280' };
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

  useEffect(() => {
    setLoading(true);
    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const dateTo = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    api.get(`/attendance/calendar?date_from=${dateFrom}&date_to=${dateTo}`)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
    setSearchParams({ year, month }, { replace: true });
  }, [year, month]);

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
      <div className="page-header">
        <h1>Attendance Calendar</h1>
        <p className="subtitle">View your attendance by month</p>
      </div>

      <div className="calendar-nav">
        <button className="btn btn-outline btn-sm" onClick={prevMonth}>&larr; Prev</button>
        <h2 className="calendar-nav-title">{monthNames[month - 1]} {year}</h2>
        <button className="btn btn-outline btn-sm" onClick={nextMonth}>Next &rarr;</button>
        {!isCurrentMonth && <button className="btn btn-primary btn-sm" onClick={goToday}>Today</button>}
      </div>

      {loading && <div className="loading" />}

      {!loading && data && monthDays && (
        <div className="calendar-card">
          {data.date_from && (
            <div className="calendar-header">
              <span className="period-label">
                Period: {data.date_from} → {data.date_to}
              </span>
            </div>
          )}
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

      {!loading && !data?.months?.[0]?.days && (
        <p className="empty-state">No calendar data available.</p>
      )}

      {selectedDay && (
        <div className="modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="modal day-detail-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{monthNames[selectedDay.month - 1]} {selectedDay.day}, {selectedDay.year}</h2>
            <table className="day-detail-table">
              <tbody>
                {getDayDetails(selectedDay).map((detail, i) => {
                  const colonIdx = detail.indexOf(':');
                  if (colonIdx > 0) {
                    return (
                      <tr key={i}>
                        <td>{detail.slice(0, colonIdx)}</td>
                        <td><strong>{detail.slice(colonIdx + 1).trim()}</strong></td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={i}>
                      <td colSpan={2}><strong>{detail}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setSelectedDay(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
