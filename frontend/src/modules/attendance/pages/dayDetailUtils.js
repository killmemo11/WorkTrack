function parseAttendanceValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const directDate = new Date(trimmed);
    if (!Number.isNaN(directDate.getTime())) return directDate;

    const matched = trimmed.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (matched) {
      const [, year, month, day, hour, minute, second] = matched;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second || 0)));
    }
  }

  return new Date(value);
}

export function formatAttendanceTime(value) {
  const date = parseAttendanceValue(value);
  if (!date || Number.isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Cairo'
  });
}

function calcDuration(signInTime, signOutTime) {
  if (!signInTime || !signOutTime) return null;
  const diffMs = parseAttendanceValue(signOutTime) - parseAttendanceValue(signInTime);
  if (diffMs <= 0) return null;
  const totalMinutes = Math.round(diffMs / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

export function buildDayDetailRows(day) {
  if (!day) return [];

  const rows = [];

  if (day.is_off_day) rows.push({ label: 'Status', value: 'Off Day' });
  if (day.is_holiday) rows.push({ label: 'Holiday', value: day.holiday_name || 'Public Holiday' });
  if (day.type === 'office') rows.push({ label: 'Mode', value: 'Office Attendance' });
  if (day.type === 'wfh') rows.push({ label: 'Mode', value: 'Work From Home' });
  if (day.leaves?.length > 0) rows.push({ label: 'Leave', value: day.leaves.join(', ') });
  if (day.is_future) rows.push({ label: 'Status', value: 'Future Date' });

  if (day.signed_in) {
    rows.push({ label: 'Sign In', value: formatAttendanceTime(day.sign_in_time) || 'Not recorded' });
    if (day.sign_out_time || day.signed_out) {
      rows.push({ label: 'Sign Out', value: formatAttendanceTime(day.sign_out_time) || 'Not recorded' });
      const duration = calcDuration(day.sign_in_time, day.sign_out_time);
      if (duration) rows.push({ label: 'Duration', value: duration });
    }
  } else if (!day.is_off_day && !day.is_holiday && !day.is_future && day.in_period && day.leaves?.length === 0) {
    rows.push({ label: 'Attendance', value: 'No sign-in recorded' });
  }

  if (!rows.length) rows.push({ label: 'Details', value: 'No data' });

  return rows;
}
