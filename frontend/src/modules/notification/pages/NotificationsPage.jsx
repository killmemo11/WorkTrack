// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../shared/api';
import Pagination from '../../../shared/components/Pagination';

const typeIconMap = { success: 'lucide:check-circle-2', warning: 'lucide:alert-triangle', error: 'lucide:x-circle', info: 'lucide:info' };

export default function NotificationsPage() {
  const [data, setData] = useState({ notifications: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filter) params.set('filter', filter);
      const res = await api.get(`/auth/notifications?${params}`);
      setData(res.data);
    } catch (err) { console.error('Failed to load notifications:', err); }
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [filter]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/auth/notifications/${id}/read`);
      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => n.id === id ? { ...n, is_read: 1 } : n),
      }));
    } catch (err) { console.error(err); }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/auth/notifications/read-all');
      setData((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, is_read: 1 })),
      }));
      setSelected(new Set());
    } catch (err) { console.error(err); }
  };

  const handleBulkRead = async () => {
    for (const id of selected) {
      await handleMarkAsRead(id);
    }
    setSelected(new Set());
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.notifications.map((n) => n.id)));
    }
    setSelectAll(!selectAll);
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    setSelectAll(next.size === data.notifications.length);
  };

  const handleClick = (n) => {
    if (!n.is_read) handleMarkAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  const unreadCount = data.notifications.filter((n) => !n.is_read).length;

  if (loading && data.notifications.length === 0) {
    return <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>;
  }

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1>Notifications</h1>
          <p className="subtitle">{data.total} total {unreadCount > 0 ? `(${unreadCount} unread)` : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selected.size > 0 && (
            <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={handleBulkRead}>
              Mark {selected.size} as read
            </button>
          )}
          {unreadCount > 0 && (
            <button className="glass-btn glass-btn-primary glass-btn-sm" onClick={handleMarkAllRead}>
              <span className="iconify" data-icon="lucide:check-check" style={{ marginRight: 6 }} /> Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="glass-tabs" style={{ marginBottom: 16 }}>
        {['', 'unread', 'read'].map(f => (
          <button key={f || 'all'} className={`glass-tab ${(filter === f && !(f === '' && filter === 'unread')) || (f === '' && !filter) ? 'glass-tab-active' : ''}`}
            onClick={() => setFilter(f)}>
            {f || 'All'}{f === 'unread' ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      <div className="glass-table-wrapper">
        {data.notifications.length === 0 ? (
          <div className="glass-empty">
            <span className="iconify" data-icon="lucide:bell-off" style={{ fontSize: 48, color: 'var(--text-dim)' }} />
            <h3>{filter ? 'No notifications match this filter.' : 'No notifications yet.'}</h3>
          </div>
        ) : (
          <>
            <table className="glass-table" style={{ minWidth: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={selectAll && data.notifications.length > 0}
                      onChange={handleSelectAll} />
                  </th>
                  <th style={{ width: 40 }}></th>
                  <th>Message</th>
                  <th style={{ width: 140 }}>Date</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {data.notifications.map((n) => (
                  <tr key={n.id} className={!n.is_read ? 'notif-row-unread' : ''}
                    style={{ cursor: 'pointer' }}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(n.id)}
                        onChange={() => toggleSelect(n.id)} />
                    </td>
                    <td onClick={() => handleClick(n)}>
                      <span className="iconify" data-icon={typeIconMap[n.type] || 'lucide:info'} style={{ fontSize: '1.2rem', color: n.type === 'success' ? 'var(--color-success)' : n.type === 'warning' ? 'var(--color-warning)' : n.type === 'error' ? 'var(--color-danger)' : 'var(--brand-primary)' }} />
                    </td>
                    <td onClick={() => handleClick(n)}>
                      <div style={{ fontWeight: !n.is_read ? 600 : 400, marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{n.message}</div>
                    </td>
                    <td onClick={() => handleClick(n)} className="cell-mono" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {!n.is_read && (
                        <button className="glass-btn glass-btn-ghost glass-btn-xs" onClick={() => handleMarkAsRead(n.id)}>
                          Mark read
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-glass)' }}>
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={fetchNotifications} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
