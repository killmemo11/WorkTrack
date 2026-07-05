// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import api from '../../../shared/api';

export default function MyAssets() {
  const [assets, setAssets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const fetchAssets = async () => {
    try {
      const res = await api.get('/personnel/my-assets');
      setAssets(res.data);
      const histRes = await api.get('/personnel/my-assets/history');
      setHistory(histRes.data);
    } catch (err) {
      console.error('Failed to load assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(); }, []);

  const statusBadge = (s) => {
    const colors = { available: 'glass-badge-success', assigned: 'glass-badge-info', damaged: 'glass-badge-danger', disposed: 'glass-badge-default' };
    return <span className={`glass-badge ${colors[s] || 'glass-badge-default'}`}>{s}</span>;
  };

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );

  return (
    <div className="page">
      <div className="glass-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1>My Assets</h1>
          <p className="subtitle" style={{ color: 'var(--text-dim)' }}>Assets currently assigned to you</p>
        </div>
        <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setShowHistory(!showHistory)}>
          <Icon icon={showHistory ? 'lucide:eye-off' : 'lucide:history'} style={{ marginRight: 4, fontSize: 13 }}></Icon>
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      {assets.length === 0 ? (
        <div className="glass-empty">
          <Icon icon="lucide:package" style={{ fontSize: 48, opacity: 0.4 }}></Icon>
          <h3>No assets assigned</h3>
          <p>No assets are currently assigned to you.</p>
        </div>
      ) : (
        <div className="glass-table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Category</th>
                <th>Serial #</th>
                <th>Brand / Model</th>
                <th>Status</th>
                <th>Assigned Date</th>
                <th>Expected Return</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id}>
                  <td><strong>{a.name}</strong></td>
                  <td><span className="glass-badge glass-badge-info">{a.category}</span></td>
                  <td>{a.serial_number || '—'}</td>
                  <td>{[a.brand, a.model].filter(Boolean).join(' / ') || '—'}</td>
                  <td>{statusBadge(a.status)}</td>
                  <td>{a.assigned_date ? new Date(a.assigned_date).toLocaleDateString() : '—'}</td>
                  <td>{a.expected_return_date ? new Date(a.expected_return_date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showHistory && (
        <div className="glass-card fade-in-up" style={{ marginTop: 32 }}>
          <div className="glass-card-header">
            <h3>
              <Icon icon="lucide:history" style={{ marginRight: 8, fontSize: 18, color: 'var(--text-dim)' }}></Icon>
              Asset History
            </h3>
          </div>
          <div className="glass-card-body">
            {history.length === 0 ? (
              <div className="glass-empty">
                <Icon icon="lucide:clock" style={{ fontSize: 32, opacity: 0.3 }}></Icon>
                <p>No history records.</p>
              </div>
            ) : (
              <div className="glass-table-wrapper">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Asset</th>
                      <th>Action</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.created_at + h.asset_name}>
                        <td>{new Date(h.created_at).toLocaleDateString()}</td>
                        <td>{h.asset_name}</td>
                        <td><span className={`glass-badge ${h.action === 'assigned' ? 'glass-badge-info' : h.action === 'returned' ? 'glass-badge-success' : 'glass-badge-default'}`}>{h.action}</span></td>
                        <td>{h.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
