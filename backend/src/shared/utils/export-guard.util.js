// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Spreadsheet exports build the whole workbook in memory, so they are capped
// by both date range and row count to keep a single request from exhausting
// the PM2 process.
const MAX_EXPORT_DAYS = 366;
const MAX_EXPORT_ROWS = 50000;

function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateExportRange(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) {
    return { error: 'date_from and date_to are required' };
  }
  if (!isValidDateString(dateFrom) || !isValidDateString(dateTo)) {
    return { error: 'Invalid date format. Use YYYY-MM-DD.' };
  }

  const from = Date.parse(`${dateFrom}T00:00:00Z`);
  const to = Date.parse(`${dateTo}T00:00:00Z`);
  if (from > to) {
    return { error: 'date_from must be on or before date_to' };
  }

  const days = Math.round((to - from) / 86400000) + 1;
  if (days > MAX_EXPORT_DAYS) {
    return { error: `Date range is too large (${days} days). Maximum is ${MAX_EXPORT_DAYS} days.` };
  }

  return null;
}

function validateExportRows(rows) {
  if (rows.length > MAX_EXPORT_ROWS) {
    return { error: `Export contains more than ${MAX_EXPORT_ROWS} rows. Narrow the filters and try again.` };
  }
  return null;
}

module.exports = {
  MAX_EXPORT_DAYS,
  MAX_EXPORT_ROWS,
  validateExportRange,
  validateExportRows,
};
