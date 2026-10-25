// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// All UI dates are shown in the business timezone, regardless of the browser's
// locale. Naive server strings ("YYYY-MM-DD HH:mm:ss") are treated as Cairo
// wall-clock time; ISO strings with an offset are converted from their instant.
export const TIME_ZONE = 'Africa/Cairo';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const NAIVE_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?\s*$/;

function zoneOffsetMs(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const map = {};
  for (const part of parts) map[part.type] = part.value;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second)
  );
  return asUTC - date.getTime();
}

export function parseDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  if (typeof value !== 'string') return null;

  const s = value.trim();
  if (DATE_ONLY.test(s)) return parseDate(`${s} 00:00:00`);

  const naive = NAIVE_DATETIME.exec(s);
  if (naive) {
    const [, y, mo, d, h, mi, sec = '0'] = naive;
    const wallUTC = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec));
    // Offset depends on the instant (DST), so resolve it twice around the guess.
    let ts = wallUTC - zoneOffsetMs(new Date(wallUTC));
    ts = wallUTC - zoneOffsetMs(new Date(ts));
    return new Date(ts);
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
});
const shortFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric',
});
const longFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric',
});
const weekdayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false,
});
const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, month: 'long', year: 'numeric',
});

export function formatDate(value) {
  const d = parseDate(value);
  return d ? dateFormatter.format(d) : '—';
}

export function formatDateShort(value) {
  const d = parseDate(value);
  return d ? shortFormatter.format(d) : '—';
}

export function formatDateLong(value) {
  const d = parseDate(value);
  return d ? longFormatter.format(d) : '—';
}

export function formatWeekdayDate(value) {
  const d = parseDate(value);
  return d ? weekdayFormatter.format(d) : '—';
}

export function formatTime(value) {
  const d = parseDate(value);
  return d ? timeFormatter.format(d) : '—';
}

export function formatDateTime(value) {
  const d = parseDate(value);
  return d ? `${dateFormatter.format(d)} ${timeFormatter.format(d)}` : '—';
}

export function formatMonthYear(value) {
  const d = parseDate(value);
  return d ? monthFormatter.format(d) : '—';
}

function partsToIsoDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const map = {};
  for (const part of parts) map[part.type] = part.value;
  return `${map.year}-${map.month}-${map.day}`;
}

// Calendar date (YYYY-MM-DD) in Cairo — use for <input type="date"> and API filters.
export function toDateInputValue(value = new Date()) {
  const d = parseDate(value);
  return d ? partsToIsoDate(d) : '';
}

export function todayInCairo() {
  return partsToIsoDate(new Date());
}
