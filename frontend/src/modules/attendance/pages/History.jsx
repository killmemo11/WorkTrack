// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import api from '../../../shared/api';
import { formatDate } from '../../../shared/utils/date';

function calcDuration(r) {
  if (!r.sign_out_time) return '\u2014';
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
  if (start > 2) pages.push({ n: null, label: '\u2026' });
  for (let i = start; i <= end; i++) pages.push({ n: i, label: String(i) });
  if (end < totalPages - 1) pages.push({ n: null, label: '\u2026' });
  if (end < totalPages) pages.push({ n: totalPages, label: String(totalPages) });
  return (
    <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 20 }}>
      <button className={`glass-btn glass-btn-sm ${page === 1 ? '' : 'glass-btn-ghost'}`} disabled={page === 1} onClick={() => onChange(page - 1)}>&laquo;</button>
      {pages.map((p, i) =>
        p.n === null
          ? <span key={`ellipsis-${i}`} style={{ color: 'var(--text-dim)', padding: '0 4px' }}>{p.label}</span>
          : <button key={p.n} className={`glass-btn glass-btn-sm ${p.n === page ? 'glass-btn-primary' : 'glass-btn-ghost'}`} onClick={() => onChange(p.n)}>{p.label}</button>
      )}
      <button className={`glass-btn glass-btn-sm ${page === totalPages ? '' : 'glass-btn-ghost'}`} disabled={page === totalPages} onClick={() => onChange(page + 1)}>&raquo;</button>
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
      <div className="glass-page-header">
        <h1>Attendance History</h1>
      </div>

      {loading && (
        <div className="glass-loading">
          <div className="spinner" />
          <span>Loading...</span>
        </div>
      )}

      {error && <div className="glass-alert glass-alert-danger">{error}</div>}

      {!loading && !error && data.records.length === 0 && (
        <div className="glass-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <h3>No records yet.</h3>
        </div>
      )}

      {!loading && !error && data.records.length > 0 && (
        <>
          <div className="glass-summary-bar">
            <span className="summary-item">Total: <strong>{data.total}</strong></span>
            <span className="summary-item">Page: <strong>{data.page} / {data.totalPages}</strong></span>
          </div>

          <div className="glass-table-wrapper">
            <table className="glass-table">
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
                    <td>{formatDate(r.date)}</td>
                    <td><span className={`glass-badge ${r.type === 'office' ? 'glass-badge-warning' : 'glass-badge-info'}`}>{(r.type || 'wfh').toUpperCase()}</span></td>
                    <td>{new Date(r.sign_in_time).toLocaleTimeString()}</td>
                    <td>{r.sign_out_time ? new Date(r.sign_out_time).toLocaleTimeString() : '\u2014'}</td>
                    <td>{calcDuration(r)}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes || '\u2014'}</td>
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
