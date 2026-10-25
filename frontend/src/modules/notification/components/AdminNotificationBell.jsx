// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useRef } from 'react';
import Icon from '../../../shared/components/Icon';
import adminApi from '../../../shared/api/adminApi';
import { formatDate, formatTime } from '../../../shared/utils/date';

const typeIcons = {
  success: { icon: 'lucide:check-circle', color: 'var(--success)' },
  warning: { icon: 'lucide:alert-triangle', color: 'var(--warning)' },
  error: { icon: 'lucide:x-circle', color: 'var(--error)' },
  info: { icon: 'lucide:info', color: '#3b82f6' },
};

export default function AdminNotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);

  const fetchUnread = async () => {
    try {
      const res = await adminApi.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (err) { /* silent */ }
  };

  const fetchNotifications = async () => {
    try {
      const res = await adminApi.get('/notifications?limit=10');
      setNotifications(res.data.notifications || []);
    } catch (err) { /* silent */ }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const toggleOpen = () => {
    if (!open) fetchNotifications();
    setOpen(!open);
  };

  const handleClick = async (n) => {
    try {
      await adminApi.put(`/notifications/${n.id}/read`);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: 1 } : x));
    } catch (err) { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await adminApi.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((x) => ({ ...x, is_read: 1 })));
    } catch (err) { /* silent */ }
  };

  return (
    <div className="notif-bell" ref={ref} style={{ display: 'inline-block', marginLeft: 8 }}>
      <button
        ref={buttonRef}
        type="button"
        className="notif-bell-btn"
        onClick={toggleOpen}
        title="Admin Notifications"
        aria-label={unreadCount > 0 ? `Admin notifications, ${unreadCount} unread` : 'Admin notifications'}
        aria-expanded={open}
        aria-controls="admin-notification-panel"
        aria-haspopup="true"
      >
        <Icon icon="lucide:bell" />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown" id="admin-notification-panel" style={{ left: '100%', right: 'auto', bottom: 0, top: 'auto' }}>
          <div className="notif-header">
            <span>Admin Notifications</span>
            {unreadCount > 0 && (
              <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={markAllRead}>Mark all read</button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty">No notifications</div>
            )}
            {notifications.slice(0, 10).map((n) => {
              const typeInfo = typeIcons[n.type] || typeIcons.info;
              return (
                <button key={n.id}
                  type="button"
                  className={`notif-item ${!n.is_read ? 'notif-unread' : ''}`}
                  onClick={() => handleClick(n)}>
                  <span className="notif-item-icon">
                    <Icon icon={typeInfo.icon} style={{ color: typeInfo.color }} />
                  </span>
                  <div className="notif-item-content">
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-msg">{n.message}</div>
                    <div className="notif-item-time">
                      {n.created_at ? formatDate(n.created_at) + ' ' + formatTime(n.created_at) : ''}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
