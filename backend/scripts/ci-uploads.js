// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Regression checks for upload type/path validation. Runs without a database.

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  IMAGE_EXTENSIONS,
  CV_EXTENSIONS,
  safeExtension,
  extensionAllowed,
  hasMagicBytes,
  validateUploadedFile,
} = require('../src/shared/utils/upload-security');

function rejectStatus(middleware, req) {
  let statusCode = 0;
  middleware(
    req,
    { status(code) { statusCode = code; return { json: () => {} }; } },
    () => { throw new Error('upload should have been rejected'); }
  );
  return statusCode;
}

async function main() {
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
  const pdf = Buffer.from('%PDF-1.7\n');
  const doc = Buffer.from('d0cf11e0a1b11ae1', 'hex');
  const docx = Buffer.from('504b030414000600', 'hex');
  const html = Buffer.from('<html><script>alert(1)</script>');

  assert(hasMagicBytes(png, '.png'), 'png signature');
  assert(hasMagicBytes(pdf, '.pdf'), 'pdf signature');
  assert(hasMagicBytes(doc, '.doc'), 'doc signature');
  assert(hasMagicBytes(docx, '.docx'), 'docx signature');
  assert(!hasMagicBytes(html, '.png'), 'html must not pass as png');
  assert(!hasMagicBytes(docx, '.doc'), 'zip must not pass as legacy doc');

  assert.equal(safeExtension('cv.PDF'), '.pdf');
  assert.equal(safeExtension('../evil.png'), '');
  assert(extensionAllowed('cv.pdf', CV_EXTENSIONS));
  assert(!extensionAllowed('cv.html', CV_EXTENSIONS));
  assert(!extensionAllowed('cv.pdf.exe', CV_EXTENSIONS));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'worktrack-upload-'));
  try {
    const goodPath = path.join(dir, 'good.png');
    fs.writeFileSync(goodPath, png);
    let accepted = false;
    validateUploadedFile(IMAGE_EXTENSIONS)(
      { file: { originalname: 'avatar.png', path: goodPath } },
      { status: () => ({ json: () => { throw new Error('valid file rejected'); } }) },
      () => { accepted = true; }
    );
    assert(accepted, 'valid png accepted');

    const spoofPath = path.join(dir, 'spoof.png');
    fs.writeFileSync(spoofPath, html);
    const status = rejectStatus(
      validateUploadedFile(IMAGE_EXTENSIONS),
      { file: { originalname: 'avatar.png', path: spoofPath } }
    );
    assert.equal(status, 400, 'spoofed png rejected with 400');
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert(!fs.existsSync(spoofPath), 'rejected file removed');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  console.log('Upload validation checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
