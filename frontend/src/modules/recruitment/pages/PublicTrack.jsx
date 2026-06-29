// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import axios from 'axios';

export default function PublicTrack() {
  const [email, setEmail] = useState('');
  const [apps, setApps] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setLoading(true);
    try {
      const res = await axios.get(`/api/track/${encodeURIComponent(email)}`);
      setApps(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No applications found for this email');
      setApps(null);
    } finally {
      setLoading(false);
    }
  };

  const stageBadge = (stage) => {
    const colors = {
      applied: '#6c757d',
      screening: '#17a2b8',
      interview: '#007bff',
      assessment: '#ffc107',
      'shortlist': '#17a2b8',
      offer: '#28a745',
      hired: '#28a745',
      rejected: '#dc3545',
    };
    return <span className="badge" style={{ backgroundColor: colors[stage] || '#6c757d', color: '#fff' }}>{stage}</span>;
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ textAlign: 'center', color: '#1a1a2e' }}>Track Your Application</h1>
      <p style={{ textAlign: 'center', color: '#666', marginTop: 8 }}>Enter the email you used to apply</p>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-body">
          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <form onSubmit={handleTrack} style={{ display: 'flex', gap: 12 }}>
            <input
              type="email"
              className="form-control"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Track'}
            </button>
          </form>
        </div>
      </div>

      {apps && apps.length === 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-body" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: '#666' }}>No applications found for this email.</p>
          </div>
        </div>
      )}

      {apps && apps.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Your Applications ({apps.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {apps.map(app => (
              <div key={app.id} className="card">
                <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{app.job_title}</h4>
                    <p style={{ margin: '4px 0', color: '#666', fontSize: '0.85rem' }}>
                      Applied: {new Date(app.created_at).toLocaleDateString()}
                      {app.job_id ? ` \u00b7 Job #${app.job_id}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {stageBadge(app.stage)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
