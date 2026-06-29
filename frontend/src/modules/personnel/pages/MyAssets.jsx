// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
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
    const colors = { available: 'tag-green', assigned: 'tag-blue', damaged: 'tag-red', disposed: 'tag-gray' };
    return <span className={`tag ${colors[s] || 'tag-gray'}`}>{s}</span>;
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Assets</h1>
          <p className="subtitle">Assets currently assigned to you</p>
        </div>
        <button className="btn btn-sm btn-outline" onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      </div>

      {assets.length === 0 ? (
        <p className="empty-state">No assets assigned to you.</p>
      ) : (
        <div className="table-wrapper">
          <table className="table">
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
                  <td><span className="tag tag-blue">{a.category}</span></td>
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
        <div style={{ marginTop: 32 }}>
          <h2>Asset History</h2>
          {history.length === 0 ? (
            <p className="empty-state">No history records.</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
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
                      <td><span className={`tag ${h.action === 'assigned' ? 'tag-blue' : h.action === 'returned' ? 'tag-green' : 'tag-gray'}`}>{h.action}</span></td>
                      <td>{h.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
