import ProfileSection from './ProfileSection';
import '../styles/profile.css';

export default function ProfileTimeline({ profile }) {
  const timeline = profile.statusLog || [];

  return (
    <ProfileSection
      title="Employment Timeline"
      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><polyline points="8 5 3 12 8 19"/><polyline points="16 5 21 12 16 19"/></svg>}
    >
      {timeline.length === 0 ? (
        <div className="doc-empty" style={{ padding: '20px' }}>
          <span className="doc-empty-icon" style={{ fontSize: 36 }}>📋</span>
          <h4>No status changes recorded</h4>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          {timeline.map(s => (
            <div key={s.id} style={{ position: 'relative', paddingLeft: 24, paddingBottom: 20, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ position: 'absolute', left: -5, top: 4, width: 10, height: 10, borderRadius: '50%', background: s.action === 'hired' ? 'var(--success)' : s.action === 'terminated' || s.action === 'resigned' ? 'var(--error)' : 'var(--brand-primary)' }} />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-faint)', marginBottom: 4 }}>{new Date(s.created_at).toLocaleDateString()}</div>
              <div>
                <span className={`doc-card-badge doc-card-badge-${s.action === 'hired' ? 'id_card' : s.action === 'terminated' || s.action === 'resigned' ? 'passport' : 'contract'}`}>{s.action}</span>
                {s.from_position && <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}> {s.from_position}</span>}
                {(s.from_position && s.to_position) && <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}> → </span>}
                {s.to_position && <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{s.to_position}</strong>}
                {s.from_department && <div style={{ color: 'var(--text-faint)', fontSize: '0.82rem' }}>{s.from_department}{s.to_department ? ` → ${s.to_department}` : ''}</div>}
                {s.reason && <div style={{ color: 'var(--text-faint)', fontSize: '0.82rem' }}>Reason: {s.reason}</div>}
                <div style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>by {s.performed_by_name || 'System'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}
