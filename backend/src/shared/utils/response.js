// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

function success(res, data, status = 200) {
  return res.status(status).json(data);
}

function error(res, message, status = 400) {
  return res.status(status).json({ error: message });
}

function paginated(res, rows, total, page, limit) {
  return res.json({
    data: rows,
    pagination: {
      page,
      per_page: limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

module.exports = { success, error, paginated };
