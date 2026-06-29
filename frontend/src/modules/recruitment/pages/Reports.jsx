// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import hrApi from '../../../shared/api/hrApi';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1', '#ec4899'];

export default function RecruitmentReports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await hrApi.get('/recruitment/stats');
        setStats(res.data);
      } catch (err) { console.error(err); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</div>;
  if (!stats) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Failed to load stats</div>;

  const stageData = [
    { name: 'Applied', value: Number(stats.candidates.applied || 0) },
    { name: 'Phone', value: Number(stats.candidates.phone_screen || 0) },
    { name: 'Interview', value: Number(stats.candidates.interview || 0) },
    { name: 'Assessment', value: Number(stats.candidates.assessment || 0) },
    { name: 'Offer', value: Number(stats.candidates.offer || 0) },
    { name: 'Hired', value: Number(stats.candidates.hired || 0) },
    { name: 'Rejected', value: Number(stats.candidates.rejected || 0) },
  ];

  const offerData = [
    { name: 'Sent', value: Number(stats.offers.sent || 0) },
    { name: 'Accepted', value: Number(stats.offers.accepted || 0) },
    { name: 'Rejected', value: Number(stats.offers.rejected || 0) },
  ];

  const cardStyle = {
    background: '#fff', borderRadius: 10, padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
  };
  const statNum = { fontSize: 28, fontWeight: 700, color: '#1e293b' };
  const statLabel = { fontSize: '0.85rem', color: '#6b7280', marginTop: 4 };

  return (
    <div style={{ padding: 24 }}>
      <div className="admin-page-header">
        <h2 style={{ margin: 0 }}>Recruitment Reports</h2>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={statNum}>{stats.candidates.total || 0}</div>
          <div style={statLabel}>Total Candidates</div>
        </div>
        <div style={cardStyle}>
          <div style={statNum}>{stats.jobs.active || 0}</div>
          <div style={statLabel}>Active Jobs</div>
        </div>
        <div style={cardStyle}>
          <div style={statNum}>{stats.jobs.closed || 0}</div>
          <div style={statLabel}>Closed Jobs</div>
        </div>
        <div style={cardStyle}>
          <div style={{ ...statNum, color: '#10b981' }}>{stats.candidates.hired || 0}</div>
          <div style={statLabel}>Hired</div>
        </div>
        <div style={cardStyle}>
          <div style={{ ...statNum, color: '#ef4444' }}>{stats.candidates.rejected || 0}</div>
          <div style={statLabel}>Rejected</div>
        </div>
        <div style={cardStyle}>
          <div style={statNum}>{stats.offers.total || 0}</div>
          <div style={statLabel}>Total Offers</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Pipeline Pie */}
        <div style={cardStyle}>
          <h4 style={{ margin: '0 0 16px', color: '#374151' }}>Candidates by Stage</h4>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stageData.filter(d => d.value > 0)} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {stageData.filter(d => d.value > 0).map((e, i) => <Cell key={e.name} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Offer Pie */}
        <div style={cardStyle}>
          <h4 style={{ margin: '0 0 16px', color: '#374151' }}>Offer Status</h4>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={offerData.filter(d => d.value > 0)} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {offerData.filter(d => d.value > 0).map((e, i) => <Cell key={e.name} fill={[COLORS[0], COLORS[1], COLORS[4]][i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Applications Bar */}
      {stats.monthly_applications?.length > 0 && (
        <div style={cardStyle}>
          <h4 style={{ margin: '0 0 16px', color: '#374151' }}>Monthly Applications</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthly_applications}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
