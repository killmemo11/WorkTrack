// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useCallback } from 'react';
import Icon from '../../../shared/components/Icon';
import Pagination from '../../../shared/components/Pagination';
import adminApi from '../../../shared/api/adminApi';

const actionLabels = {
  admin_login: 'Admin Login', settings_updated: 'Settings Updated', profile_updated: 'Profile Updated',
  employee_deleted: 'Employee Deleted', record_deleted: 'Record Deleted', report_exported: 'Report Exported',
  leave_submitted: 'Leave Submitted', leave_approved: 'Leave Approved', leave_rejected: 'Leave Rejected',
  leave_cancelled: 'Leave Cancelled', signout_approved: 'Sign-Out Approved', signout_rejected: 'Sign-Out Rejected',
  signout_direct_update: 'Sign-Out Direct Update', missing_signout_check: 'Missing Sign-Out Check',
  job_created: 'Job Created', candidate_created: 'Candidate Created', offer_created: 'Offer Created',
  hired_from_recruitment: 'Hired', resignation_approved: 'Resignation Approved', resignation_rejected: 'Resignation Rejected',
  asset_assigned: 'Asset Assigned', asset_returned: 'Asset Returned', document_verified: 'Document Verified',
  document_rejected: 'Document Rejected', role_created: 'Role Created', role_updated: 'Role Updated',
  role_assigned: 'Role Assigned', role_removed: 'Role Removed', service_toggled: 'Service Toggled',
  it_settings_updated: 'IT Settings Updated', password_set_via_magic_link: 'Password Set',
  role_deleted: 'Role Deleted', department_created: 'Department Created', department_updated: 'Department Updated',
  test_email_sent: 'Test Email Sent', leave_balance_adjusted: 'Balance Adjusted',
  contract_template_created: 'Contract Template Created', magic_link_requested: 'Magic Link Requested',
};

const actionCategories = {
  'Authentication': ['admin_login', 'password_set_via_magic_link', 'magic_link_requested'],
  'User Management': ['employee_deleted', 'profile_updated', 'department_created', 'department_updated'],
  'Settings': ['settings_updated', 'it_settings_updated', 'service_toggled', 'test_email_sent'],
  'Access Control': ['role_created', 'role_updated', 'role_assigned', 'role_removed', 'role_deleted'],
  'Leave': ['leave_submitted', 'leave_approved', 'leave_rejected', 'leave_cancelled', 'leave_balance_adjusted'],
  'Attendance': ['signout_approved', 'signout_rejected', 'signout_direct_update', 'missing_signout_check'],
  'Recruitment': ['job_created', 'candidate_created', 'offer_created', 'hired_from_recruitment'],
  'Assets': ['asset_assigned', 'asset_returned'],
  'Documents': ['document_verified', 'document_rejected'],
  'Compliance': ['report_exported', 'record_deleted'],
  'Contracts': ['contract_template_created'],
};

const categoryColors = {
  'Authentication': '#3b82f6',
  'User Management': '#8b5cf6',
  'Settings': '#22c55e',
  'Access Control': '#f59e0b',
  'Leave': '#ec4899',
  'Attendance': '#ef4444',
  'Recruitment': '#06b6d4',
  'Assets': '#6366f1',
  'Documents': '#14b8a6',
  'Compliance': '#dc2626',
  'Contracts': '#a855f7',
};

