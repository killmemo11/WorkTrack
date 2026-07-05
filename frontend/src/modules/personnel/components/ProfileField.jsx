import { useState } from 'react';

export default function ProfileField({ label, value, icon, editing, type = 'text', options, onChange, placeholder, error, hint, required }) {
  const [focused, setFocused] = useState(false);

  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            className={`profile-field-input ${focused ? 'focused' : ''} ${error ? 'has-error' : ''}`}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          >
            <option value="">Select...</option>
            {options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            className={`profile-field-input profile-field-textarea ${focused ? 'focused' : ''} ${error ? 'has-error' : ''}`}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            rows={3}
          />
        );
      default:
        return (
          <input
            type={type}
            className={`profile-field-input ${focused ? 'focused' : ''} ${error ? 'has-error' : ''}`}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        );
    }
  };

  const formatDisplayValue = (val) => {
    if (!val) return <span className="profile-field-empty">Not set</span>;
    if (type === 'date') return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return val;
  };

  return (
    <div className={`profile-field ${editing ? 'is-editing' : ''} ${error ? 'has-error' : ''}`}>
      <div className="profile-field-label">
        {icon && <span className="profile-field-icon">{icon}</span>}
        <span>{label}</span>
        {required && <span className="profile-field-required">*</span>}
      </div>
      <div className="profile-field-value">
        {editing ? (
          <>
            {renderInput()}
            {error && <span className="profile-field-error">{error}</span>}
            {hint && !error && <span className="profile-field-hint">{hint}</span>}
          </>
        ) : (
          <div className="profile-field-display" title={value}>
            {icon && type !== 'date' ? (
              formatDisplayValue(value)
            ) : (
              formatDisplayValue(value)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
