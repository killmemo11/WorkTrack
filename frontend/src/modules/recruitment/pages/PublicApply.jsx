// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function PublicApply() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job');
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(jobId || '');
  const [jobTitle, setJobTitle] = useState('');
  const [technical, setTechnical] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', cover: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/jobs/active')
      .then(res => {
        setJobs(res.data);
        if (jobId) {
          const match = res.data.find(j => String(j.id) === jobId);
          if (match) {
            setJobTitle(match.title);
            setTechnical(!!match.technical);
            setSelectedJobId(jobId);
          }
        }
      })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, [jobId]);

  const handleJobChange = (e) => {
    const id = e.target.value;
    setSelectedJobId(id);
    const match = jobs.find(j => String(j.id) === id);
    setJobTitle(match ? match.title : '');
    setTechnical(match ? !!match.technical : false);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobTitle) return setError('Please select a position');
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/apply', {
        ...form,
        job_id: selectedJobId || null,
        job_title: jobTitle,
        technical,
        source: 'Portal',
      });
      setSuccess(res.data);
      setForm({ name: '', email: '', phone: '', cover: '' });
      setSelectedJobId('');
      setJobTitle('');
      setTechnical(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="card"><div className="card-body" style={{ padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
          <h2>Application Submitted!</h2>
          <p style={{ color: '#666', marginTop: 8 }}>
            Thank you for applying to <strong>{jobTitle}</strong>.
          </p>
          <p>Your reference number is <strong>{success.ref}</strong></p>
          {success.email_sent && <p style={{ color: '#666', fontSize: '0.9rem' }}>A confirmation email has been sent to {form.email}.</p>}
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/careers')}>Back to Jobs</button>
        </div></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ textAlign: 'center', color: '#1a1a2e' }}>Apply for a Position</h1>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-body" style={{ padding: 32 }}>
          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Position *</label>
              {jobsLoading ? (
                <div className="form-control" style={{ color: '#999' }}>Loading positions...</div>
              ) : (
                <select className="form-control" value={selectedJobId} onChange={handleJobChange} required style={{ width: '100%' }}>
                  <option value="">— Select a position —</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title} — {j.department}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <input name="name" className="form-control" value={form.name} onChange={handleChange} required style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} required style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input name="phone" type="tel" className="form-control" value={form.phone} onChange={handleChange} style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label>Cover Note</label>
              <textarea name="cover" className="form-control" rows={4} value={form.cover} onChange={handleChange} style={{ width: '100%', resize: 'vertical' }} />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || jobsLoading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 16 }}>
        <a href="/careers" style={{ color: '#4a6cf7' }}>&larr; Back to all jobs</a>
      </p>
    </div>
  );
}
