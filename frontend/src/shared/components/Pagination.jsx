// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="pagination">
      <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      {start > 1 && <><button className="btn btn-sm btn-outline" onClick={() => onPageChange(1)}>1</button>{start > 2 && <span className="page-info">...</span>}</>}
      {pages.map((p) => (
        <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`} onClick={() => onPageChange(p)}>{p}</button>
      ))}
      {end < totalPages && <><span className="page-info">...</span><button className="btn btn-sm btn-outline" onClick={() => onPageChange(totalPages)}>{totalPages}</button></>}
      <button className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </div>
  );
}