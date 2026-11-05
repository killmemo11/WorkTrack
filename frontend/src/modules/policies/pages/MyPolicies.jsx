// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useCallback, useEffect, useState } from 'react';
import Icon from '../../../shared/components/Icon';
import api from '../../../shared/api';
import { useSession } from '../../../shared/context/SessionContext';

const TYPE_LABELS = {
  leave: 'Leave Policy',
  penalties: 'Penalties & Discipline',
  privacy: 'Privacy Policy',
  other: 'General Policy',
};

export default function MyPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acknowledgingId, setAcknowledgingId] = useState(null);
  const { refresh: refreshSession } = useSession();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/policies');
      setPolicies(res.data.policies || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load company policies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const acknowledge = async (id) => {
    setAcknowledgingId(id);
    try {
      await api.post(`/policies/${id}/acknowledge`);
      await load();
      await refreshSession();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not record acknowledgement');
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1>Company Policies</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Your company&apos;s policies. Please read and acknowledge the ones marked as required.
          </p>
        </div>
      </div>

      {error && <div className="glass-alert glass-alert-danger">{error}</div>}

      {loading ? (
        <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>
      ) : policies.length === 0 ? (
        <div className="glass-card fade-in-up">
          <div className="glass-card-body">
            <p style={{ color: 'var(--text-dim)' }}>No company policies have been published yet.</p>
          </div>
        </div>
      ) : (
        policies.map((policy) => (
          <div className="glass-card fade-in-up" key={policy.id} style={{ marginBottom: 16 }}>
            <div className="glass-card-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <h3>
                {policy.title}
                <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: 8 }}>v{policy.version}</span>
              </h3>
              <span className={`glass-badge ${policy.accepted_at ? 'glass-badge-success' : policy.requires_ack ? 'glass-badge-warning' : ''}`}>
                {policy.accepted_at ? 'Acknowledged' : policy.requires_ack ? 'Action required' : TYPE_LABELS[policy.policy_type]}
              </span>
            </div>
            <div className="glass-card-body">
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 12 }}>
                {TYPE_LABELS[policy.policy_type]}
                {policy.effective_at ? ` · Effective ${new Date(policy.effective_at).toLocaleDateString()}` : ''}
              </p>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, marginBottom: 16 }}>{policy.content}</div>
              {policy.requires_ack && (
                policy.accepted_at ? (
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    <Icon icon="lucide:check-circle" /> Acknowledged on {new Date(policy.accepted_at).toLocaleString()}
                  </p>
                ) : (
                  <button
                    className="glass-btn glass-btn-primary"
                    onClick={() => acknowledge(policy.id)}
                    disabled={acknowledgingId === policy.id}
                  >
                    <Icon icon="lucide:check" /> {acknowledgingId === policy.id ? 'Saving...' : 'I have read and accept'}
                  </button>
                )
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
