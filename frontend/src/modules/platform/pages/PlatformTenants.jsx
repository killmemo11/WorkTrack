// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../shared/components/Icon';
import Pagination from '../../../shared/components/Pagination';

const STATUS_CONFIG = {
  active: { label: 'Active', color: 'success' },
  trial: { label: 'Trial', color: 'info' },
  suspended: { label: 'Suspended', color: 'warning' },
  cancelled: { label: 'Cancelled', color: 'error' },
  pending: { label: 'Pending', color: 'warning' },
};

export default function PlatformTenants() {
  const [data, setData] = useState({ tenants: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  const fetchTenants = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('platformToken');
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      const res = await fetch(`/api/platform/tenants?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenants(1); }, [statusFilter]);
  
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => fetchTenants(1), 300);
    setSearchTimeout(timeout);
  };

  const handleSuspend = async (id, name) => {
    const reason = prompt(`Suspend tenant "${name}"? Enter reason:`);
    if (reason === null) return;
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch(`/api/platform/tenants/${id}/suspend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) fetchTenants(data.page);
      else alert('Failed to suspend');
    } catch { alert('Failed to suspend'); }
  };

  const handleActivate = async (id, name) => {
    if (!confirm(`Reactivate tenant "${name}"?`)) return;
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch(`/api/platform/tenants/${id}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchTenants(data.page);
      else alert('Failed to activate');
    } catch { alert('Failed to activate'); }
  };

  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString() : '—';

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Tenants</h1>
          <p>Manage all tenant accounts on the platform</p>
        </div>
        <Link to="/platform/tenants/new" className="glass-btn glass-btn-primary">
          <Icon icon="lucide:plus" size={16} /> New Tenant
        </Link>
      </div>

      <div className="glass-card">
        <div className="platform-filters">
          <div className="platform-search">
            <Icon icon="lucide:search" className="search-icon" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={search}
              onChange={handleSearch}
              className="glass-input"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="glass-select">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="glass-loading"><div className="spinner" /><span>Loading tenants...</span></div>
        ) : data.tenants.length === 0 ? (
          <div className="platform-empty-state">
            <Icon icon="lucide:building-2" size={48} />
            <h3>No Tenants Found</h3>
            <p>{search || statusFilter ? 'Try adjusting your filters' : 'No tenants created yet'}</p>
          </div>
        ) : (
          <>
            <div className="platform-table-wrapper">
              <table className="platform-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Plan</th>
                    <th>Employees</th>
                    <th>Status</th>
                    <th>Trial Ends</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map((tenant) => {
                    const status = STATUS_CONFIG[tenant.status] || { label: tenant.status, color: 'default' };
                    return (
                      <tr key={tenant.id}>
                        <td>
                          <div className="platform-table-tenant">
                            <strong>{tenant.name}</strong>
                            <span className="tenant-slug">{tenant.slug}</span>
                            {tenant.domain && <span className="tenant-domain">{tenant.domain}</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`glass-badge glass-badge-${tenant.plan === 'enterprise' ? 'success' : tenant.plan === 'trial' ? 'info' : 'default'}`}>
                            {tenant.plan}
                          </span>
                        </td>
                        <td>
                          {tenant.employee_count || 0} / {tenant.max_employees}
                        </td>
                        <td>
                          <span className={`glass-badge glass-badge-${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td>{formatDate(tenant.trial_ends_at)}</td>
                        <td>{formatDate(tenant.created_at)}</td>
                        <td>
                          <div className="platform-table-actions">
                            <Link to={`/platform/tenants/${tenant.id}`} className="glass-btn glass-btn-sm glass-btn-ghost">
                              <Icon icon="lucide:eye" size={14} />
                            </Link>
                            {tenant.status === 'suspended' ? (
                              <button onClick={() => handleActivate(tenant.id, tenant.name)} className="glass-btn glass-btn-sm glass-btn-success">
                                <Icon icon="lucide:check" size={14} />
                              </button>
                            ) : tenant.status !== 'cancelled' ? (
                              <button onClick={() => handleSuspend(tenant.id, tenant.name)} className="glass-btn glass-btn-sm glass-btn-warning">
                                <Icon icon="lucide:pause" size={14} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                onPageChange={fetchTenants}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}