// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
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

  if (loading) return <div className="loading">Loading jobs...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2rem', color: '#1a1a2e' }}>Join Our Team</h1>
        <p style={{ color: '#666', marginTop: 8 }}>Explore current openings and apply online</p>
      </div>

      {jobs.length === 0 ? (
        <div className="card"><div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
          <h3>No open positions right now</h3>
          <p style={{ color: '#666' }}>Check back later for new opportunities.</p>
        </div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {jobs.map(job => (
            <div key={job.id} className="card">
              <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{job.title}</h3>
                  <p style={{ margin: '4px 0', color: '#666' }}>
                    {job.department} &middot; {job.type}
                    {job.technical ? <span className="badge badge-primary" style={{ marginLeft: 8 }}>Technical</span> : null}
                  </p>
                  {job.description ? <p style={{ margin: '8px 0 0', color: '#444', fontSize: '0.9rem' }}>{job.description}</p> : null}
                </div>
                <button className="btn btn-primary" onClick={() => navigate(`/careers/apply?job=${job.id}`)}>Apply Now</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
