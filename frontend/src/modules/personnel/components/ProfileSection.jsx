import { useState } from 'react';

export default function ProfileSection({ title, icon, children, onEdit, onSave, onCancel, editing, saving, actions }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`profile-section ${editing ? 'is-editing' : ''}`}>
      <div className="profile-section-header">
        <div className="profile-section-title" onClick={() => setExpanded(!expanded)}>
          <span className="profile-section-icon">{icon}</span>
          <h3 className="profile-section-heading">{title}</h3>
          <span className={`profile-section-toggle ${expanded ? 'expanded' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
        <div className="profile-section-actions">
          {actions}
          {!editing && onEdit && (
            <button className="profile-btn profile-btn-ghost" onClick={onEdit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Edit</span>
            </button>
          )}
          {editing && (
            <>
              <button className="profile-btn profile-btn-primary" onClick={onSave} disabled={saving}>
                {saving ? (
                  <span className="profile-spinner" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                )}
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              <button className="profile-btn profile-btn-ghost" onClick={onCancel} disabled={saving}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      <div className={`profile-section-body ${expanded ? 'expanded' : 'collapsed'}`}>
        {children}
      </div>
    </div>
  );
}
