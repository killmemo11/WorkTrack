// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const path = require('path');
const fs = require('fs');

const STORAGE_DIR = path.resolve(
  process.env.STORAGE_DIR || path.join(__dirname, '..', '..', '..', 'storage', 'documents')
);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getPersonnelDir() {
  return ensureDir(path.join(STORAGE_DIR, 'personnel'));
}

function getRecruitmentDir() {
  return ensureDir(path.join(STORAGE_DIR, 'recruitment'));
}

function getPaymentsDir() {
  return ensureDir(path.join(STORAGE_DIR, 'payments'));
}

module.exports = { STORAGE_DIR, getPersonnelDir, getRecruitmentDir, getPaymentsDir };
