import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ProfileSection from './ProfileSection';
import ProfileField from './ProfileField';
import '../styles/profile.css';

export default function ProfileEmployment({ profile, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [grades, setGrades] = useState([]);
  const [form, setForm] = useState(profileToForm(profile));
  const [gradeWarning, setGradeWarning] = useState('');

  function fmtDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  useEffect(() => {
    if (editing) setForm(profileToForm(profile));
  }, [editing, profile]);

  function profileToForm(p) {
    return {
      title_id: p.title_id || '',
      department_id: p.department_id || '',
      grade_id: p.grade_id || '',
      hire_date: fmtDate(p.profile?.hire_date),
      contract_type: p.profile?.contract_type || 'permanent',
      contract_end_date: fmtDate(p.profile?.contract_end_date),
      work_type: p.profile?.work_type || 'full_time',
      supervisor_id: p.profile?.supervisor_id || '',
      bank_name: p.profile?.bank_name || '',
      bank_account: p.profile?.bank_account || '',
      emergency_contact_name: p.profile?.emergency_contact_name || '',
      emergency_contact_phone: p.profile?.emergency_contact_phone || '',
      emergency_contact_relation: p.profile?.emergency_contact_relation || '',
    };
  }

  useEffect(() => {
    hrApi.get('/department-titles').then(r => setPositions(r.data)).catch(() => {});
    hrApi.get('/departments').then(r => setDepartments(r.data)).catch(() => {});
    hrApi.get('/grades').then(r => setGrades(r.data)).catch(() => {});
    hrApi.get('/employees').then(r => setEmployees(r.data?.employees || r.data || [])).catch(() => {});
  }, []);

  async function handleSave() {
    await hrApi.put(`/employees/${profile.id}/profile`, form);
    setEditing(false);
    onUpdate();
  }

  async function handleRenew() {
    if (!confirm('Renew contract for 1 more year?')) return;
    try {
      await hrApi.post(`/employees/${profile.id}/renew-contract`);
      onUpdate();
    } catch (err) {
      alert('Failed to renew: ' + (err.response?.data?.error || err.message));
    }
  }

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const filteredTitles = form.department_id
    ? positions.filter(t => String(t.department_id) === String(form.department_id))
    : [];

  return (
    <ProfileSection
      title="Employment Details"
      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
      editing={editing}
      onEdit={() => setEditing(true)}
      onSave={handleSave}
      onCancel={() => setEditing(false)}
      actions={
        profile.profile?.contract_end_date && profile.profile?.contract_type === 'annual' && (
          <button className="profile-btn profile-btn-ghost profile-btn-sm" onClick={handleRenew}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            Renew
          </button>
        )
      }
    >
      {editing ? (
        <>
          {gradeWarning && (
            <div className="profile-message profile-message-warning" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24', marginBottom: 16 }}>
              ⚠️ {gradeWarning}
            </div>
          )}
          <div className="profile-fields-grid">
            <ProfileField label="Department" value={form.department_id} type="select" icon="🏢" editing
              options={departments.map(d => ({ value: String(d.id), label: d.name }))}
              onChange={val => { update('department_id', val); update('title_id', ''); setGradeWarning(''); }} />
            <ProfileField label="Position (Title)" value={form.title_id} type="select" icon="💼" editing
              options={filteredTitles.map(t => ({ value: String(t.id), label: t.title }))}
              onChange={val => {
                update('title_id', val);
                const t = positions.find(x => String(x.id) === val);
                if (t?.grade_id) update('grade_id', String(t.grade_id));
                setGradeWarning('');
              }} />
            <ProfileField label="Grade" value={form.grade_id} type="select" icon="📊" editing
              options={grades.map(g => ({ value: String(g.id), label: `Grade ${g.grade_level} — ${g.name}` }))}
              onChange={val => {
                update('grade_id', val);
                const t = positions.find(x => String(x.id) === form.title_id);
                if (t && val) {
                  const titleGrade = grades.find(g => String(g.id) === String(t.grade_id));
                  const selectedGrade = grades.find(g => String(g.id) === String(val));
                  if (titleGrade && selectedGrade && selectedGrade.grade_level > titleGrade.grade_level) {
                    setGradeWarning(`Selected grade (${selectedGrade.name}, Lv.${selectedGrade.grade_level}) is higher than the title's grade (${titleGrade.name}, Lv.${titleGrade.grade_level})`);
                  } else setGradeWarning('');
                }
              }} />
            <ProfileField label="Supervisor" value={form.supervisor_id} type="select" icon="👤" editing
              options={employees.filter(e => e.id !== profile.id).map(e => ({ value: String(e.id), label: e.name }))}
              onChange={val => update('supervisor_id', val)} />
            <ProfileField label="Hire Date" value={form.hire_date} type="date" icon="📅" editing onChange={val => update('hire_date', val)} />
            <ProfileField label="Contract Type" value={form.contract_type} type="select" icon="📋" editing
              options={[{ value: 'permanent', label: 'Permanent' }, { value: 'annual', label: 'Annual' }, { value: 'probation', label: 'Probation' }, { value: 'contractor', label: 'Contractor' }]}
              onChange={val => update('contract_type', val)} />
            <ProfileField label="Contract End Date" value={form.contract_end_date} type="date" icon="📅" editing onChange={val => update('contract_end_date', val)} />
            <ProfileField label="Work Type" value={form.work_type} type="select" icon="⏰" editing
              options={[{ value: 'full_time', label: 'Full Time' }, { value: 'part_time', label: 'Part Time' }, { value: 'remote', label: 'Remote' }]}
              onChange={val => update('work_type', val)} />
            <ProfileField label="Bank Name" value={form.bank_name} icon="🏦" editing onChange={val => update('bank_name', val)} />
            <ProfileField label="Bank Account" value={form.bank_account} icon="💳" editing onChange={val => update('bank_account', val)} />
            <div className="profile-field is-editing">
              <div className="profile-field-label">
                <span className="profile-field-icon">📞</span>
                <span>Emergency Contact</span>
              </div>
              <div className="profile-field-value">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" className="profile-field-input" placeholder="Name" value={form.emergency_contact_name} onChange={e => update('emergency_contact_name', e.target.value)} />
                  <input type="text" className="profile-field-input" placeholder="Phone" value={form.emergency_contact_phone} onChange={e => update('emergency_contact_phone', e.target.value)} style={{ flex: '0 0 160px' }} />
                </div>
              </div>
            </div>
            <ProfileField label="Emergency Relation" value={form.emergency_contact_relation} icon="👨‍👩‍👧‍👦" editing onChange={val => update('emergency_contact_relation', val)} />
          </div>
        </>
      ) : (
        <div className="profile-fields-grid">
          <ProfileField label="Position" value={profile.position_title} icon="💼" />
          <ProfileField label="Department" value={profile.department_name} icon="🏢" />
          <ProfileField label="Grade" value={profile.grade_name ? `${profile.grade_name} (Lv.${profile.grade_level})` : null} icon="📊" />
          <ProfileField label="Hire Date" value={profile.profile?.hire_date} type="date" icon="📅" />
          <ProfileField label="Contract Type" value={profile.profile?.contract_type} icon="📋" />
          <ProfileField label="Contract End" value={profile.profile?.contract_end_date} type="date" icon="📅" />
          <ProfileField label="Work Type" value={profile.profile?.work_type} icon="⏰" />
          <ProfileField label="Supervisor" value={profile.profile?.supervisor_id ? `#${profile.profile.supervisor_id}` : null} icon="👤" />
          <ProfileField label="Bank Name" value={profile.profile?.bank_name} icon="🏦" />
          <ProfileField label="Bank Account" value={profile.profile?.bank_account} icon="💳" />
          <ProfileField label="Emergency Contact" value={[profile.profile?.emergency_contact_name, profile.profile?.emergency_contact_phone].filter(Boolean).join(' — ')} icon="📞" />
          <ProfileField label="Emergency Relation" value={profile.profile?.emergency_contact_relation} icon="👨‍👩‍👧‍👦" />
        </div>
      )}
    </ProfileSection>
  );
}
