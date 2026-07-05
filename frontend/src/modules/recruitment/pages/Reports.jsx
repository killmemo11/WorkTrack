// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import hrApi from '../../../shared/api/hrApi';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#ec4899'];

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

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner"></div>
      <span>Loading...</span>
    </div>
  );
  if (!stats) return (
    <div className="glass-empty">
      <Icon icon="lucide:alert-triangle"></Icon>
      <h3>Failed to load stats</h3>
    </div>
  );

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

  return (
    <div className="page fade-in-up" style={{ padding: 24 }}>
      <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-glass)', marginBottom: 24 }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon icon="lucide:bar-chart-3" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}></Icon>
          Recruitment Reports
        </h1>
      </div>

      {/* Summary cards */}
      <div className="glass-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 24 }}>
        <div className="glass-stat-card fade-in-up delay-1">
          <div className="glass-stat-number">{stats.candidates.total || 0}</div>
          <div className="glass-stat-label">Total Candidates</div>
        </div>
        <div className="glass-stat-card fade-in-up delay-2">
          <div className="glass-stat-number">{stats.jobs.active || 0}</div>
          <div className="glass-stat-label">Active Jobs</div>
        </div>
        <div className="glass-stat-card fade-in-up delay-3">
          <div className="glass-stat-number">{stats.jobs.closed || 0}</div>
          <div className="glass-stat-label">Closed Jobs</div>
        </div>
        <div className="glass-stat-card fade-in-up delay-4">
          <div className="glass-stat-number" style={{ color: 'var(--success)' }}>{stats.candidates.hired || 0}</div>
          <div className="glass-stat-label">Hired</div>
        </div>
        <div className="glass-stat-card fade-in-up delay-5">
          <div className="glass-stat-number" style={{ color: 'var(--error)' }}>{stats.candidates.rejected || 0}</div>
          <div className="glass-stat-label">Rejected</div>
        </div>
        <div className="glass-stat-card fade-in-up delay-6">
          <div className="glass-stat-number">{stats.offers.total || 0}</div>
          <div className="glass-stat-label">Total Offers</div>
        </div>
      </div>

      <div className="glass-grid glass-grid-2" style={{ marginBottom: 24 }}>
        {/* Pipeline Pie */}
        <div className="glass-card fade-in-up delay-1">
          <h4 style={{ margin: '0 0 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="lucide:pie-chart" style={{ color: 'var(--brand-primary)' }}></Icon> Candidates by Stage
          </h4>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={stageData.filter(d => d.value > 0)} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {stageData.filter(d => d.value > 0).map((e, i) => <Cell key={e.name} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Offer Pie */}
        <div className="glass-card fade-in-up delay-2">
          <h4 style={{ margin: '0 0 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="lucide:pie-chart" style={{ color: 'var(--warning)' }}></Icon> Offer Status
          </h4>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={offerData.filter(d => d.value > 0)} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {offerData.filter(d => d.value > 0).map((e, i) => <Cell key={e.name} fill={[COLORS[0], COLORS[1], COLORS[4]][i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Applications Bar */}
      {stats.monthly_applications?.length > 0 && (
        <div className="glass-card fade-in-up delay-3">
          <h4 style={{ margin: '0 0 16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="lucide:trending-up" style={{ color: 'var(--brand-primary)' }}></Icon> Monthly Applications
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthly_applications}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-dim)' }} stroke="var(--border-glass)" />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-dim)' }} stroke="var(--border-glass)" />
              <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-primary)' }} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
