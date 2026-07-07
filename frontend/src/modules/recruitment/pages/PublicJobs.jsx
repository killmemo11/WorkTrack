// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export default function PublicJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/jobs/active')
      .then(res => setJobs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const departments = [...new Set(jobs.map(j => j.department).filter(Boolean))];

  const filtered = jobs.filter(j => {
    if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter && j.department !== deptFilter) return false;
    return true;
  });

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner"></div>
      <span>Loading jobs...</span>
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: '40px auto', padding: '0 20px' }}>
      {/* Careers Nav */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }} className="fade-in-up">
        <button className="glass-btn glass-btn-primary">
          <Icon icon="lucide:briefcase"></Icon> Jobs
        </button>
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers/apply')}>
          <Icon icon="lucide:send"></Icon> Apply
        </button>
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers/track')}>
          <Icon icon="lucide:search"></Icon> Track
        </button>
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers/interviews')}>
          <Icon icon="lucide:video"></Icon> Interviews
        </button>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 32 }} className="fade-in-up">
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--brand-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
        }}>
          <Icon icon="lucide:briefcase" style={{ fontSize: '1.6rem', color: '#fff' }}></Icon>
        </div>
        <h1 style={{ fontSize: '2rem', background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Join Our Team</h1>
        <p style={{ color: 'var(--text-dim)', marginTop: 4 }}>Explore current openings and apply online</p>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }} className="fade-in-up delay-1">
        <div style={{ flex: 1, position: 'relative' }}>
          <Icon icon="lucide:search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: 14 }}></Icon>
          <input className="glass-input" style={{ paddingLeft: 36 }}
            placeholder="Search by job title..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="glass-select" style={{ width: 200 }} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Results count */}
      <div style={{ marginBottom: 16, color: 'var(--text-dim)', fontSize: '0.85rem' }} className="fade-in-up delay-1">
        {filtered.length} {filtered.length === 1 ? 'position' : 'positions'} found
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card fade-in-up"><div className="glass-card-body" style={{ textAlign: 'center', padding: 48 }}>
          <Icon icon="lucide:inbox" style={{ fontSize: '2.5rem', color: 'var(--text-faint)' }}></Icon>
          <h3 style={{ marginTop: 12, color: 'var(--text-dim)' }}>No positions match your criteria</h3>
          <p style={{ color: 'var(--text-faint)', marginTop: 8 }}>Try a different search term or department.</p>
          <button className="glass-btn glass-btn-ghost" style={{ marginTop: 12 }} onClick={() => { setSearch(''); setDeptFilter(''); }}>
            <Icon icon="lucide:x"></Icon> Clear filters
          </button>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((job, idx) => {
            const req = job.min_requirements;
            const allSkills = [
              ...(req?.required_skills_display || []),
              ...(req?.preferred_skills_display || []),
            ];
            const displayedSkills = allSkills.slice(0, 5);
            const extraCount = allSkills.length - 5;

            return (
              <div key={job.id} className={`glass-panel card-hover fade-in-up`}
                style={{ animationDelay: `${idx * 0.06}s`, borderRadius: 'var(--radius-lg)',
                  border: expandedId === job.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--border-glass)',
                  overflow: 'hidden', transition: 'all 0.3s' }}>
                <div style={{ padding: 20, cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{job.title}</h3>
                        <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          <Icon icon="lucide:clock" style={{ marginRight: 3, fontSize: 11 }}></Icon>
                          {timeAgo(job.created_at)}
                        </span>
                      </div>
                      <p style={{ margin: '6px 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                        <Icon icon="lucide:building-2" style={{ marginRight: 4, fontSize: '0.75rem' }}></Icon>{job.department || '—'}
                        <span style={{ margin: '0 8px', color: 'var(--text-faint)' }}>|</span>
                        <Icon icon={job.type === 'Full-Time' ? 'lucide:calendar-clock' : 'lucide:clock'} style={{ marginRight: 4, fontSize: '0.75rem' }}></Icon>{job.type || '—'}
                        {job.technical && (
                          <span className="glass-badge glass-badge-info" style={{ marginLeft: 10, fontSize: '0.7rem', padding: '2px 8px' }}>
                            <Icon icon="lucide:code" style={{ marginRight: 3, fontSize: '0.6rem' }}></Icon>Technical
                          </span>
                        )}
                      </p>
                      {job.description && (
                        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {job.description}
                        </p>
                      )}
                      {allSkills.length > 0 && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {displayedSkills.map((skill, si) => (
                            <span key={si} style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem',
                              background: 'rgba(99,102,241,0.1)', color: 'var(--brand-primary)',
                              border: '1px solid rgba(99,102,241,0.15)',
                            }}>{skill}</span>
                          ))}
                          {extraCount > 0 && (
                            <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>+{extraCount} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button className="glass-btn glass-btn-primary glass-btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0, marginTop: 0 }}
                      onClick={e => { e.stopPropagation(); navigate(`/careers/apply?job=${job.id}`); }}>
                      <Icon icon="lucide:send" style={{ marginRight: 4 }}></Icon> Apply Now
                    </button>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon icon={expandedId === job.id ? 'lucide:chevron-up' : 'lucide:chevron-down'}
                      style={{ fontSize: 14, color: 'var(--text-faint)' }}></Icon>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                      {expandedId === job.id ? 'Hide details' : 'View details'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === job.id && (
                  <div style={{ borderTop: '1px solid var(--border-glass)', padding: '16px 20px', background: 'rgba(24,24,27,0.3)' }}>
                    {job.key_responsibilities && (
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ fontSize: '0.85rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon icon="lucide:list-todo" style={{ color: 'var(--brand-primary)', fontSize: 14 }}></Icon> Key Responsibilities
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{job.key_responsibilities}</p>
                      </div>
                    )}
                    {job.qualifications && (
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ fontSize: '0.85rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon icon="lucide:graduation-cap" style={{ color: 'var(--brand-primary)', fontSize: 14 }}></Icon> Qualifications
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{job.qualifications}</p>
                      </div>
                    )}

                    {job.technical_skills && (
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ fontSize: '0.85rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon icon="lucide:terminal" style={{ color: 'var(--brand-primary)', fontSize: 14 }}></Icon> Technical Skills
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{job.technical_skills}</p>
                      </div>
                    )}
                    {job.core_competencies && (
                      <div>
                        <h4 style={{ fontSize: '0.85rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon icon="lucide:target" style={{ color: 'var(--brand-primary)', fontSize: 14 }}></Icon> Core Competencies
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{job.core_competencies}</p>
                      </div>
                    )}
                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                      <button className="glass-btn glass-btn-primary" onClick={() => navigate(`/careers/apply?job=${job.id}`)}>
                        <Icon icon="lucide:send" style={{ marginRight: 4 }}></Icon> Apply for this position
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <footer style={{ textAlign: 'center', marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border-glass)', color: 'var(--text-faint)', fontSize: '0.8rem' }}>
        <p><Icon icon="lucide:building" style={{ marginRight: 4 }}></Icon> WorkTrack &mdash; Careers Portal</p>
      </footer>
    </div>
  );
}