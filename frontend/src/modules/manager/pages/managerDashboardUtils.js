export function formatManagerTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Cairo'
  });
}

export function getStatusBadgeClass(status) {
  switch (status) {
    case 'signed_in':
      return 'badge badge-active';
    case 'signed_out':
      return 'badge';
    case 'leave':
      return 'badge badge-warning';
    case 'absent':
      return 'badge badge-inactive';
    default:
      return 'badge';
  }
}
