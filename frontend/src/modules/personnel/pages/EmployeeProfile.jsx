// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import hrApi from '../../../shared/api/hrApi';

import ProfileBasicInfo from '../components/ProfileBasicInfo';
import ProfileEmployment from '../components/ProfileEmployment';
import ProfileEducation from '../components/ProfileEducation';
import ProfileWorkHistory from '../components/ProfileWorkHistory';
import ProfileCertifications from '../components/ProfileCertifications';
import ProfileMedicalFamily from '../components/ProfileMedicalFamily';
import ProfileDocuments from '../components/ProfileDocuments';
import ProfileTimeline from '../components/ProfileTimeline';
import IDCardModal from '../../../shared/components/IDCardModal';
import ProfileContracts from '../components/ProfileContracts';
import ProfileSalary from '../components/ProfileSalary';
import ProfileChecklists from '../components/ProfileChecklists';

const TABS = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'employment', label: 'Employment' },
  { key: 'salary', label: 'Salary' },
  { key: 'education', label: 'Education' },
  { key: 'work-history', label: 'Work History' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'medical-family', label: 'Medical Family' },
  { key: 'documents', label: 'Documents' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'checklists', label: 'Checklists' },
  { key: 'timeline', label: 'Timeline' },
];

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [uploading, setUploading] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [id]);

  async function loadProfile() {
    try {
      setLoading(true);
      const { data } = await hrApi.get(`/employees/${id}/profile`);
      setProfile(data);
    } catch {
      navigate('/hr/employees');
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await hrApi.post(`/employees/${id}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadProfile();
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="loading">Loading profile...</div>;
  if (!profile) return null;

  return (
    <>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {profile.profile?.avatar_path
              ? <img src={`/${profile.profile.avatar_path}`} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} />
              : <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#999', border: '2px solid #ddd' }}>{profile.name?.[0]?.toUpperCase()}</div>}
            <input type="file" accept="image/*" id="avatar-upload" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            <label htmlFor="avatar-upload" style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid #ccc', fontSize: 12, lineHeight: 1 }} title="Upload avatar">{uploading ? '...' : '✎'}</label>
          </div>
          <div>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/hr/employees')}>&larr; Back to Employees</button>
            <button className="btn btn-sm btn-primary" style={{ marginLeft: 8 }} onClick={() => setShowIdCard(true)}>ID Card</button>
            <h2 style={{ marginTop: 4 }}>{profile.name} <span className="text-muted">(#{profile.employee_id})</span></h2>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'basic' && <ProfileBasicInfo profile={profile} onUpdate={loadProfile} />}
        {activeTab === 'employment' && <ProfileEmployment profile={profile} onUpdate={loadProfile} />}
        {activeTab === 'education' && <ProfileEducation profile={profile} onUpdate={loadProfile} />}
        {activeTab === 'work-history' && <ProfileWorkHistory profile={profile} onUpdate={loadProfile} />}
        {activeTab === 'certifications' && <ProfileCertifications profile={profile} onUpdate={loadProfile} />}
        {activeTab === 'medical-family' && <ProfileMedicalFamily profile={profile} onUpdate={loadProfile} />}
        {activeTab === 'documents' && <ProfileDocuments profile={profile} onUpdate={loadProfile} />}
        {activeTab === 'salary' && <ProfileSalary employeeId={id} profile={profile} />}
        {activeTab === 'contracts' && <ProfileContracts employeeId={id} profile={profile} />}
        {activeTab === 'checklists' && <ProfileChecklists employeeId={id} profile={profile} />}
        {activeTab === 'timeline' && <ProfileTimeline profile={profile} />}
      </div>

      {showIdCard && <IDCardModal employeeId={id} onClose={() => setShowIdCard(false)} />}
    </>
  );
}
