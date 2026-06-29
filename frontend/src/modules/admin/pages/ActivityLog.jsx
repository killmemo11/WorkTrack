// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import adminApi from '../../../shared/api/adminApi';
import Pagination from '../../../shared/components/Pagination';

const ACTION_LABELS = {
  hr_login: 'HR Login',
  record_deleted: 'Record Deleted',
  report_exported: 'Report Exported',
  missing_signout_check: 'Missing Sign-Out Check',
  department_created: 'Department Created',
  department_updated: 'Department Updated',
  department_deleted: 'Department Deleted',
  departments_imported: 'Departments Imported',
  settings_updated: 'Settings Updated',
  test_email_sent: 'Test Email Sent',
  leave_balance_adjusted: 'Leave Balance Adjusted',
  leave_cancelled: 'Leave Cancelled',
  leave_submitted: 'Leave Submitted',
  leave_approved: 'Leave Approved',
  leave_rejected: 'Leave Rejected',
  employee_deleted: 'Employee Deleted',
  profile_updated: 'Profile Updated',
  signout_approved: 'Sign-Out Approved',
  signout_rejected: 'Sign-Out Rejected',
  signout_direct_update: 'Sign-Out Direct Update',
  job_created: 'Job Created',
  candidate_created: 'Candidate Created',
  offer_created: 'Offer Created',
  hired_from_recruitment: 'Hired From Recruitment',
  resignation_approved: 'Resignation Approved',
  resignation_rejected: 'Resignation Rejected',
  asset_assigned: 'Asset Assigned',
  asset_returned: 'Asset Returned',
  document_verified: 'Document Verified',
  document_rejected: 'Document Rejected',
  contract_template_created: 'Contract Template Created',
  contract_template_updated: 'Contract Template Updated',
  contract_template_deleted: 'Contract Template Deleted',
  contract_generated: 'Contract Generated',
  contract_signed: 'Contract Signed',
  checklist_template_created: 'Checklist Template Created',
  checklist_template_updated: 'Checklist Template Updated',
  checklist_template_deleted: 'Checklist Template Deleted',
  checklist_started: 'Checklist Started',
  checklist_task_completed: 'Checklist Task Completed',
  asset_created: 'Asset Created',
  asset_updated: 'Asset Updated',
  asset_deleted: 'Asset Deleted',
  asset_damaged: 'Asset Damaged',
  asset_disposed: 'Asset Disposed',
  holiday_created: 'Holiday Created',
  holiday_deleted: 'Holiday Deleted',
  department_created: 'Department Created',
  department_updated: 'Department Updated',
  department_deleted: 'Department Deleted',
  departments_imported: 'Departments Imported',
  position_created: 'Position Created',
  position_updated: 'Position Updated',
  position_deleted: 'Position Deleted',
  document_uploaded: 'Document Uploaded',
  document_deleted: 'Document Deleted',
  insurance_card_uploaded: 'Insurance Card Uploaded',
  avatar_uploaded: 'Avatar Uploaded',
  family_card_uploaded: 'Family Card Uploaded',
  status_change: 'Status Change',
  contract_renewed: 'Contract Renewed',
  resignation_submitted: 'Resignation Submitted',
  grade_created: 'Grade Created',
  grade_updated: 'Grade Updated',
  grade_deleted: 'Grade Deleted',
  dept_title_created: 'Title Created',
  dept_title_updated: 'Title Updated',
  dept_title_deleted: 'Title Deleted',
  criteria_saved: 'Evaluation Criteria Saved',
  job_updated: 'Job Updated',
  job_deleted: 'Job Deleted',
  candidate_deleted: 'Candidate Deleted',
  candidate_moved: 'Candidate Moved',
  scorecard_added: 'Scorecard Added',
  offer_created: 'Offer Created',
};

