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
  { key: 'basic', label: 'Basic Info', icon: 'lucide:user' },
  { key: 'employment', label: 'Employment', icon: 'lucide:briefcase' },
  { key: 'salary', label: 'Salary', icon: 'lucide:banknote' },
  { key: 'education', label: 'Education', icon: 'lucide:graduation-cap' },
  { key: 'work-history', label: 'Work History', icon: 'lucide:clock' },
  { key: 'certifications', label: 'Certifications', icon: 'lucide:award' },
  { key: 'medical-family', label: 'Medical Family', icon: 'lucide:heart-pulse' },
  { key: 'documents', label: 'Documents', icon: 'lucide:file-text' },
  { key: 'contracts', label: 'Contracts', icon: 'lucide:scroll-text' },
  { key: 'checklists', label: 'Checklists', icon: 'lucide:check-square' },
  { key: 'timeline', label: 'Timeline', icon: 'lucide:git-branch' },
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
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="glass-loading"><div className="spinner" /><span>Loading profile...</span></div>;
  if (!profile) return null;

  return (
    <>
      <div className="glass-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {profile.profile?.avatar_path
              ? <img src={`/${profile.profile.avatar_path}`} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-glass)' }} />
              : <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--text-dim)', border: '2px solid var(--border-glass)' }}>{profile.name?.[0]?.toUpperCase()}</div>}
            <input type="file" accept="image/*" id="avatar-upload" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            <label htmlFor="avatar-upload" style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--bg-glass)', backdropFilter: 'blur(8px)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--border-glass)', fontSize: 12, lineHeight: 1 }} title="Upload avatar">
              <span className="iconify" data-icon={uploading ? 'lucide:loader-2' : 'lucide:camera'} style={{ fontSize: 11 }} />
            </label>
          </div>
          <div>
            <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => navigate('/hr/employees')}>
              <span className="iconify" data-icon="lucide:arrow-left" style={{ marginRight: 4 }} /> Back to Employees
            </button>
            <button className="glass-btn glass-btn-primary glass-btn-sm" style={{ marginLeft: 8 }} onClick={() => setShowIdCard(true)}>
              <span className="iconify" data-icon="lucide:id-card" style={{ marginRight: 4 }} /> ID Card
            </button>
            <h2 style={{ marginTop: 4 }}>{profile.name} <span style={{ color: 'var(--text-dim)' }}>#{profile.employee_id}</span></h2>
          </div>
        </div>
      </div>

      <div className="glass-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`glass-tab ${activeTab === t.key ? 'glass-tab-active' : ''}`} onClick={() => setActiveTab(t.key)}>
            <span className="iconify" data-icon={t.icon} style={{ marginRight: 4, fontSize: 13 }} />{t.label}
          </button>
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
