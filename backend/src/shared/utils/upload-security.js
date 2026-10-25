// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const IMAGE_PDF_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, '.pdf']);
const OFFICE_EXTENSIONS = new Set(['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx']);
const PERSONNEL_EXTENSIONS = new Set([...IMAGE_PDF_EXTENSIONS, ...OFFICE_EXTENSIONS]);
const CV_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg']);
const PAYMENT_EXTENSIONS = new Set([...IMAGE_PDF_EXTENSIONS]);
const SPREADSHEET_EXTENSIONS = new Set(['.xls', '.xlsx']);

const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ZIP_SIGNATURES = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];

function safeExtension(originalName) {
  const name = String(originalName || '');
  if (/[\\/\0]/.test(name)) return '';
  const ext = path.extname(name).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

function extensionAllowed(originalName, allowedExtensions) {
  const ext = safeExtension(originalName);
  return Boolean(ext) && allowedExtensions.has(ext);
}

function startsWith(buffer, signature) {
  return buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature);
}

function hasMagicBytes(buffer, ext) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case '.png':
      return startsWith(buffer, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case '.gif': {
      const header = buffer.toString('ascii', 0, 6);
      return header === 'GIF87a' || header === 'GIF89a';
    }
    case '.webp':
      return buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP';
    case '.pdf':
      return buffer.subarray(0, 4096).includes(Buffer.from('%PDF-'));
    case '.doc':
    case '.xls':
    case '.ppt':
      return startsWith(buffer, OLE_SIGNATURE);
    case '.docx':
    case '.xlsx':
    case '.pptx':
      return ZIP_SIGNATURES.some((signature) => startsWith(buffer, signature));
    default:
      return false;
  }
}

function readHeader(filePath, length = 4096) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(length);
    const bytesRead = fs.readSync(fd, header, 0, length, 0);
    return header.subarray(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
}

function fileContentMatches(file, ext) {
  try {
    const header = file.buffer || readHeader(file.path);
    return hasMagicBytes(header, ext);
  } catch {
    return false;
  }
}

function removeUploadedFile(file) {
  if (file && file.path) {
    fs.unlink(file.path, () => {});
  }
}

function invalidFileType(allowedExtensions) {
  const allowed = [...allowedExtensions].map((ext) => ext.slice(1).toUpperCase()).join(', ');
  return Object.assign(new Error(`Invalid file type. Allowed: ${allowed}`), { status: 400 });
}

function validateUploadedFile(allowedExtensions) {
  return (req, res, next) => {
    if (!req.file) return next();
    if (req.file.path) {
      try { fs.chmodSync(req.file.path, 0o600); } catch { /* best effort */ }
    }
    const ext = safeExtension(req.file.originalname);
    if (!ext || !allowedExtensions.has(ext) || !fileContentMatches(req.file, ext)) {
      removeUploadedFile(req.file);
      return res.status(400).json({ error: 'Uploaded file content does not match its declared type' });
    }
    next();
  };
}

function singleFile(upload, field, allowedExtensions) {
  const parse = upload.single(field);
  const validate = validateUploadedFile(allowedExtensions);
  return (req, res, next) => {
    parse(req, res, (err) => {
      if (err) return next(err);
      validate(req, res, next);
    });
  };
}

module.exports = {
  IMAGE_EXTENSIONS,
  IMAGE_PDF_EXTENSIONS,
  PERSONNEL_EXTENSIONS,
  CV_EXTENSIONS,
  PAYMENT_EXTENSIONS,
  SPREADSHEET_EXTENSIONS,
  safeExtension,
  extensionAllowed,
  hasMagicBytes,
  invalidFileType,
  validateUploadedFile,
  singleFile,
};
