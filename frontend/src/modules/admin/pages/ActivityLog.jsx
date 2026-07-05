// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
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
};

const actionIcons = {
  created: 'lucide:plus',
  updated: 'lucide:pencil',
  deleted: 'lucide:trash-2',
  approved: 'lucide:check-circle',
  rejected: 'lucide:x-circle',
  login: 'lucide:log-in',
  logout: 'lucide:log-out',
  submitted: 'lucide:send',
  exported: 'lucide:download',
  assigned: 'lucide:user-plus',
  returned: 'lucide:undo-2',
  uploaded: 'lucide:upload',
  signed: 'lucide:pen-tool',
  generated: 'lucide:file-text',
  started: 'lucide:play',
  completed: 'lucide:check',
  adjusted: 'lucide:sliders',
  cancelled: 'lucide:x-circle',
  moved: 'lucide:arrow-right-left',
  verified: 'lucide:shield-check',
  damaged: 'lucide:alert-triangle',
  disposed: 'lucide:trash',
};

export default function ActivityLog() {
  const [data, setData] = useState({ entries: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const api = adminApi;

  const getActionLabel = (action) => ACTION_LABELS[action] || action.replace(/_/g, ' ');
  const getActionBadge = (action) => {
    if (!action) return 'glass-badge glass-badge-neutral';
    if (action.includes('deleted') || action.includes('rejected')) return 'glass-badge glass-badge-danger';
    if (action.includes('created') || action.includes('approved') || action.includes('assigned') || action.includes('verified') || action.includes('hired')) return 'glass-badge glass-badge-success';
    if (action.includes('updated') || action.includes('submitted') || action.includes('uploaded') || action.includes('signed') || action.includes('generated') || action.includes('started') || action.includes('completed') || action.includes('adjusted') || action.includes('saved') || action.includes('moved') || action.includes('renewed')) return 'glass-badge glass-badge-info';
    return 'glass-badge glass-badge-neutral';
  };
  const getActionIcon = (action) => {
    for (const [key, icon] of Object.entries(actionIcons)) {
      if (action.includes(key)) return icon;
    }
    return 'lucide:activity';
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
    <div className="page fade-in-up">
      <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-glass)', marginBottom: 24 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon icon="lucide:scroll-text" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}></Icon>
            Activity Log
          </h1>
          <p className="subtitle" style={{ color: 'var(--text-dim)' }}>Audit-ready trail of user actions, with actor and affected employee.</p>
        </div>
        <div className="filter-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="glass-select" value={filter} onChange={(e) => { setFilter(e.target.value); }} style={{ width: 220 }}>
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
          <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => fetchLog(1)}>
            <Icon icon="lucide:filter"></Icon> Filter
          </button>
          <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => { setFilter(''); fetchLog(1); }}>
            <Icon icon="lucide:x"></Icon> Clear
          </button>
        </div>
      </div>

      {loading && (
        <div className="glass-loading">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      )}
      {!loading && <>
      <div className="glass-grid glass-grid-3" style={{ marginBottom: 24 }}>
        <div className="glass-stat-card fade-in-up delay-1">
          <div className="glass-stat-number">{data.total}</div>
          <div className="glass-stat-label">Total activity entries</div>
        </div>
        <div className="glass-stat-card fade-in-up delay-2">
          <div className="glass-stat-number">{data.page}</div>
          <div className="glass-stat-label">Current page of {data.totalPages}</div>
        </div>
        <div className="glass-stat-card fade-in-up delay-3">
          <div className="glass-stat-number" style={{ fontSize: '1.2rem' }}>{filter || 'All actions'}</div>
          <div className="glass-stat-label">Filter</div>
        </div>
      </div>

      <div className="glass-table-wrapper fade-in-up delay-4">
        <table className="glass-table">
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
              <tr><td colSpan={5}>
                <div className="glass-empty">
                  <Icon icon="lucide:scroll-text"></Icon>
                  <h3>No activity entries yet.</h3>
                </div>
              </td></tr>
            )}
            {data.entries.map((e) => (
              <tr key={e.id}>
                <td className="cell-mono" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(e.created_at).toLocaleDateString()} {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td>
                  <div><strong>{getActorLabel(e)}</strong></div>
                  <div className="cell-mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{e.actor_type}</div>
                </td>
                <td>
                  <div>{getTargetLabel(e)}</div>
                  <div className="cell-mono" style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{e.target_type}</div>
                </td>
                <td>
                  <span className={getActionBadge(e.action)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Icon icon={getActionIcon(e.action)} style={{ fontSize: '0.7rem' }}></Icon>
                    {getActionLabel(e.action)}
                  </span>
                </td>
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
