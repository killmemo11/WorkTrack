// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';

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

  const MILITARY_OPTIONS = ['completed', 'exempted', 'postponed', 'serving', 'not_applicable'];

  if (!editing) {
    return (
      <>
      <div className="card">
        <div className="card-header"><h3>Basic Information</h3><button className="btn btn-sm btn-outline" onClick={() => { setForm(profileToForm(profile)); setEditing(true); }}>Edit</button></div>
        <div className="card-body">
          {message && <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>{message.text}</div>}
          <table className="table-details">
            <tbody>
              <tr><td>Name</td><td>{profile.name}</td></tr>
              <tr><td>Employee ID</td><td>{profile.employee_id}</td></tr>
              <tr><td>Email</td><td>{profile.email}</td></tr>
              <tr><td>Phone</td><td>{profile.phone || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Department</td><td>{profile.department_name || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Role</td><td>{profile.role}</td></tr>
              <tr><td>Nationality</td><td>{profile.profile?.nationality || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Birth Date</td><td>{fmtDate(profile.profile?.birth_date) || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Birth Place</td><td>{profile.profile?.birth_place || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Gender</td><td>{profile.profile?.gender || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Marital Status</td><td>{profile.profile?.marital_status || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Military Status</td><td>{profile.profile?.military_status || <span className="text-muted">—</span>}</td></tr>
              <tr><td>ID Number</td><td>{profile.profile?.id_number || <span className="text-muted">—</span>}</td></tr>
              <tr><td>ID Issue Place</td><td>{profile.profile?.national_id_place || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Mother Name</td><td>{profile.profile?.mother_name || <span className="text-muted">—</span>}</td></tr>
              <tr><td>ID Expiry</td><td>{fmtDate(profile.profile?.id_expiry) || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Passport Number</td><td>{profile.profile?.passport_number || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Passport Expiry</td><td>{fmtDate(profile.profile?.passport_expiry) || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Insurance Number</td><td>{profile.profile?.insurance_number || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Address</td><td>{profile.profile?.address || <span className="text-muted">—</span>}</td></tr>
            </tbody>
          </table>
          <hr/>
          <h4>Medical Insurance</h4>
          <table className="table-details">
            <tbody>
              <tr><td>Card Number</td><td>{profile.profile?.medical_insurance_number || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Card Image</td><td>
                {profile.profile?.insurance_card_image
                  ? <img src={`/${profile.profile.insurance_card_image}`} alt="Insurance Card" style={{ maxWidth: 300, maxHeight: 200, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }} onClick={() => setPreviewCard(true)} />
                  : <span className="text-muted">No image uploaded</span>}
                <div style={{ marginTop: 8 }}>
                  <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer' }}>
                    {uploadingCard ? 'Uploading...' : 'Upload Card Image'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadCard} disabled={uploadingCard} />
                  </label>
                </div>
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {previewCard && (
        <div className="modal-overlay" onClick={() => setPreviewCard(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2>Insurance Card</h2>
            <img src={`/${profile.profile?.insurance_card_image}`} alt="Insurance Card" style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setPreviewCard(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  const fields = [
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'nationality', label: 'Nationality', type: 'text' },
    { key: 'birth_date', label: 'Birth Date', type: 'date' },
    { key: 'birth_place', label: 'Birth Place', type: 'text' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female'] },
    { key: 'marital_status', label: 'Marital Status', type: 'select', options: ['single', 'married', 'divorced'] },
    { key: 'military_status', label: 'Military Status', type: 'select', options: MILITARY_OPTIONS },
    { key: 'id_number', label: 'ID Number', type: 'text' },
    { key: 'national_id_place', label: 'ID Issue Place', type: 'text' },
    { key: 'mother_name', label: 'Mother Name', type: 'text' },
    { key: 'id_expiry', label: 'ID Expiry Date', type: 'date' },
    { key: 'passport_number', label: 'Passport Number', type: 'text' },
    { key: 'passport_expiry', label: 'Passport Expiry', type: 'date' },
    { key: 'insurance_number', label: 'Insurance Number', type: 'text' },
    { key: 'medical_insurance_number', label: 'Medical Insurance Card Number', type: 'text' },
  ];

  return (
    <div className="card">
      <div className="card-header"><h3>Edit Basic Information</h3></div>
      <div className="card-body">
        {message && <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>{message.text}</div>}
        <div className="form-row">
          {fields.map(f => (
            <label key={f.key}>
              {f.label}
              {f.type === 'textarea' ? (
                <textarea className="form-control" rows={3} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              ) : f.type === 'select' ? (
                <select className="form-control" value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                  <option value="">—</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="form-control" type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
