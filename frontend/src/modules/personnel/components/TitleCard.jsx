import { useState } from 'react';

const GRADE_COLORS = {
  low:    { bg: '#ecfdf5', border: '#10b981', text: '#065f46', label: 'Junior' },
  mid:    { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', label: 'Senior' },
  high:   { bg: '#fff7ed', border: '#f97316', text: '#9a3412', label: 'Manager' },
  exec:   { bg: '#faf5ff', border: '#a855f7', text: '#6b21a8', label: 'Executive' },
};

const GRADE_LEVEL = {
  low: 3, mid: 6, high: 9, exec: 99,
};

function getGradeStyle(gradeLevel) {
  if (!gradeLevel) return null;
  if (gradeLevel <= GRADE_LEVEL.low) return GRADE_COLORS.low;
  if (gradeLevel <= GRADE_LEVEL.mid) return GRADE_COLORS.mid;
  if (gradeLevel <= GRADE_LEVEL.high) return GRADE_COLORS.high;
  return GRADE_COLORS.exec;
}

const ICONS = {
  Intern:      '🎓', Junior:      '🌱', Senior:      '⭐',
  Supervisor:  '👔', Manager:     '🏆', SectionHead: '📊',
  'C-Level':   '👑',
};

function HeadcountBar({ filled, max }) {
  if (max === 0) {
    return <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>&infin; unlimited</div>;
  }
  const pct = Math.min(filled / max, 1);
  const color = pct >= 1 ? '#ef4444' : pct >= 0.8 ? '#f59e0b' : '#22c55e';
  return (
    <div style={{ width: '100%', marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginBottom: 2 }}>
        <span>{filled}/{max}</span>
        <span style={{ fontWeight: 600, color }}>{Math.round(pct * 100)}%</span>
      </div>
      <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s ease' }} />
      </div>
    </div>
  );
}

function Tooltip({ title, grade, gradeLevel, description, technical, filled, max, created_at, hasCriteria }) {
  return (
    <div style={{
      position: 'fixed', zIndex: 9999, pointerEvents: 'none',
      background: '#1e293b', color: '#f1f5f9',
      padding: '12px 16px', borderRadius: 10, fontSize: '0.78rem',
      maxWidth: 260, boxShadow: '0 8px 30px rgba(0,0,0,.25)',
    }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        {ICONS[title] || '📋'} {title}
      </div>
      {grade && <div style={{ color: '#94a3b8', marginBottom: 4 }}>{grade} {gradeLevel ? `· Lv.${gradeLevel}` : ''}</div>}
      {description && <div style={{ color: '#cbd5e1', marginBottom: 6, lineHeight: 1.4 }}>{description}</div>}
      <div style={{ borderTop: '1px solid #334155', paddingTop: 6, marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span>👥 {filled} of {max || '∞'} filled</span>
          {max > 0 && <span style={{ fontWeight: 600, color: filled >= max ? '#ef4444' : '#22c55e' }}>{Math.round(filled / max * 100)}%</span>}
        </div>
        {technical && <div style={{ color: '#60a5fa' }}>⚙️ Technical position</div>}
        {hasCriteria && <div style={{ color: '#a78bfa' }}>📊 Has evaluation criteria</div>}
        {created_at && <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: 2 }}>📅 Created {new Date(created_at).toLocaleDateString('en-GB')}</div>}
      </div>
    </div>
  );
}

export default function TitleCard({ title, grade, gradeLevel, description, technical, filled, max, created_at, hasCriteria, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const gs = getGradeStyle(gradeLevel);
  const pct = max > 0 ? filled / max : 0;
  const isFull = max > 0 && filled >= max;

  const handleMouseEnter = (e) => {
    setHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  return (
    <>
      <div
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 155, height: 175, cursor: 'pointer', borderRadius: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 3, position: 'relative',
          border: `1px solid ${gs ? gs.border + '40' : '#e2e8f0'}`,
          borderLeft: `3px solid ${gs ? gs.border : '#e2e8f0'}`,
          background: gs ? gs.bg : '#fff',
          transition: 'transform .2s, box-shadow .2s',
          transform: hovered ? 'translateY(-4px)' : '',
          boxShadow: hovered ? '0 8px 25px rgba(0,0,0,.1)' : '0 1px 4px rgba(0,0,0,.05)',
          overflow: 'hidden',
        }}
      >
        {gs && (
          <span style={{
            position: 'absolute', top: 4, right: 4, fontSize: '0.55rem',
            background: gs.border + '20', color: gs.text, padding: '1px 6px',
            borderRadius: 4, fontWeight: 600,
          }}>
            {gs.label}
          </span>
        )}
        {technical && (
          <span className="badge badge-primary" style={{ position: 'absolute', top: 4, left: 4, fontSize: '0.5rem' }}>
            Tech
          </span>
        )}
        {isFull && (
          <span style={{
            position: 'absolute', bottom: 36, right: 4, fontSize: '0.5rem',
            background: '#fecaca', color: '#991b1b', padding: '1px 5px',
            borderRadius: 4, fontWeight: 700,
          }}>
            FULL
          </span>
        )}

        <div style={{ fontSize: 28, lineHeight: 1 }}>{ICONS[title] || '📋'}</div>
        <div style={{ fontWeight: 600, fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.2, padding: '0 6px' }}>
          {title}
        </div>
        {grade && (
          <div style={{ fontSize: '0.65rem', color: gs ? gs.text : '#64748b', fontWeight: 500 }}>
            {grade} · Lv.{gradeLevel}
          </div>
        )}
        <div style={{ width: '100%', padding: '0 10px' }}>
          <HeadcountBar filled={filled} max={max} />
        </div>

        {hovered && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            display: 'flex', borderTop: '1px solid #e2e8f0',
          }}>
            <div style={{
              flex: 1, textAlign: 'center', padding: '4px 0', fontSize: '0.65rem',
              cursor: 'pointer', background: '#f8fafc', color: '#475569',
              borderRight: '1px solid #e2e8f0',
            }}
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >✏️ Edit</div>
            <div style={{
              flex: 1, textAlign: 'center', padding: '4px 0', fontSize: '0.65rem',
              cursor: 'pointer', background: '#fef2f2', color: '#dc2626',
            }}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >🗑️ Delete</div>
          </div>
        )}
      </div>

      {hovered && (
        <div style={{
          position: 'fixed', left: tooltipPos.x, top: tooltipPos.y,
          transform: 'translate(-50%, -100%)',
        }}>
          <Tooltip
            title={title}
            grade={grade}
            gradeLevel={gradeLevel}
            description={description}
            technical={technical}
            filled={filled}
            max={max}
            created_at={created_at}
            hasCriteria={hasCriteria}
          />
        </div>
      )}
    </>
  );
}
