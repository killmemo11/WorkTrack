// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import api from '../../../shared/api';

function calcDuration(r) {
  if (!r.sign_out_time) return '—';
  const h = (new Date(r.sign_out_time) - new Date(r.sign_in_time)) / (1000 * 60 * 60);
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

function WindowedPagination({ page, totalPages, onChange }) {
  const pages = [];
  const maxVisible = 7;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
  if (start > 1) pages.push({ n: 1, label: '1' });
  if (start > 2) pages.push({ n: null, label: '…' });
  for (let i = start; i <= end; i++) pages.push({ n: i, label: String(i) });
  if (end < totalPages - 1) pages.push({ n: null, label: '…' });
  if (end < totalPages) pages.push({ n: totalPages, label: String(totalPages) });
  return (
    <div className="pagination">
      <button className={`btn btn-sm ${page === 1 ? 'btn-disabled' : 'btn-outline'}`} disabled={page === 1} onClick={() => onChange(page - 1)}>&laquo;</button>
      {pages.map((p, i) =>
        p.n === null
          ? <span key={`ellipsis-${i}`} className="pagination-ellipsis">{p.label}</span>
          : <button key={p.n} className={`btn btn-sm ${p.n === page ? 'btn-primary' : 'btn-outline'}`} onClick={() => onChange(p.n)}>{p.label}</button>
      )}
      <button className={`btn btn-sm ${page === totalPages ? 'btn-disabled' : 'btn-outline'}`} disabled={page === totalPages} onClick={() => onChange(page + 1)}>&raquo;</button>
    </div>
  );
}

export default function History() {
  const [data, setData] = useState({ records: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/attendance/history?page=${page}&limit=20`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  return (
    <div className="page">
      <h1>Attendance History</h1>
      {loading && <div className="loading" />}
      {error && <p className="empty" style={{ color: '#ef4444' }}>{error}</p>}
      {!loading && !error && data.records.length === 0 && (
        <p className="empty">No records yet.</p>
      )}
      {!loading && !error && data.records.length > 0 && (
        <>
          <div className="summary-bar">
            <span className="summary-item">Total: <strong>{data.total}</strong></span>
            <span className="summary-item">Page: <strong>{data.page} / {data.totalPages}</strong></span>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Sign In</th>
                  <th>Sign Out</th>
                  <th>Duration</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td><span className={`badge ${r.type === 'office' ? 'badge-warning' : 'badge-active'}`}>{(r.type || 'wfh').toUpperCase()}</span></td>
                    <td>{new Date(r.sign_in_time).toLocaleTimeString()}</td>
                    <td>{r.sign_out_time ? new Date(r.sign_out_time).toLocaleTimeString() : '—'}</td>
                    <td>{calcDuration(r)}</td>
                    <td className="notes-cell">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.totalPages > 1 && (
            <WindowedPagination page={data.page} totalPages={data.totalPages} onChange={fetchHistory} />
          )}
        </>
      )}
    </div>
  );
}
