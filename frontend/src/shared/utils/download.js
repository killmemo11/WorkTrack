// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Blob downloads hide JSON error bodies from the browser; read the blob back
// so the user sees the server's message instead of a generic failure.
export async function blobErrorMessage(err, fallback = 'Download failed') {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed?.error || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.error || fallback;
}