const DATE_PRESETS = [
  { label: 'Last 24 hours', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

export default function AuditPortal({ initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'activity');
  const [activityData, setActivityData] = useState({ entries: [], total: 0, page: 1, totalPages: 1 });
  const [auditData, setAuditData] = useState({ entries: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: '',
    category: '',
    date_from: '',
    date_to: '',
    search: '',
    user_id: '',
    admin_id: '',
  });
  const [datePreset, setDatePreset] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [complianceMode, setComplianceMode] = useState(false);

  const fetchActivity = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filter.action) params.action = filter.action;
      if (filter.category) params.category = filter.category;
      if (filter.date_from) params.date_from = filter.date_from;
      if (filter.date_to) params.date_to = filter.date_to;
      if (filter.search) params.search = filter.search;
      if (filter.user_id) params.employee_id = filter.user_id;
      if (filter.admin_id) params.admin_id = filter.admin_id;
      const res = await adminApi.get('/audit/activity-log', { params });
      setActivityData(res.data);
    } catch (err) { console.error('Failed:', err); }
    setLoading(false);
  }, [filter]);

  const fetchAudit = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.get('/audit/balance-audit', { params: { page, limit: 50 } });
      setAuditData(res.data);
    } catch (err) { console.error('Failed:', err); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'activity') fetchActivity(1);
    else fetchAudit(1);
  }, [activeTab, filter, fetchActivity, fetchAudit]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (activeTab === 'activity') fetchActivity(1);
      else fetchAudit(1);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, fetchActivity, fetchAudit]);

  const handleDatePreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setFilter(f => ({
      ...f,
      date_from: start.toISOString().split('T')[0],
      date_to: end.toISOString().split('T')[0],
    }));
    setDatePreset(`${days}d`);
  };

  const handleClearFilters = () => {
    setFilter({
      action: '', category: '', date_from: '', date_to: '', search: '', user_id: '', admin_id: ''
    });
    setDatePreset('');
  };

  const handleExport = async (type = 'activity') => {
    try {
      let url = '/audit/export';
      if (type === 'balance') url = '/audit/export-balance';
      
      const params = {};
      if (filter.action) params.action = filter.action;
      if (filter.category) params.category = filter.category;
      if (filter.date_from) params.date_from = filter.date_from;
      if (filter.date_to) params.date_to = filter.date_to;
      if (filter.search) params.search = filter.search;
      
      const res = await adminApi.get(url, { params, responseType: 'blob' });
      const blobUrl = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${type}_audit_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch { alert('Export failed'); }
  };

  const generateComplianceReport = async () => {
    try {
      const res = await adminApi.post('/audit/compliance-report', { date_from: filter.date_from, date_to: filter.date_to }, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `compliance_report_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch { alert('Failed to generate compliance report'); }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getCategoryForAction = (action) => {
    for (const [cat, actions] of Object.entries(actionCategories)) {
      if (actions.includes(action)) return cat;
    }
    return 'Other';
  };

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1>Internal Audit Portal</h1>
          <p className="subtitle" style={{color:'var(--text-dim)'}}>System activity logs, compliance tracking & audit trail</p>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
          <button className="glass-btn glass-btn-primary" onClick={() => handleExport('activity')}>
            <Icon icon="lucide:download" size={16} /> Export Activity
          </button>
          <button className="glass-btn glass-btn-primary" onClick={() => handleExport('balance')}>
            <Icon icon="lucide:download" size={16} /> Export Balance
          </button>
          {complianceMode && (
            <button className="glass-btn glass-btn-error" onClick={generateComplianceReport}>
              <Icon icon="lucide:file-text" size={16} /> Compliance Report
            </button>
          )}
          <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.8rem',cursor:'pointer'}}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh (30s)
          </label>
          <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'0.8rem',cursor:'pointer'}}>
            <input type="checkbox" checked={complianceMode} onChange={(e) => setComplianceMode(e.target.checked)} />
            Compliance Mode
          </label>
        </div>
      </div>

      <div className="glass-card">
        <div style={{display:'flex',gap:'8px',padding:'12px 20px',borderBottom:'1px solid var(--border-light)'}}>
          <button className={`glass-btn glass-btn-sm ${activeTab === 'activity' ? 'glass-btn-primary' : 'glass-btn-ghost'}`} onClick={() => setActiveTab('activity')}>
            <Icon icon="lucide:activity" size={14} /> Activity Log
          </button>
          <button className={`glass-btn glass-btn-sm ${activeTab === 'balance' ? 'glass-btn-primary' : 'glass-btn-ghost'}`} onClick={() => setActiveTab('balance')}>
            <Icon icon="lucide:scale" size={14} /> Balance Audit
          </button>
        </div>

        {activeTab === 'activity' && (
          <>
            {/* Advanced Filters */}
            <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border-light)',background:'var(--bg-content)'}}>
              <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginBottom:'12px',alignItems:'flex-end'}}>
                {/* Date Presets */}
                <div>
                  <label style={{fontSize:'0.7rem',fontWeight:600,color:'var(--text-muted)',marginBottom:'4px',display:'block'}}>
                    Quick Range
                  </label>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {DATE_PRESETS.map(p => (
                      <button
                        key={p.days}
                        className={`glass-btn glass-btn-sm ${datePreset === `${p.days}d` ? 'glass-btn-primary' : 'glass-btn-ghost'}`}
                        onClick={() => handleDatePreset(p.days)}
                        style={{padding:'4px 10px',fontSize:'0.7rem'}}
                      >
                        {p.label}
                      </button>
                    ))}
                    <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={handleClearFilters} style={{padding:'4px 10px',fontSize:'0.7rem'}}>
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Category Filter */}
                <div style={{minWidth:'180px'}}>
                  <label style={{fontSize:'0.7rem',fontWeight:600,color:'var(--text-muted)',marginBottom:'4px',display:'block'}}>
                    Category
                  </label>
                  <select className="glass-select" style={{padding:'6px 10px',width:'100%'}} value={filter.category} onChange={(e) => setFilter(f => ({...f, category: e.target.value}))}>
                    <option value="">All Categories</option>
                    {Object.entries(actionCategories).map(([cat, actions]) => (
                      <option key={cat} value={cat} style={{color: categoryColors[cat]}}>{cat} ({actions.length})</option>
                    ))}
                  </select>
                </div>

                {/* Action Filter */}
                <div style={{minWidth:'180px'}}>
                  <label style={{fontSize:'0.7rem',fontWeight:600,color:'var(--text-muted)',marginBottom:'4px',display:'block'}}>
                    Action
                  </label>
                  <select className="glass-select" style={{padding:'6px 10px',width:'100%'}} value={filter.action} onChange={(e) => setFilter(f => ({...f, action: e.target.value}))}>
                    <option value="">All Actions</option>
                    {Object.entries(actionLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div style={{flex:1,minWidth:'200px'}}>
                  <label style={{fontSize:'0.7rem',fontWeight:600,color:'var(--text-muted)',marginBottom:'4px',display:'block'}}>
                    Search (description, employee, admin)
                  </label>
                  <input type="text" className="glass-input" placeholder="Search..." 
                    value={filter.search} onChange={(e) => setFilter(f => ({...f, search: e.target.value}))} 
                    style={{padding:'6px 10px',width:'100%'}} />
                </div>
              </div>

              {/* Advanced Filters Row */}
              <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'flex-end'}}>
                <div style={{minWidth:'160px'}}>
                  <label style={{fontSize:'0.7rem',fontWeight:600,color:'var(--text-muted)',marginBottom:'4px',display:'block'}}>
                    Employee ID
                  </label>
                  <input type="number" className="glass-input" placeholder="Employee ID" 
                    value={filter.user_id} onChange={(e) => setFilter(f => ({...f, user_id: e.target.value}))} 
                    style={{padding:'6px 10px',width:'100%'}} />
                </div>
                <div style={{minWidth:'160px'}}>
                  <label style={{fontSize:'0.7rem',fontWeight:600,color:'var(--text-muted)',marginBottom:'4px',display:'block'}}>
                    Admin ID
                  </label>
                  <input type="number" className="glass-input" placeholder="Admin ID" 
                    value={filter.admin_id} onChange={(e) => setFilter(f => ({...f, admin_id: e.target.value}))} 
                    style={{padding:'6px 10px',width:'100%'}} />
                </div>
                <div style={{minWidth:'160px'}}>
                  <label style={{fontSize:'0.7rem',fontWeight:600,color:'var(--text-muted)',marginBottom:'4px',display:'block'}}>
                    From Date
                  </label>
                  <input type="date" className="glass-input" style={{padding:'6px 10px',width:'100%'}} value={filter.date_from} onChange={(e) => setFilter(f => ({...f, date_from: e.target.value}))} />
                </div>
                <div style={{minWidth:'160px'}}>
                  <label style={{fontSize:'0.7rem',fontWeight:600,color:'var(--text-muted)',marginBottom:'4px',display:'block'}}>
                    To Date
                  </label>
                  <input type="date" className="glass-input" style={{padding:'6px 10px',width:'100%'}} value={filter.date_to} onChange={(e) => setFilter(f => ({...f, date_to: e.target.value}))} />
                </div>
              </div>
            </div>

            {/* Active Filters Indicator */}
            {(filter.action || filter.category || filter.date_from || filter.date_to || filter.search || filter.user_id || filter.admin_id) && (
              <div style={{padding:'8px 20px',borderBottom:'1px solid var(--border-light)',background:'#fef3c7',borderRadius:'8px',margin:'0 20px 12px',display:'flex',flexWrap:'wrap',gap:'6px',alignItems:'center'}}>
                <span style={{fontSize:'0.7rem',color:'#92400e',fontWeight:600}}>Active Filters:</span>
                {filter.category && <span className="glass-badge glass-badge-warning" style={{fontSize:'0.65rem'}}>{filter.category} ×</span>}
                {filter.action && <span className="glass-badge glass-badge-info" style={{fontSize:'0.65rem'}}>{actionLabels[filter.action] || filter.action} ×</span>}
                {filter.date_from && <span className="glass-badge glass-badge-default" style={{fontSize:'0.65rem'}}>{filter.date_from} → {filter.date_to || 'now'} ×</span>}
                {filter.search && <span className="glass-badge glass-badge-default" style={{fontSize:'0.65rem'}}>"{filter.search}" ×</span>}
                {filter.user_id && <span className="glass-badge glass-badge-default" style={{fontSize:'0.65rem'}}>Emp: {filter.user_id} ×</span>}
                {filter.admin_id && <span className="glass-badge glass-badge-default" style={{fontSize:'0.65rem'}}>Admin: {filter.admin_id} ×</span>}
                <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={handleClearFilters} style={{padding:'2px 8px',fontSize:'0.65rem'}}>
                  Clear All
                </button>
              </div>
            )}

{/* Results Table */}
            {loading ? (
              <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>
            ) : (
              <>
                <div style={{overflowX:'auto'}}>
                  <table className="glass-table" style={{width:'100%'}}>
                    <thead>
                      <tr>
                        <th style={{padding:'12px 16px',textAlign:'left'}}>Date</th>
                        <th style={{textAlign:'left'}}>Category</th>
                        <th style={{textAlign:'left'}}>Action</th>
                        <th style={{textAlign:'left'}}>Description</th>
                        <th style={{textAlign:'left'}}>Old Value</th>
                        <th style={{textAlign:'left'}}>New Value</th>
                        <th style={{textAlign:'left'}}>Employee</th>
                        <th style={{textAlign:'left'}}>Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityData.entries.length === 0 ? (
                        <tr><td colSpan={8} style={{padding:'48px',textAlign:'center',color:'var(--text-muted)'}}>No activity records found</td></tr>
                      ) : (
                        activityData.entries.map((entry) => {
                          const cat = getCategoryForAction(entry.action);
                          const catColor = categoryColors[cat] || '#64748b';
                          return (
                            <tr key={entry.id} style={{borderBottom:'1px solid var(--border-light)'}}>
                              <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>{formatDate(entry.created_at)}</td>
                              <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>
                                <span style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'2px 8px',borderRadius:'10px',fontSize:'0.65rem',fontWeight:600,background:`${catColor}15`,color:catColor}}>
                                  <span style={{width:'6px',height:'6px',borderRadius:'50%',background:catColor}} />
                                  {cat}
                                </span>
                              </td>
                              <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>
                                <span className="glass-badge glass-badge-info" style={{fontSize:'0.7rem'}}>
                                  {actionLabels[entry.action] || entry.action}
                                </span>
                              </td>
                              <td style={{padding:'10px 16px',fontSize:'0.8rem',maxWidth:'350px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{entry.description}</td>
                              <td style={{padding:'10px 16px',fontSize:'0.75rem',maxWidth:'150px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text-dim)'}}>{entry.old_value || '—'}</td>
                              <td style={{padding:'10px 16px',fontSize:'0.75rem',maxWidth:'150px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--text-dim)'}}>{entry.new_value || '—'}</td>
                              <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>{entry.employee_name || '—'}</td>
                              <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>{entry.admin_username || '—'}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {activityData.totalPages > 1 && <Pagination currentPage={activityData.page} totalPages={activityData.totalPages} onPageChange={fetchActivity} />}
                </>
            )}
          </>
        )}
        
        {activeTab === 'balance' && (
          <>
            {loading ? (
              <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>
            ) : (
              <>
                <div style={{overflowX:'auto'}}>
                  <table className="glass-table" style={{width:'100%'}}>
                    <thead>
                      <tr>
                        <th style={{padding:'12px 16px',textAlign:'left'}}>Date</th>
                        <th style={{textAlign:'left'}}>Employee</th>
                        <th style={{textAlign:'left'}}>Leave Type</th>
                        <th style={{textAlign:'left'}}>Action</th>
                        <th style={{textAlign:'left'}}>Old Balance</th>
                        <th style={{textAlign:'left'}}>New Balance</th>
                        <th style={{textAlign:'left'}}>Change</th>
                        <th style={{textAlign:'left'}}>Performed By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditData.entries.map((entry) => (
                        <tr key={entry.id} style={{borderBottom:'1px solid var(--border-light)'}}>
                          <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>{formatDate(entry.created_at)}</td>
                          <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>{entry.employee_name || '—'}</td>
                          <td style={{padding:'10px 16px',fontSize:'0.8rem',textTransform:'capitalize'}}>{entry.leave_type}</td>
                          <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>
                            <span className={`glass-badge ${entry.action === 'deduct' ? 'glass-badge-warning' : entry.action === 'restore' ? 'glass-badge-success' : 'glass-badge-default'}`}>
                              {entry.action}
                            </span>
                          </td>
                          <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>{entry.old_balance}</td>
                          <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>{entry.new_balance}</td>
                          <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>{entry.change_amount > 0 ? `+${entry.change_amount}` : entry.change_amount}</td>
                          <td style={{padding:'10px 16px',fontSize:'0.8rem'}}>{entry.performed_by_name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {auditData.totalPages > 1 && <Pagination currentPage={auditData.page} totalPages={auditData.totalPages} onPageChange={fetchAudit} />}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}