// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import api from '../../../shared/api';
import ProfileTimeline from '../components/ProfileTimeline';
import IDCardModal from '../../../shared/components/IDCardModal';

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
    const colors = { available: 'tag-green', assigned: 'tag-blue', damaged: 'tag-red', disposed: 'tag-gray' };
    return <span className={`tag ${colors[s] || 'tag-gray'}`}>{s}</span>;
  };

  const contractStatusBadge = (s) => {
    const colors = { draft: 'tag-amber', signed: 'tag-green', expired: 'tag-gray', renewed: 'tag-blue' };
    return <span className={`tag ${colors[s] || 'tag-gray'}`}>{s}</span>;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!profile) return <div className="error">Could not load profile.</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {profile.profile?.avatar_path
              ? <img src={`/${profile.profile.avatar_path}`} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} />
              : <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#999', border: '2px solid #ddd' }}>{profile.name?.[0]?.toUpperCase()}</div>}
            <input type="file" accept="image/*" id="my-avatar-upload" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            <label htmlFor="my-avatar-upload" style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #ccc', fontSize: 12, lineHeight: 1 }} title="Upload avatar">{uploadingAvatar ? '...' : '✎'}</label>
          </div>
          <h2>My Profile</h2>
          <button className="btn btn-sm btn-outline" onClick={() => setShowIdCard(true)}>My ID Card</button>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${tab === 'profile' ? 'tab-active' : ''}`} onClick={() => setTab('profile')}>Profile</button>
        <button className={`tab ${tab === 'assets' ? 'tab-active' : ''}`} onClick={() => setTab('assets')}>
          Assets {assets.length > 0 && <span className="badge badge-info" style={{ marginLeft: 6 }}>{assets.length}</span>}
        </button>
        <button className={`tab ${tab === 'contracts' ? 'tab-active' : ''}`} onClick={() => setTab('contracts')}>
          Contracts {contracts.length > 0 && <span className="badge badge-info" style={{ marginLeft: 6 }}>{contracts.length}</span>}
        </button>
      </div>

      {tab === 'profile' && (<>
      <div className="card">
        <div className="card-header"><h3>Basic Information</h3></div>
        <div className="card-body">
          <table className="table-details">
            <tbody>
              <tr><td>Name</td><td>{profile.name}</td></tr>
              <tr><td>Employee ID</td><td>{profile.employee_id}</td></tr>
              <tr><td>Email</td><td>{profile.email}</td></tr>
              <tr><td>Phone</td><td>{profile.phone || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Department</td><td>{profile.department_name || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Position</td><td>{profile.position_title || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Grade</td><td>{profile.grade_name ? `${profile.grade_name} (Lv.${profile.grade_level})` : <span className="text-muted">—</span>}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Contact & Emergency Info</h3>
          <button className="btn btn-sm btn-outline" onClick={toggleEdit}>{editing ? 'Cancel' : 'Edit'}</button>
        </div>
        <div className="card-body">
          {!editing ? (
            <table className="table-details">
              <tbody>
                <tr><td>Address</td><td>{profile.profile?.address || <span className="text-muted">—</span>}</td></tr>
                <tr><td>Emergency Contact</td><td>{profile.profile?.emergency_contact_name || <span className="text-muted">—</span>}</td></tr>
                <tr><td>Emergency Phone</td><td>{profile.profile?.emergency_contact_phone || <span className="text-muted">—</span>}</td></tr>
                <tr><td>Emergency Relation</td><td>{profile.profile?.emergency_contact_relation || <span className="text-muted">—</span>}</td></tr>
              </tbody>
            </table>
          ) : (
            <div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <label>Phone<input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
                <label>Address<textarea className="form-control" rows={3} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
                <label>Emergency Contact Name<input className="form-control" value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} /></label>
                <label>Emergency Contact Phone<input className="form-control" value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} /></label>
                <label>Emergency Contact Relation<input className="form-control" value={form.emergency_contact_relation} onChange={e => setForm({ ...form, emergency_contact_relation: e.target.value })} /></label>
              </div>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Medical Insurance</h3></div>
        <div className="card-body">
          <table className="table-details">
            <tbody>
              <tr><td>Card Number</td><td>{profile.profile?.medical_insurance_number || <span className="text-muted">—</span>}</td></tr>
              <tr><td>Card Image</td><td>
                {profile.profile?.insurance_card_image
                  ? <img src={`/${profile.profile.insurance_card_image}`} alt="Insurance Card" style={{ maxWidth: 300, maxHeight: 200, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4 }} />
                  : <span className="text-muted">No image uploaded</span>}
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Medical Family Members</h3></div>
        <div className="card-body">
          {(!profile.medicalFamily || profile.medicalFamily.length === 0) && <p className="text-muted">No family members added.</p>}
          {(profile.medicalFamily || []).map(m => (
            <div key={m.id} className="list-item" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div><strong>{m.name}</strong> {m.relation && <span className="badge badge-info">{m.relation}</span>}</div>
                <div className="text-muted">{m.medical_insurance_number || 'No card number'}</div>
                {m.insurance_card_image && <img src={`/${m.insurance_card_image}`} alt="Card" style={{ maxWidth: 200, maxHeight: 100, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4, marginTop: 4 }} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProfileTimeline profile={profile} />

      <div className="card" style={{ padding: 24 }}>
        <h3>Change Password</h3>
        {pwMessage && <div className="alert alert-success">{pwMessage}</div>}
        {pwError && <div className="alert alert-error">{pwError}</div>}
        <form onSubmit={handleChangePassword}>
          <div className="form-row" style={{ marginBottom: 16 }}>
            <label>Current Password<input type="password" className="form-control" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required style={{ width: '100%' }} /></label>
            <label>New Password<input type="password" className="form-control" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} style={{ width: '100%' }} /></label>
          </div>
          <button className="btn btn-primary" disabled={pwSaving}>{pwSaving ? 'Saving...' : 'Change Password'}</button>
        </form>
      </div>
      </>)}

      {tab === 'assets' && (
        <div className="card">
          <div className="card-header">
            <h3>My Assets</h3>
            <button className="btn btn-sm btn-outline" onClick={() => setShowAssetHistory(!showAssetHistory)}>
              {showAssetHistory ? 'Hide History' : 'View History'}
            </button>
          </div>
          <div className="card-body">
            {assets.length === 0 ? (
              <p className="empty-state">No assets assigned to you.</p>
            ) : (
              <div className="table-wrapper">
                <table className="table">
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
                        <td><span className="tag tag-blue">{a.category}</span></td>
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
                <h4>Asset History</h4>
                {assetHistory.length === 0 ? (
                  <p className="empty-state">No history records.</p>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
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
                            <td><span className={`tag ${h.action === 'assigned' ? 'tag-blue' : h.action === 'returned' ? 'tag-green' : 'tag-gray'}`}>{h.action}</span></td>
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
        <div className="card">
          <div className="card-header"><h3>My Contracts</h3></div>
          <div className="card-body">
            {contracts.length === 0 ? (
              <p className="empty-state">No contracts available.</p>
            ) : (
              <div className="table-wrapper">
                <table className="table">
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
                          {c.signed_by_employee ? '✅ Employee' : ''}
                          {c.signed_by_employee && c.signed_by_company ? ' & ' : ''}
                          {c.signed_by_company ? '✅ Company' : ''}
                          {!c.signed_by_employee && !c.signed_by_company ? '—' : ''}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-sm btn-outline" onClick={() => openContractContent(c.id)}>View</button>
                            <button className="btn btn-sm btn-primary" onClick={async () => {
                              try {
                                const res = await api.get(`/personnel/my-contracts/${c.id}/pdf`, { responseType: 'blob' });
                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                const a = document.createElement('a'); a.href = url; a.download = `contract-${c.id}.pdf`;
                                document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                              } catch (e) { console.error('Failed to download PDF:', e); }
                            }}>PDF</button>
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
        <div className="modal-overlay" onClick={() => setViewContractContent(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Contract</h3>
            <div style={{ border: '1px solid #e2e8f0', padding: 24, borderRadius: 8, background: '#fff' }} dangerouslySetInnerHTML={{ __html: viewContractContent }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => { const w = window.open(''); w.document.write(viewContractContent); w.print(); }}>Print</button>
              <button className="btn btn-outline" onClick={() => setViewContractContent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
