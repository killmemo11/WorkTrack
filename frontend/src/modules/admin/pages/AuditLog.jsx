// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import HRLayout from '../../../shared/components/Layout/HRLayout';
import Pagination from '../../../shared/components/Pagination';

const actionLabels = { deduct: 'Deducted', restore: 'Restored', reset: 'Reset' };
const actionColors = { deduct: 'badge-warning', restore: 'badge-active', reset: 'badge' };

export default function AuditLog() {
  const [data, setData] = useState({ entries: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchAudit = async (page = 1) => {
    setLoading(true);
    try {
      const res = await hrApi.get(`/balance-audit?page=${page}&limit=50`);
      setData(res.data);
    } catch (err) { console.error('Failed to load audit log:', err); }
    setLoading(false);
  };

  useEffect(() => { fetchAudit(); }, []);

  return (
    <HRLayout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Balance Audit Log</h1>
            <p className="subtitle">Track all leave balance changes</p>
          </div>
        </div>

        {loading && <div className="loading" />}
        {!loading && <>
        <div className="summary-bar">
          <span className="summary-item">Total Entries: <strong>{data.total}</strong></span>
          <span className="summary-item">Page: <strong>{data.page} / {data.totalPages}</strong></span>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Action</th>
                <th>Old Balance</th>
                <th>New Balance</th>
                <th>Change</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.length === 0 && (
                <tr><td colSpan={8} className="empty-state">No audit entries yet.</td></tr>
              )}
              {data.entries.map((e) => (
                <tr key={e.id}>
                  <td className="cell-mono">{new Date(e.created_at).toLocaleDateString()}</td>
                  <td><strong>{e.employee_name}</strong> <span className="cell-mono">#{e.emp_number}</span></td>
                  <td><span className="badge badge-employee">{e.leave_type}</span></td>
                  <td><span className={`badge ${actionColors[e.action] || 'badge'}`}>{actionLabels[e.action] || e.action}</span></td>
                  <td className="cell-mono">{e.old_balance}</td>
                  <td className="cell-mono">{e.new_balance}</td>
                  <td className="cell-mono" style={{ color: e.change_amount < 0 ? '#ef4444' : '#22c55e' }}>
                    {e.change_amount > 0 ? '+' : ''}{e.change_amount}
                  </td>
                  <td className="cell-mono" style={{ fontSize: '0.8rem' }}>
                    {e.reference_id ? `Leave #${e.reference_id}` : e.action === 'reset' ? 'Bulk Reset' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={data.page} totalPages={data.totalPages} onPageChange={fetchAudit} />
        </>}
      </div>
    </HRLayout>
  );
}

