import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';

export default function PlatformActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('platformToken');
      const params = new URLSearchParams({ limit: 100 });
      const res = await fetch(`/api/platform/activity?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setActivities(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchActivity(); }, []);

  const filtered = actionFilter
    ? activities.filter(a => a.action.includes(actionFilter))
    : activities;

  const formatDate = (d) => d ? new Date(d).toLocaleString() : '—';

  const uniqueActions = [...new Set(activities.map(a => a.action))].sort();

  if (loading) return <div className="glass-loading"><div className="spinner" /><span>Loading activity...</span></div>;

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Platform Activity</h1>
          <p>Audit log of all platform-level actions</p>
        </div>
      </div>

      <div className="glass-card">
        <div className="platform-filters">
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="glass-select">
            <option value="">All Actions</option>
            {uniqueActions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <span className="platform-filter-count">
            {filtered.length} events
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="platform-empty-state">
            <Icon icon="lucide:activity" size={48} />
            <h3>No Activity</h3>
            <p>No platform activity recorded yet</p>
          </div>
        ) : (
          <div className="platform-table-wrapper">
            <table className="platform-table platform-activity-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Admin</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="platform-action-badge">{item.action}</span>
                    </td>
                    <td className="platform-activity-desc-cell">
                      {item.description || '—'}
                    </td>
                    <td>{item.admin_username || 'System'}</td>
                    <td className="platform-nowrap">{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
