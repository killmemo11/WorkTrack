import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardInsights } from './dashboardInsights.js';

test('buildDashboardInsights returns a meaningful summary for active attendance', () => {
  const insights = buildDashboardInsights({
    attendanceRate: 88,
    presentDays: 22,
    totalWorkDays: 25,
    status: { signedIn: true, signedOut: false },
    monthName: 'June'
  });

  assert.equal(insights[0].title, 'Attendance Score');
  assert.equal(insights[0].value, '88%');
  assert.equal(insights[1].title, 'Today');
  assert.equal(insights[1].value, 'In progress');
  assert.equal(insights[2].title, 'This month');
  assert.match(insights[2].detail, /22/);
});

test('buildDashboardInsights handles not-started day gracefully', () => {
  const insights = buildDashboardInsights({
    attendanceRate: 0,
    presentDays: 0,
    totalWorkDays: 20,
    status: { signedIn: false, signedOut: false },
    monthName: 'June'
  });

  assert.equal(insights[1].value, 'Not started');
  assert.match(insights[2].detail, /0/);
});
