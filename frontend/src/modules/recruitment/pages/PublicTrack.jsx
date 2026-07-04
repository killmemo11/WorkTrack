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
    const map = {
      applied: 'neutral',
      screening: 'info',
      interview: 'primary',
      assessment: 'warning',
      shortlist: 'info',
      offer: 'success',
      hired: 'success',
      rejected: 'danger',
    };
    const icons = {
      applied: 'lucide:file-text',
      screening: 'lucide:scan-search',
      interview: 'lucide:video',
      assessment: 'lucide:clipboard-check',
      shortlist: 'lucide:list',
      offer: 'lucide:gift',
      hired: 'lucide:party-popper',
      rejected: 'lucide:x-circle',
    };
    return (
      <span className={`glass-badge glass-badge-${map[stage] || 'neutral'}`}>
        <span className="iconify" data-icon={icons[stage] || 'lucide:help-circle'} style={{ marginRight: 2, fontSize: '0.65rem' }}></span>
        {stage}
      </span>
    );
  };

  const STEPS = ['applied', 'screening', 'interview', 'offer', 'hired'];
  const stepIcons = {
    applied: 'lucide:file-text',
    screening: 'lucide:scan-search',
    interview: 'lucide:video',
    offer: 'lucide:gift',
    hired: 'lucide:party-popper',
  };
  const stepLabels = {
    applied: 'Applied',
    screening: 'Screening',
    interview: 'Interview',
    offer: 'Offer',
    hired: 'Hired',
  };

  const getStepStatus = (currentStage, stepIndex) => {
    const stepName = STEPS[stepIndex];
    const currentIndex = STEPS.indexOf(currentStage);
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    if (currentStage === 'rejected') return stepIndex <= STEPS.indexOf(currentStage) ? 'rejected' : 'pending';
    return 'pending';
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }} className="fade-in-up">
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--brand-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
        }}>
          <span className="iconify" data-icon="lucide:search" style={{ fontSize: '1.4rem', color: '#fff' }}></span>
        </div>
        <h1 style={{ color: 'var(--text-primary)' }}>Track Your Application</h1>
        <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>Enter the email you used to apply</p>
      </div>

      <div className="glass-card fade-in-up delay-1" style={{ marginTop: 24 }}>
        <div className="glass-card-body">
          {error && (
            <div className="glass-alert glass-alert-danger" role="alert">
              <span className="iconify" data-icon="lucide:alert-circle"></span> {error}
            </div>
          )}

          <form onSubmit={handleTrack} style={{ display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span className="iconify" data-icon="lucide:mail" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}></span>
              <input
                type="email"
                className="glass-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: 38 }}
              />
            </div>
            <button type="submit" className="glass-btn glass-btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Searching...</> : <><span className="iconify" data-icon="lucide:search"></span> Track</>}
            </button>
          </form>
        </div>
      </div>

      {apps && apps.length === 0 && (
        <div className="glass-card fade-in-up" style={{ marginTop: 16 }}>
          <div className="glass-card-body" style={{ textAlign: 'center', padding: 32 }}>
            <span className="iconify" data-icon="lucide:inbox" style={{ fontSize: '1.6rem', color: 'var(--text-faint)' }}></span>
            <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>No applications found for this email.</p>
          </div>
        </div>
      )}

      {apps && apps.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
            <span className="iconify" data-icon="lucide:folder-open" style={{ color: 'var(--brand-primary)' }}></span>
            Your Applications ({apps.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {apps.map(app => (
              <div key={app.id} className="glass-panel card-hover fade-in-up" style={{ borderRadius: 'var(--radius-lg)', padding: 20, border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                      <span className="iconify" data-icon="lucide:briefcase" style={{ color: 'var(--brand-primary)' }}></span>
                      {app.job_title}
                    </h4>
                    <p style={{ margin: '4px 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      <span className="iconify" data-icon="lucide:calendar" style={{ marginRight: 4, fontSize: '0.7rem' }}></span>
                      Applied: {new Date(app.created_at).toLocaleDateString()}
                      {app.job_id ? ` \u00b7 Job #${app.job_id}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {stageBadge(app.stage)}
                  </div>
                </div>

                {/* Stepper */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
                    {STEPS.map((step, i) => {
                      const status = getStepStatus(app.stage, i);
                      const isCompleted = status === 'completed';
                      const isActive = status === 'active';
                      const isRejected = status === 'rejected';
                      return (
                        <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: isCompleted ? 'var(--success)' : isActive ? 'var(--brand-primary)' : isRejected ? 'var(--error)' : 'rgba(255,255,255,0.06)',
                            border: isCompleted || isActive ? 'none' : '1px solid var(--border-glass)',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 1, marginBottom: 6,
                          }}>
                            <span className="iconify" data-icon={
                              isCompleted ? 'lucide:check' :
                              isRejected ? 'lucide:x' :
                              stepIcons[step]
                            } style={{ fontSize: '0.75rem' }}></span>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: isActive ? 'var(--brand-primary)' : isCompleted ? 'var(--success)' : isRejected ? 'var(--error)' : 'var(--text-faint)', textAlign: 'center' }}>
                            {stepLabels[step]}
                          </span>
                          {i < STEPS.length - 1 && (
                            <div style={{
                              position: 'absolute', top: 14, left: '50%', width: '100%', height: 2,
                              background: isCompleted ? 'var(--success)' : 'rgba(255,255,255,0.06)',
                              zIndex: 0,
                            }} />
                          )}
                        </div>
                      );
                    })}
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
