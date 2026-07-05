import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ProfileSection from './ProfileSection';
import ProfileField from './ProfileField';
import '../styles/profile.css';

export default function ProfileBasicInfo({ profile, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(profileToForm(profile));
  const [uploadingCard, setUploadingCard] = useState(false);
  const [previewCard, setPreviewCard] = useState(false);

  useEffect(() => {
    if (editing) setForm(profileToForm(profile));
  }, [editing, profile]);

  function fmtDate(d) {
    if (!d) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function profileToForm(p) {
    return {
      phone: p.phone || '',
      address: p.profile?.address || '',
      nationality: p.profile?.nationality || '',
      birth_date: fmtDate(p.profile?.birth_date),
      birth_place: p.profile?.birth_place || '',
      gender: p.profile?.gender || '',
      marital_status: p.profile?.marital_status || '',
      military_status: p.profile?.military_status || '',
      id_number: p.profile?.id_number || '',
      national_id_place: p.profile?.national_id_place || '',
      mother_name: p.profile?.mother_name || '',
      id_expiry: fmtDate(p.profile?.id_expiry),
      passport_number: p.profile?.passport_number || '',
      passport_expiry: fmtDate(p.profile?.passport_expiry),
      insurance_number: p.profile?.insurance_number || '',
      medical_insurance_number: p.profile?.medical_insurance_number || '',
    };
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await hrApi.put(`/employees/${profile.id}/profile`, form);
      setMessage({ type: 'success', text: 'Profile saved successfully' });
      setEditing(false);
      onUpdate();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadCard(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCard(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await hrApi.post(`/employees/${profile.id}/insurance-card`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage({ type: 'success', text: 'Insurance card uploaded' });
      onUpdate();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Upload failed' });
    } finally {
      setUploadingCard(false);
    }
  }

  const readonlyFields = [
    { label: 'Name', value: profile.name, icon: '👤' },
    { label: 'Employee ID', value: profile.employee_id, icon: '🔢' },
    { label: 'Email', value: profile.email, icon: '✉️' },
    { label: 'Department', value: profile.department_name, icon: '🏢' },
    { label: 'Role', value: profile.role, icon: '💼' },
  ];

  const editFields = [
    { key: 'phone', label: 'Phone', type: 'text', icon: '📞' },
    { key: 'address', label: 'Address', type: 'textarea', icon: '📍' },
    { key: 'nationality', label: 'Nationality', type: 'text', icon: '🌍' },
    { key: 'birth_date', label: 'Birth Date', type: 'date', icon: '🎂' },
    { key: 'birth_place', label: 'Birth Place', type: 'text', icon: '🏠' },
    { key: 'gender', label: 'Gender', type: 'select', icon: '⚧️', options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }] },
    { key: 'marital_status', label: 'Marital Status', type: 'select', icon: '💍', options: [{ value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }, { value: 'divorced', label: 'Divorced' }] },
    { key: 'military_status', label: 'Military Status', type: 'select', icon: '🎖️', options: [{ value: 'completed', label: 'Completed' }, { value: 'exempted', label: 'Exempted' }, { value: 'postponed', label: 'Postponed' }, { value: 'serving', label: 'Serving' }, { value: 'not_applicable', label: 'N/A' }] },
    { key: 'id_number', label: 'ID Number', type: 'text', icon: '🆔' },
    { key: 'national_id_place', label: 'ID Issue Place', type: 'text', icon: '🏛️' },
    { key: 'mother_name', label: 'Mother Name', type: 'text', icon: '👩' },
    { key: 'id_expiry', label: 'ID Expiry', type: 'date', icon: '📅' },
    { key: 'passport_number', label: 'Passport Number', type: 'text', icon: '🛂' },
    { key: 'passport_expiry', label: 'Passport Expiry', type: 'date', icon: '📅' },
    { key: 'insurance_number', label: 'Insurance Number', type: 'text', icon: '🏥' },
    { key: 'medical_insurance_number', label: 'Medical Insurance Card No.', type: 'text', icon: '💳' },
  ];

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <>
      {/* Basic Information Section */}
      <ProfileSection
        title="Basic Information"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
        editing={editing}
        saving={saving}
        onEdit={() => { setForm(profileToForm(profile)); setEditing(true); }}
        onSave={handleSave}
        onCancel={() => setEditing(false)}
      >
        {message && (
          <div className={`profile-message profile-message-${message.type}`}>
            {message.type === 'success' ? '✓' : '✕'} {message.text}
          </div>
        )}

        {editing ? (
          <div className="profile-fields-grid">
            {editFields.map(f => (
              <ProfileField
                key={f.key}
                label={f.label}
                value={form[f.key]}
                type={f.type}
                icon={f.icon}
                options={f.options}
                editing={true}
                onChange={val => update(f.key, val)}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Read-only fields */}
            <div className="profile-fields-grid">
              {readonlyFields.map((f, i) => (
                <ProfileField key={i} label={f.label} value={f.value} icon={f.icon} />
              ))}
              <ProfileField label="Phone" value={profile.phone || null} icon="📞" />
              <ProfileField label="Nationality" value={profile.profile?.nationality || null} icon="🌍" />
              <ProfileField label="Birth Date" value={profile.profile?.birth_date || null} type="date" icon="🎂" />
              <ProfileField label="Birth Place" value={profile.profile?.birth_place || null} icon="🏠" />
              <ProfileField label="Gender" value={profile.profile?.gender || null} icon="⚧️" />
              <ProfileField label="Marital Status" value={profile.profile?.marital_status || null} icon="💍" />
              <ProfileField label="Military Status" value={profile.profile?.military_status || null} icon="🎖️" />
              <ProfileField label="ID Number" value={profile.profile?.id_number || null} icon="🆔" />
              <ProfileField label="ID Issue Place" value={profile.profile?.national_id_place || null} icon="🏛️" />
              <ProfileField label="Mother Name" value={profile.profile?.mother_name || null} icon="👩" />
              <ProfileField label="ID Expiry" value={profile.profile?.id_expiry || null} type="date" icon="📅" />
              <ProfileField label="Passport Number" value={profile.profile?.passport_number || null} icon="🛂" />
              <ProfileField label="Passport Expiry" value={profile.profile?.passport_expiry || null} type="date" icon="📅" />
              <ProfileField label="Insurance Number" value={profile.profile?.insurance_number || null} icon="🏥" />
              <ProfileField label="Address" value={profile.profile?.address || null} icon="📍" />
            </div>

            {/* Medical Insurance Sub-section */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>🏥</span>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Medical Insurance</h4>
              </div>
              <div className="profile-fields-grid">
                <ProfileField label="Card Number" value={profile.profile?.medical_insurance_number || null} icon="💳" />
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                {profile.profile?.insurance_card_image ? (
                  <img src={`/${profile.profile.insurance_card_image}`} alt="Insurance Card"
                    style={{ maxWidth: 240, maxHeight: 140, objectFit: 'contain', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}
                    onClick={() => setPreviewCard(true)} />
                ) : (
                  <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.15)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-faint)' }}>
                    No card image uploaded
                  </div>
                )}
                <label className="profile-btn profile-btn-ghost" style={{ cursor: 'pointer' }}>
                  {uploadingCard ? (
                    <><span className="profile-spinner" /> Uploading...</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Upload Card Image</>
                  )}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadCard} disabled={uploadingCard} />
                </label>
              </div>
            </div>
          </>
        )}
      </ProfileSection>

      {/* Insurance Card Preview Modal */}
      {previewCard && (
        <div className="doc-preview-overlay" onClick={() => setPreviewCard(false)}>
          <div className="doc-preview-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="doc-preview-header">
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Insurance Card</h3>
              <button className="profile-btn profile-btn-ghost profile-btn-sm" onClick={() => setPreviewCard(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Close
              </button>
            </div>
            <div className="doc-preview-body">
              <img src={`/${profile.profile?.insurance_card_image}`} alt="Insurance Card" style={{ maxHeight: '80vh' }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
