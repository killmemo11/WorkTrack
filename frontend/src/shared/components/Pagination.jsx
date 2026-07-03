// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="glass-pagination">
      <button className="glass-page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <span className="iconify" data-icon="lucide:chevron-left" />
      </button>
      {start > 1 && <><button className="glass-page-btn" onClick={() => onPageChange(1)}>1</button>{start > 2 && <span style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>...</span>}</>}
      {pages.map((p) => (
        <button key={p} className={`glass-page-btn${p === page ? ' active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
      ))}
      {end < totalPages && <><span style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>...</span><button className="glass-page-btn" onClick={() => onPageChange(totalPages)}>{totalPages}</button></>}
      <button className="glass-page-btn" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        <span className="iconify" data-icon="lucide:chevron-right" />
      </button>
    </div>
  );
}