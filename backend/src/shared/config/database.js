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
  queueLimit: 0,
});

module.exports = pool;
