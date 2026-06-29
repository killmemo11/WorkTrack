// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const weekDayIndex = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };

function isWorkDay(date, workWeekStart, workWeekEnd) {
  const day = date.getDay();
  const start = weekDayIndex[workWeekStart] ?? 0;
  const end = weekDayIndex[workWeekEnd] ?? 4;
  if (start <= end) return day >= start && day <= end;
  return day >= start || day <= end;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getTodayDateString() {
  return formatDateCairo(new Date());
}

function formatDateCairo(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(date);
}

module.exports = { isWorkDay, getDaysInMonth, getTodayDateString, formatDateCairo };
