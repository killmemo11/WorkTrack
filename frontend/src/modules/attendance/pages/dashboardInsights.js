export function buildDashboardInsights({ attendanceRate, presentDays, totalWorkDays, status, monthName, leaveDays, absenceDays, isHoliday, holidayName }) {
  const isSignedIn = Boolean(status?.signedIn);
  const isSignedOut = Boolean(status?.signedOut);

  const todayStatus = isSignedIn && !isSignedOut
    ? 'In progress'
    : isSignedOut
      ? 'Completed'
      : 'Not started';

  const progressText = totalWorkDays > 0
    ? absenceDays > 0 || leaveDays > 0
      ? `${presentDays} present · ${leaveDays} on leave · ${absenceDays} absent`
      : `${presentDays} of ${totalWorkDays} days recorded`
    : 'No work days recorded yet';

  return [
    {
      title: 'Attendance Score',
      value: `${attendanceRate}%`,
      detail: attendanceRate >= 90 ? 'Excellent consistency' : attendanceRate >= 75 ? 'On track' : 'Needs attention',
      tone: attendanceRate >= 90 ? 'good' : attendanceRate >= 75 ? 'ok' : 'bad'
    },
    {
      title: 'Today',
      value: isHoliday ? 'Holiday!' : todayStatus,
      detail: isHoliday ? (holidayName || 'Enjoy your day off!') : `${monthName} overview`,
      tone: isHoliday ? 'holiday' : todayStatus === 'In progress' ? 'good' : todayStatus === 'Completed' ? 'ok' : 'bad'
    },
    {
      title: 'This month',
      value: `${presentDays}`,
      detail: progressText,
      tone: presentDays > 0 ? 'good' : 'bad'
    }
  ];
}
