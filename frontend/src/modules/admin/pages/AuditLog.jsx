// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import HRLayout from '../../../shared/components/Layout/HRLayout';
import Pagination from '../../../shared/components/Pagination';

const actionLabels = { deduct: 'Deducted', restore: 'Restored', reset: 'Reset' };
const actionBadgeMap = { deduct: 'warning', restore: 'success', reset: 'default' };

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
        <div className="glass-page-header">
          <div>
            <h1>Balance Audit Log</h1>
            <p className="subtitle" style={{color:'var(--text-dim)'}}>Track all leave balance changes</p>
          </div>
        </div>

        {loading && <div className="glass-loading"><div className="spinner"/><span>Loading...</span></div>}
        {!loading && <>
        <div className="glass-summary-bar">
          <span>Total Entries: <strong>{data.total}</strong></span>
          <span>Page: <strong>{data.page} / {data.totalPages}</strong></span>
        </div>

        <div className="glass-table-wrapper fade-in-up">
          <table className="glass-table">
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
                <tr><td colSpan={8}><div className="glass-empty"><span className="iconify" data-icon="lucide:scroll-text"/><p>No audit entries yet.</p></div></td></tr>
              )}
              {data.entries.map((e) => (
                <tr key={e.id}>
                  <td className="cell-mono">{new Date(e.created_at).toLocaleDateString()}</td>
                  <td><strong>{e.employee_name}</strong> <span className="cell-mono">#{e.emp_number}</span></td>
                  <td><span className="glass-badge glass-badge-primary">{e.leave_type}</span></td>
                  <td><span className={`glass-badge glass-badge-${actionBadgeMap[e.action] || 'default'}`}>{actionLabels[e.action] || e.action}</span></td>
                  <td className="cell-mono">{e.old_balance}</td>
                  <td className="cell-mono">{e.new_balance}</td>
                  <td className="cell-mono" style={{ color: e.change_amount < 0 ? 'var(--danger)' : 'var(--success)' }}>
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
