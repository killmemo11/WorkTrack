// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { google } = require('googleapis');
const pool = require('../config/database');

async function getSetting(key) {
  const [rows] = await pool.query('SELECT `value` FROM settings WHERE `key` = ?', [key]);
  return rows[0]?.value || '';
}

async function createGoogleMeetLink(eventDetails) {
  const serviceAccountEmail = await getSetting('meeting_google_service_email');
  const privateKey = await getSetting('meeting_google_private_key');
  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Google Meet not configured. Go to Admin → Settings → Meeting Integrations.');
  }

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  const calendar = google.calendar({ version: 'v3', auth });
  const startTime = new Date(eventDetails.interview_date);
  const endTime = new Date(startTime.getTime() + (eventDetails.duration || 60) * 60000);

  const event = {
    summary: `Interview — ${eventDetails.job_title || 'Job Interview'}`,
    description: eventDetails.notes || '',
    start: { dateTime: startTime.toISOString(), timeZone: 'Africa/Cairo' },
    end: { dateTime: endTime.toISOString(), timeZone: 'Africa/Cairo' },
    conferenceData: {
      createRequest: { requestId: `iv-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
    },
    attendees: eventDetails.interviewer ? [{ email: eventDetails.interviewer_email || '', displayName: eventDetails.interviewer }] : [],
  };

  const res = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: 1,
  });

  return res.data.hangoutLink || res.data.htmlLink || '';
}

async function createTeamsMeeting(eventDetails) {
  const tenantId = await getSetting('meeting_teams_tenant_id');
  const clientId = await getSetting('meeting_teams_client_id');
  const clientSecret = await getSetting('meeting_teams_client_secret');
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Microsoft Teams not configured. Go to Admin → Settings → Meeting Integrations.');
  }

  // Get access token via client credentials flow
  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Teams auth failed: ' + (tokenData.error_description || 'Check credentials'));

  const startTime = new Date(eventDetails.interview_date);
  const endTime = new Date(startTime.getTime() + (eventDetails.duration || 60) * 60000);

  const meetRes = await fetch('https://graph.microsoft.com/v1.0/users/me/onlineMeetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject: `Interview — ${eventDetails.job_title || 'Job Interview'}`,
      startDateTime: startTime.toISOString(),
      endDateTime: endTime.toISOString(),
    }),
  });
  const meetData = await meetRes.json();
  if (!meetRes.ok) throw new Error('Teams meeting creation failed: ' + (meetData.error?.message || 'Unknown error'));

  return meetData.joinUrl || meetData.joinWebUrl || '';
}

async function createMeetingLink(platform, eventDetails) {
  if (platform === 'Google Meet') return createGoogleMeetLink(eventDetails);
  if (platform === 'Microsoft Teams') return createTeamsMeeting(eventDetails);
  return ''; // Jitsi or manual link — no API call needed
}

async function testGoogleConnection() {
  const link = await createGoogleMeetLink({
    interview_date: new Date(Date.now() + 60000).toISOString(),
    duration: 15,
    job_title: 'Test Meeting',
  });
  return !!link;
}

async function testTeamsConnection() {
  const link = await createTeamsMeeting({
    interview_date: new Date(Date.now() + 60000).toISOString(),
    duration: 15,
    job_title: 'Test Meeting',
  });
  return !!link;
}

module.exports = { createMeetingLink, createGoogleMeetLink, createTeamsMeeting, testGoogleConnection, testTeamsConnection };
