// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from '../../../shared/components/Icon';
import { useNavigate } from 'react-router-dom';
import api from '../../../shared/api';
import { formatDate, formatTime } from '../../../shared/utils/date';

const typeIcons = {
  success: { icon: 'lucide:check-circle', color: 'var(--success)' },
  warning: { icon: 'lucide:alert-triangle', color: 'var(--warning)' },
  error: { icon: 'lucide:x-circle', color: 'var(--error)' },
  info: { icon: 'lucide:info', color: '#3b82f6' },
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();
  const prevCountRef = useRef(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get('/auth/notifications/unread-count');
      const count = res.data.count;
      if (count > prevCountRef.current && prevCountRef.current > 0) {
        setToast({ message: `${count - prevCountRef.current} new notification${count - prevCountRef.current > 1 ? 's' : ''}`, count: count - prevCountRef.current });
        setTimeout(() => setToast(null), 4000);
      }
      prevCountRef.current = count;
      setUnreadCount(count);
    } catch (err) { console.error('Failed to fetch unread count:', err); }
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/auth/notifications?limit=50');
      setNotifications(res.data.notifications || res.data);
    } catch (err) { console.error('Failed to fetch notifications:', err); }
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
    if (toast) setToast(null);
  };

  const handleClick = async (n) => {
    try {
      await api.put(`/auth/notifications/${n.id}/read`);
    } catch (err) { console.error('Failed to mark notification as read:', err); }
    setUnreadCount((c) => Math.max(0, c - 1));
    setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: 1 } : x));
    if (n.link && n.link.startsWith('/') && !n.link.startsWith('//')) navigate(n.link);
    setOpen(false);
  };

  const markAllRead = async () => {
    try {
      await api.put('/auth/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((x) => ({ ...x, is_read: 1 })));
    } catch (err) { console.error('Failed to mark all as read:', err); }
  };

  return (
    <div className="notif-bell" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className="notif-bell-btn"
        onClick={toggleOpen}
        title="Notifications"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-haspopup="true"
      >
        <Icon icon="lucide:bell" />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {toast && (
        <div role="status" aria-live="polite">
          <button type="button" className="notif-toast" onClick={() => { setToast(null); toggleOpen(); }}>
            <Icon icon="lucide:bell" style={{ color: 'var(--brand-primary)' }} />
            <span>{toast.message}</span>
          </button>
        </div>
      )}

      {open && (
        <div className="notif-dropdown" id="notification-panel">
          <div className="notif-header">
            <span>Notifications</span>
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
            {notifications.length > 10 && (
              <button type="button" className="notif-view-all" onClick={() => { setOpen(false); navigate('/notifications'); }}>
                View all {notifications.length} notifications →
              </button>
            )}
            {notifications.length > 0 && notifications.length <= 10 && (
              <button type="button" className="notif-view-all" onClick={() => { setOpen(false); navigate('/notifications'); }}>
                View all →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
