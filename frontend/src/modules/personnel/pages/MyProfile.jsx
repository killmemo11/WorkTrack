// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import api from '../../../shared/api';
import ProfileTimeline from '../components/ProfileTimeline';
import IDCardModal from '../../../shared/components/IDCardModal';
import { sanitizeHTML } from '../../../shared/utils/sanitize';

export default function MyProfile() {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [assetHistory, setAssetHistory] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState({ phone: '', address: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [showAssetHistory, setShowAssetHistory] = useState(false);
  const [viewContractContent, setViewContractContent] = useState(null);

  useEffect(() => { loadProfile(); fetchAssets(); fetchContracts(); }, []);

  function toggleEdit() {
    if (!editing && profile) {
      setForm({
        phone: profile.phone || '',
        address: profile.profile?.address || '',
        emergency_contact_name: profile.profile?.emergency_contact_name || '',
        emergency_contact_phone: profile.profile?.emergency_contact_phone || '',
        emergency_contact_relation: profile.profile?.emergency_contact_relation || '',
      });
    }
    setEditing(!editing);
  }

  async function loadProfile() {
    setLoading(true);
    try {
      const { data } = await api.get('/personnel/my-profile');
      setProfile(data);
      setForm({
        phone: data.phone || '',
        address: data.profile?.address || '',
        emergency_contact_name: data.profile?.emergency_contact_name || '',
        emergency_contact_phone: data.profile?.emergency_contact_phone || '',
        emergency_contact_relation: data.profile?.emergency_contact_relation || '',
      });
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function fetchAssets() {
    try {
      const res = await api.get('/personnel/my-assets');
      setAssets(res.data);
      const histRes = await api.get('/personnel/my-assets/history');
      setAssetHistory(histRes.data);
    } catch { /* ignore */ }
  }

  async function fetchContracts() {
    try {
      const res = await api.get('/personnel/my-contracts');
      setContracts(res.data);
    } catch { /* ignore */ }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post('/personnel/my-avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadProfile();
    } catch { /* ignore */ } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    await api.put('/personnel/my-profile', form);
    setEditing(false);
    loadProfile();
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwSaving(true);
    setPwMessage('');
    setPwError('');
    try {
      await api.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
      setPwMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
    setTimeout(() => { setPwMessage(''); setPwError(''); }, 3000);
  }

  const openContractContent = async (id) => {
    try {
      const res = await api.get(`/personnel/my-contracts/${id}/content`);
      setViewContractContent(res.data.content);
    } catch (err) {
      console.error('Failed to load contract content:', err);
    }
  };

  const assetStatusBadge = (s) => {
    const colors = { available: 'glass-badge-success', assigned: 'glass-badge-info', damaged: 'glass-badge-danger', disposed: 'glass-badge-default' };
    return <span className={`glass-badge ${colors[s] || 'glass-badge-default'}`}>{s}</span>;
  };

  const contractStatusBadge = (s) => {
    const colors = { draft: 'glass-badge-warning', signed: 'glass-badge-success', expired: 'glass-badge-default', renewed: 'glass-badge-info' };
    return <span className={`glass-badge ${colors[s] || 'glass-badge-default'}`}>{s}</span>;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );
  if (!profile) return (
    <div className="glass-alert glass-alert-danger">
      Could not load profile.
    </div>
  );

  return (
    <div className="page">
      <div className="glass-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {profile.profile?.avatar_path
              ? <img src={`/${profile.profile.avatar_path}`} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-glass)', boxShadow: '0 0 16px rgba(99,102,241,0.15)' }} />
              : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--text-primary)', border: '2px solid var(--border-glass)' }}>{profile.name?.[0]?.toUpperCase()}</div>}
            <input type="file" accept="image/*" id="my-avatar-upload" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            <label htmlFor="my-avatar-upload" style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--bg-glass)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-glass)', fontSize: 12, lineHeight: 1, backdropFilter: 'blur(8px)' }} title="Upload avatar">
              {uploadingAvatar ? <div className="spinner" style={{ width: 10, height: 10, borderWidth: 2 }} /> : <Icon icon="lucide:camera" style={{ fontSize: 11 }}></Icon>}
            </label>
          </div>
          <h2>My Profile</h2>
          <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setShowIdCard(true)}>
            <Icon icon="lucide:id-card" style={{ marginRight: 4, fontSize: 13 }}></Icon>
            My ID Card
          </button>
        </div>
      </div>

      <div className="glass-tabs" style={{ marginBottom: 16 }}>
        <button className={`glass-tab ${tab === 'profile' ? 'glass-tab-active' : ''}`} onClick={() => setTab('profile')}>Profile</button>
        <button className={`glass-tab ${tab === 'assets' ? 'glass-tab-active' : ''}`} onClick={() => setTab('assets')}>
          Assets {assets.length > 0 && <span className="glass-badge glass-badge-info" style={{ marginLeft: 6 }}>{assets.length}</span>}
        </button>
        <button className={`glass-tab ${tab === 'contracts' ? 'glass-tab-active' : ''}`} onClick={() => setTab('contracts')}>
          Contracts {contracts.length > 0 && <span className="glass-badge glass-badge-info" style={{ marginLeft: 6 }}>{contracts.length}</span>}
        </button>
      </div>

      {tab === 'profile' && (<>
      <div className="glass-card fade-in-up">
        <div className="glass-card-header"><h3>Basic Information</h3></div>
        <div className="glass-card-body">
          <div className="glass-detail-grid">
            <div className="glass-detail-row"><span className="glass-detail-label">Name</span><span className="glass-detail-value">{profile.name}</span></div>
            <div className="glass-detail-row"><span className="glass-detail-label">Employee ID</span><span className="glass-detail-value">{profile.employee_id}</span></div>
            <div className="glass-detail-row"><span className="glass-detail-label">Email</span><span className="glass-detail-value">{profile.email}</span></div>
            <div className="glass-detail-row"><span className="glass-detail-label">Phone</span><span className="glass-detail-value">{profile.phone || <span style={{ color: 'var(--text-faint)' }}>—</span>}</span></div>
            <div className="glass-detail-row"><span className="glass-detail-label">Department</span><span className="glass-detail-value">{profile.department_name || <span style={{ color: 'var(--text-faint)' }}>—</span>}</span></div>
            <div className="glass-detail-row"><span className="glass-detail-label">Position</span><span className="glass-detail-value">{profile.position_title || <span style={{ color: 'var(--text-faint)' }}>—</span>}</span></div>
            <div className="glass-detail-row"><span className="glass-detail-label">Grade</span><span className="glass-detail-value">{profile.grade_name ? `${profile.grade_name} (Lv.${profile.grade_level})` : <span style={{ color: 'var(--text-faint)' }}>—</span>}</span></div>
          </div>
        </div>
      </div>

      <div className="glass-card fade-in-up">
        <div className="glass-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3>Contact & Emergency Info</h3>
          <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={toggleEdit}>
            <Icon icon={editing ? 'lucide:x' : 'lucide:pencil'} style={{ marginRight: 4, fontSize: 13 }}></Icon>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        <div className="glass-card-body">
          {!editing ? (
            <div className="glass-detail-grid">
              <div className="glass-detail-row"><span className="glass-detail-label">Address</span><span className="glass-detail-value">{profile.profile?.address || <span style={{ color: 'var(--text-faint)' }}>—</span>}</span></div>
              <div className="glass-detail-row"><span className="glass-detail-label">Emergency Contact</span><span className="glass-detail-value">{profile.profile?.emergency_contact_name || <span style={{ color: 'var(--text-faint)' }}>—</span>}</span></div>
              <div className="glass-detail-row"><span className="glass-detail-label">Emergency Phone</span><span className="glass-detail-value">{profile.profile?.emergency_contact_phone || <span style={{ color: 'var(--text-faint)' }}>—</span>}</span></div>
              <div className="glass-detail-row"><span className="glass-detail-label">Emergency Relation</span><span className="glass-detail-value">{profile.profile?.emergency_contact_relation || <span style={{ color: 'var(--text-faint)' }}>—</span>}</span></div>
            </div>
          ) : (
            <div>
              <div className="glass-grid" style={{ marginBottom: 16 }}>
                <div className="glass-form-group">
                  <label className="glass-label">Phone</label>
                  <input className="glass-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="glass-form-group">
                  <label className="glass-label">Address</label>
                  <textarea className="glass-textarea" rows={3} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="glass-form-group">
                  <label className="glass-label">Emergency Contact Name</label>
                  <input className="glass-input" value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} />
                </div>
                <div className="glass-form-group">
                  <label className="glass-label">Emergency Contact Phone</label>
                  <input className="glass-input" value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} />
                </div>
                <div className="glass-form-group">
                  <label className="glass-label">Emergency Contact Relation</label>
                  <input className="glass-input" value={form.emergency_contact_relation} onChange={e => setForm({ ...form, emergency_contact_relation: e.target.value })} />
                </div>
              </div>
              <button className="glass-btn glass-btn-primary" onClick={handleSave}>
                <Icon icon="lucide:check" style={{ marginRight: 4, fontSize: 14 }}></Icon>
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card fade-in-up">
        <div className="glass-card-header"><h3>Medical Insurance</h3></div>
        <div className="glass-card-body">
          <div className="glass-detail-grid">
            <div className="glass-detail-row"><span className="glass-detail-label">Card Number</span><span className="glass-detail-value">{profile.profile?.medical_insurance_number || <span style={{ color: 'var(--text-faint)' }}>—</span>}</span></div>
            <div className="glass-detail-row"><span className="glass-detail-label">Card Image</span><span className="glass-detail-value">
              {profile.profile?.insurance_card_image
                ? <img src={`/${profile.profile.insurance_card_image}`} alt="Insurance Card" style={{ maxWidth: 300, maxHeight: 200, objectFit: 'contain', border: '1px solid var(--border-glass)', borderRadius: 8 }} />
                : <span style={{ color: 'var(--text-faint)' }}>No image uploaded</span>}
            </span></div>
          </div>
        </div>
      </div>

      <div className="glass-card fade-in-up">
        <div className="glass-card-header"><h3>Medical Family Members</h3></div>
        <div className="glass-card-body">
          {(!profile.medicalFamily || profile.medicalFamily.length === 0) && <p style={{ color: 'var(--text-dim)' }}>No family members added.</p>}
          {(profile.medicalFamily || []).map(m => (
            <div key={m.id} className="glass-detail-row" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-dim)', fontSize: 14, fontWeight: 600 }}>
                {m.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div><strong>{m.name}</strong> {m.relation && <span className="glass-badge glass-badge-info">{m.relation}</span>}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{m.medical_insurance_number || 'No card number'}</div>
                {m.insurance_card_image && <img src={`/${m.insurance_card_image}`} alt="Card" style={{ maxWidth: 200, maxHeight: 100, objectFit: 'contain', border: '1px solid var(--border-glass)', borderRadius: 8, marginTop: 8 }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProfileTimeline profile={profile} />

      <div className="glass-card fade-in-up" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Change Password</h3>
        {pwMessage && <div className="glass-alert glass-alert-success" style={{ marginBottom: 16 }}>{pwMessage}</div>}
        {pwError && <div className="glass-alert glass-alert-danger" style={{ marginBottom: 16 }}>{pwError}</div>}
        <form onSubmit={handleChangePassword}>
          <div className="glass-grid" style={{ marginBottom: 16 }}>
            <div className="glass-form-group">
              <label className="glass-label">Current Password</label>
              <input type="password" className="glass-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="glass-form-group">
              <label className="glass-label">New Password</label>
              <input type="password" className="glass-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
            </div>
          </div>
          <button className="glass-btn glass-btn-primary" disabled={pwSaving}>
            {pwSaving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} /><span>Saving...</span></> : <>
              <Icon icon="lucide:key-round" style={{ marginRight: 4, fontSize: 14 }}></Icon>
              Change Password
            </>}
          </button>
        </form>
      </div>
      </>)}

      {tab === 'assets' && (
        <div className="glass-card fade-in-up">
          <div className="glass-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>My Assets</h3>
            <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setShowAssetHistory(!showAssetHistory)}>
              <Icon icon={showAssetHistory ? 'lucide:eye-off' : 'lucide:history'} style={{ marginRight: 4, fontSize: 13 }}></Icon>
              {showAssetHistory ? 'Hide History' : 'View History'}
            </button>
          </div>
          <div className="glass-card-body">
            {assets.length === 0 ? (
              <div className="glass-empty">
                <Icon icon="lucide:package" style={{ fontSize: 40, opacity: 0.4 }}></Icon>
                <p>No assets assigned to you.</p>
              </div>
            ) : (
              <div className="glass-table-wrapper">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Category</th>
                      <th>Serial #</th>
                      <th>Brand / Model</th>
                      <th>Status</th>
                      <th>Assigned Date</th>
                      <th>Expected Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map(a => (
                      <tr key={a.id}>
                        <td><strong>{a.name}</strong></td>
                        <td><span className="glass-badge glass-badge-info">{a.category}</span></td>
                        <td>{a.serial_number || '—'}</td>
                        <td>{[a.brand, a.model].filter(Boolean).join(' / ') || '—'}</td>
                        <td>{assetStatusBadge(a.status)}</td>
                        <td>{formatDate(a.assigned_date)}</td>
                        <td>{formatDate(a.expected_return_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showAssetHistory && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ marginBottom: 12 }}>Asset History</h4>
                {assetHistory.length === 0 ? (
                  <div className="glass-empty">
                    <Icon icon="lucide:history" style={{ fontSize: 32, opacity: 0.3 }}></Icon>
                    <p>No history records.</p>
                  </div>
                ) : (
                  <div className="glass-table-wrapper">
                    <table className="glass-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Asset</th>
                          <th>Action</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetHistory.map(h => (
                          <tr key={h.created_at + h.asset_name}>
                            <td>{formatDate(h.created_at)}</td>
                            <td>{h.asset_name}</td>
                            <td><span className={`glass-badge ${h.action === 'assigned' ? 'glass-badge-info' : h.action === 'returned' ? 'glass-badge-success' : 'glass-badge-default'}`}>{h.action}</span></td>
                            <td>{h.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'contracts' && (
        <div className="glass-card fade-in-up">
          <div className="glass-card-header"><h3>My Contracts</h3></div>
          <div className="glass-card-body">
            {contracts.length === 0 ? (
              <div className="glass-empty">
                <Icon icon="lucide:file-text" style={{ fontSize: 40, opacity: 0.4 }}></Icon>
                <p>No contracts available.</p>
              </div>
            ) : (
              <div className="glass-table-wrapper">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Template</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                      <th>Signed</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.template_name || '—'}</strong></td>
                        <td>{formatDate(c.start_date)}</td>
                        <td>{formatDate(c.end_date)}</td>
                        <td>{contractStatusBadge(c.status)}</td>
                        <td>
                          {c.signed_by_employee ? <Icon icon="lucide:check-circle" style={{ color: 'var(--success)', marginRight: 4, verticalAlign: 'middle' }}></Icon> : ''}
                          {c.signed_by_employee ? 'Employee' : ''}
                          {c.signed_by_employee && c.signed_by_company ? ' & ' : ''}
                          {c.signed_by_company ? <Icon icon="lucide:check-circle" style={{ color: 'var(--success)', marginRight: 4, verticalAlign: 'middle' }}></Icon> : ''}
                          {c.signed_by_company ? 'Company' : ''}
                          {!c.signed_by_employee && !c.signed_by_company ? '—' : ''}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => openContractContent(c.id)}>
                              <Icon icon="lucide:eye" style={{ marginRight: 4, fontSize: 12 }}></Icon>
                              View
                            </button>
                            <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={async () => {
                              try {
                                const res = await api.get(`/personnel/my-contracts/${c.id}/pdf`, { responseType: 'blob' });
                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                const a = document.createElement('a'); a.href = url; a.download = `contract-${c.id}.pdf`;
                                document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                              } catch (e) { console.error('Failed to download PDF:', e); }
                            }}>
                              <Icon icon="lucide:download" style={{ marginRight: 4, fontSize: 12 }}></Icon>
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showIdCard && profile && <IDCardModal employeeId={profile.id} onClose={() => setShowIdCard(false)} />}

      {viewContractContent && (
        <div className="glass-modal-overlay" onClick={() => setViewContractContent(null)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: 16 }}>Contract</h3>
            <div className="glass-card" dangerouslySetInnerHTML={{ __html: sanitizeHTML(viewContractContent) }} />
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => { const w = window.open(''); w.document.write(sanitizeHTML(viewContractContent)); w.print(); }}>
                <Icon icon="lucide:printer" style={{ marginRight: 4, fontSize: 14 }}></Icon>
                Print
              </button>
              <button className="glass-btn glass-btn-ghost" onClick={() => setViewContractContent(null)}>
                <Icon icon="lucide:x" style={{ marginRight: 4, fontSize: 14 }}></Icon>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
