// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

export default function ProfileTimeline({ profile }) {
  const timeline = profile.statusLog || [];

  return (
    <div className="glass-card">
      <div className="glass-card-header"><h3>Employment Timeline</h3></div>
      <div className="glass-card-body">
        {timeline.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No status changes recorded.</p>}
        <div className="timeline">
          {timeline.map(s => (
            <div key={s.id} className="timeline-item">
              <div className="timeline-date">{new Date(s.created_at).toLocaleDateString()}</div>
              <div className="timeline-content">
                <span className={`glass-badge glass-badge-${s.action === 'hired' ? 'success' : s.action === 'terminated' || s.action === 'resigned' ? 'danger' : 'info'}`}>{s.action}</span>
                {s.from_position && <span> {s.from_position}</span>}
                {(s.from_position && s.to_position) && <span> → </span>}
                {s.to_position && <span><strong>{s.to_position}</strong></span>}
                {s.from_department && <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{s.from_department}{s.to_department ? ` → ${s.to_department}` : ''}</div>}
                {s.reason && <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Reason: {s.reason}</div>}
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>by {s.performed_by_name || 'System'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