export default function ActivityLog() {
  const [data, setData] = useState({ entries: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const api = adminApi;

  const getActionLabel = (action) => ACTION_LABELS[action] || action.replace(/_/g, ' ');
  const getActionClass = (action) => {
    if (!action) return 'badge badge-employee';
    if (action.includes('deleted') || action.includes('rejected')) return 'badge badge-warning';
    if (action.includes('created') || action.includes('approved') || action.includes('assigned')) return 'badge badge-active';
    if (action.includes('updated') || action.includes('submitted')) return 'badge badge-employee';
    return 'badge badge';
  };
  const getActorLabel = (entry) => {
    if (entry.actor_type === 'Admin') return `Admin: ${entry.actor_name}`;
    if (entry.actor_type === 'Employee') return `Employee: ${entry.actor_name}`;
    return 'System';
  };
  const getTargetLabel = (entry) => {
    if (entry.target_type === 'Employee') {
      return `${entry.target_name}${entry.target_employee_number ? ` (#${entry.target_employee_number})` : ''}`;
    }
    return 'System';
  };

  const fetchLog = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (filter) params.set('action', filter);
      const res = await api.get(`/activity-log?${params}`);
      setData(res.data);
    } catch (err) { console.error('Failed to load activity log:', err); }
    setLoading(false);
  };

  useEffect(() => { fetchLog(); }, [filter]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Activity Log</h1>
          <p className="subtitle">Audit-ready trail of user actions, with actor and affected employee.</p>
        </div>
        <div className="filter-actions">
          <select className="form-control" value={filter} onChange={(e) => { setFilter(e.target.value); }}>
            <option value="">All Actions</option>
            <option value="hr_login">HR Login</option>
            <option value="record_deleted">Record Deleted</option>
            <option value="report_exported">Report Exported</option>
            <option value="missing_signout_check">Missing Sign-Out Check</option>
            <option value="department_created">Department Created</option>
            <option value="department_updated">Department Updated</option>
            <option value="department_deleted">Department Deleted</option>
            <option value="departments_imported">Departments Imported</option>
            <option value="settings_updated">Settings Updated</option>
            <option value="test_email_sent">Test Email Sent</option>
            <option value="leave_balance_adjusted">Leave Balance Adjusted</option>
            <option value="leave_cancelled">Leave Cancelled</option>
            <option value="leave_submitted">Leave Submitted</option>
            <option value="leave_approved">Leave Approved</option>
            <option value="leave_rejected">Leave Rejected</option>
            <option value="employee_deleted">Employee Deleted</option>
            <option value="profile_updated">Profile Updated</option>
            <option value="signout_approved">Sign-Out Approved</option>
            <option value="signout_rejected">Sign-Out Rejected</option>
            <option value="signout_direct_update">Sign-Out Direct Update</option>
            <option value="job_created">Job Created</option>
            <option value="candidate_created">Candidate Created</option>
            <option value="offer_created">Offer Created</option>
            <option value="hired_from_recruitment">Hired From Recruitment</option>
            <option value="resignation_approved">Resignation Approved</option>
            <option value="resignation_rejected">Resignation Rejected</option>
            <option value="asset_assigned">Asset Assigned</option>
            <option value="asset_returned">Asset Returned</option>
          </select>
          <button className="btn btn-sm btn-primary" onClick={() => fetchLog(1)}>Filter</button>
          <button className="btn btn-sm btn-outline" onClick={() => { setFilter(''); fetchLog(1); }}>Clear</button>
        </div>
      </div>

      {loading && <div className="loading" />}
      {!loading && <>
      <div className="stats-grid activity-summary-grid">
        <div className="stat-card">
          <div className="stat-number">{data.total}</div>
          <div className="stat-label">Total activity entries</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.page}</div>
          <div className="stat-label">Current page of {data.totalPages}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{filter || 'All actions'}</div>
          <div className="stat-label">Filter</div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Action</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {data.entries.length === 0 && (
              <tr><td colSpan={5} className="empty-state">No activity entries yet.</td></tr>
            )}
            {data.entries.map((e) => (
              <tr key={e.id}>
                <td className="cell-mono" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(e.created_at).toLocaleDateString()} {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td>
                  <div><strong>{getActorLabel(e)}</strong></div>
                  <div className="cell-mono" style={{ fontSize: '0.78rem', color: '#555' }}>{e.actor_type}</div>
                </td>
                <td>
                  <div>{getTargetLabel(e)}</div>
                  <div className="cell-mono" style={{ fontSize: '0.78rem', color: '#555' }}>{e.target_type}</div>
                </td>
                <td><span className={getActionClass(e.action)}>{getActionLabel(e.action)}</span></td>
                <td className="wrap-cell" style={{ maxWidth: 420 }}>{e.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={data.page} totalPages={data.totalPages} onPageChange={fetchLog} />
      </>}
    </div>
  );
}
