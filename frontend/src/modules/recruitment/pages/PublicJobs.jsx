// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function PublicJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/jobs/active')
      .then(res => setJobs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner"></div>
      <span>Loading jobs...</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }} className="fade-in-up">
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--brand-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
        }}>
          <Icon icon="lucide:briefcase" style={{ fontSize: '1.6rem', color: '#fff' }}></Icon>
        </div>
        <h1 style={{ fontSize: '2rem', background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Join Our Team</h1>
        <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>Explore current openings and apply online</p>
      </div>

      {jobs.length === 0 ? (
        <div className="glass-card fade-in-up"><div className="glass-card-body" style={{ textAlign: 'center', padding: 40 }}>
          <Icon icon="lucide:inbox" style={{ fontSize: '2rem', color: 'var(--text-faint)' }}></Icon>
          <h3 style={{ marginTop: 12, color: 'var(--text-dim)' }}>No open positions right now</h3>
          <p style={{ color: 'var(--text-faint)', marginTop: 8 }}>Check back later for new opportunities.</p>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {jobs.map((job, idx) => (
            <div key={job.id} className={`glass-panel card-hover fade-in-up`} style={{ animationDelay: `${idx * 0.08}s`, borderRadius: 'var(--radius-lg)', padding: 24, border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon icon="lucide:briefcase" style={{ color: 'var(--brand-primary)' }}></Icon>
                    {job.title}
                  </h3>
                  <p style={{ margin: '4px 0', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                    <Icon icon="lucide:building-2" style={{ marginRight: 4, fontSize: '0.75rem' }}></Icon>{job.department}
                    {' \u00b7 '}
                    <Icon icon="lucide:clock" style={{ marginRight: 4, fontSize: '0.75rem' }}></Icon>{job.type}
                    {job.technical ? <span className="glass-badge glass-badge-info" style={{ marginLeft: 8 }}><Icon icon="lucide:code" style={{ marginRight: 2, fontSize: '0.65rem' }}></Icon>Technical</span> : null}
                  </p>
                  {job.description ? <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{job.description}</p> : null}
                </div>
                <button className="glass-btn glass-btn-primary" onClick={() => navigate(`/careers/apply?job=${job.id}`)}>
                  <Icon icon="lucide:send"></Icon> Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <footer style={{ textAlign: 'center', marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border-glass)', color: 'var(--text-faint)', fontSize: '0.8rem' }}>
        <p><Icon icon="lucide:building" style={{ marginRight: 4 }}></Icon> WorkTrack &mdash; Careers Portal</p>
      </footer>
    </div>
  );
}
