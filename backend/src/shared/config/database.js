// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const mysql = require('mysql2/promise');

if (!process.env.DB_USER || !process.env.DB_HOST) {
  throw new Error('DB_USER and DB_HOST environment variables are required');
}

const pool = mysql.createPool({
  ...(process.env.DB_SOCKET
    ? { socketPath: process.env.DB_SOCKET }
    : { host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT) || 3306 }),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 25,
  connectTimeout: 10000,
  acquireTimeoutMillis: 10000,
  idleTimeoutMillis: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  queueLimit: 0,
});

// SQL date functions (CURDATE, DATE(), NOW()) must use the business timezone,
// otherwise the "today" used for attendance flips at UTC midnight instead of
// Cairo midnight. Named zones need the tz tables loaded; fall back to the
// current numeric offset when they are not.
pool.on('connection', (connection) => {
  connection.query("SET time_zone = 'Africa/Cairo'", (err) => {
    if (!err) return;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date());
    const map = {};
    for (const part of parts) map[part.type] = part.value;
    const asUTC = Date.UTC(
      Number(map.year), Number(map.month) - 1, Number(map.day),
      Number(map.hour) % 24, Number(map.minute), Number(map.second)
    );
    const offsetMinutes = Math.round((asUTC - Date.now()) / 60000);
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    connection.query(`SET time_zone = '${sign}${hh}:${mm}'`);
  });
});

module.exports = pool;
