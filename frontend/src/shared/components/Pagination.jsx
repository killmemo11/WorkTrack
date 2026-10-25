import Icon from './Icon';
// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="glass-pagination" aria-label="Pagination">
      <button
        type="button"
        className="glass-page-btn"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <Icon icon="lucide:chevron-left" />
      </button>
      {start > 1 && <><button type="button" className="glass-page-btn" aria-label="Page 1" onClick={() => onPageChange(1)}>1</button>{start > 2 && <span aria-hidden="true" style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>...</span>}</>}
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`glass-page-btn${p === page ? ' active' : ''}`}
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      {end < totalPages && <><span aria-hidden="true" style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>...</span><button type="button" className="glass-page-btn" aria-label={`Page ${totalPages}`} onClick={() => onPageChange(totalPages)}>{totalPages}</button></>}
      <button
        type="button"
        className="glass-page-btn"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <Icon icon="lucide:chevron-right" />
      </button>
    </nav>
  );
}
