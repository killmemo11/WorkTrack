import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ConfirmModal from '../../../shared/components/ConfirmModal';
import TitleCard from '../components/TitleCard';

const GRADE_LABELS = [
  { key: '', label: 'All Grades' },
  { key: 'junior', label: 'Junior', maxLevel: 3 },
  { key: 'senior', label: 'Senior', maxLevel: 6 },
  { key: 'manager', label: 'Manager', maxLevel: 9 },
  { key: 'executive', label: 'Executive', maxLevel: 99 },
];

export default function Positions() {
  const [titles, setTitles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [form, setForm] = useState({ title: '', grade_id: '', description: '', technical: false, job_summary: '', key_responsibilities: '', qualifications: '', technical_skills: '', core_competencies: '', max_headcount: '', min_education_level: '', min_experience_years: '', required_skills: [], required_certs: [], preferred_skills: [] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ department_id: '', title: '', grade_id: '', description: '', technical: false, max_headcount: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTab, setEditTab] = useState('basic');

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [titlesRes, deptsRes, gradesRes] = await Promise.all([
        hrApi.get('/department-titles'),
        hrApi.get('/departments'),
        hrApi.get('/grades'),
      ]);
      setTitles(titlesRes.data);
      setDepartments(deptsRes.data);
      setGrades(gradesRes.data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const gradeMap = useMemo(() => {
    const m = {};
    grades.forEach(g => { m[g.id] = g; });
    return m;
  }, [grades]);

  const filteredTitles = useMemo(() => {
    let list = [...titles];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(q));
    }

    if (deptFilter) {
      list = list.filter(t => t.department_id === parseInt(deptFilter));
    }

    if (gradeFilter) {
      const label = GRADE_LABELS.find(g => g.key === gradeFilter);
      if (label) {
        list = list.filter(t => {
          const g = t.grade_id ? gradeMap[t.grade_id] : null;
          return g && g.grade_level <= label.maxLevel;
        });
      }
    }

    return list;
  }, [titles, search, deptFilter, gradeFilter, gradeMap]);

  const grouped = useMemo(() => {
    const g = {};
    filteredTitles.forEach(t => {
      if (!g[t.department_id]) g[t.department_id] = [];
      g[t.department_id].push(t);
    });
    return g;
  }, [filteredTitles]);

  const stats = useMemo(() => {
    let totalFilled = 0, totalMax = 0, totalDepts = 0;
    const deptIds = new Set();
    titles.forEach(t => {
      deptIds.add(t.department_id);
      totalFilled += t.filled_count || 0;
      totalMax += t.max_headcount || 0;
    });
    totalDepts = deptIds.size;
    return { totalTitles: titles.length, totalFilled, totalMax, totalDepts };
  }, [titles]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 200);
  };

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const openEdit = async (t) => {
    setSelected(t);
    setForm({
      title: t.title, grade_id: t.grade_id || '', description: t.description || '',
      technical: !!t.technical, job_summary: t.job_summary || '',
      key_responsibilities: t.key_responsibilities || '', qualifications: t.qualifications || '',
      technical_skills: t.technical_skills || '', core_competencies: t.core_competencies || '',
      max_headcount: t.max_headcount ?? '',
      min_education_level: t.min_education_level || '',
      min_experience_years: t.min_experience_years ?? '',
      required_skills: Array.isArray(t.required_skills) ? t.required_skills : [],
      required_certs: Array.isArray(t.required_certs) ? t.required_certs : [],
      preferred_skills: Array.isArray(t.preferred_skills) ? t.preferred_skills : [],
    });
    try {
      const res = await hrApi.get(`/evaluation-criteria?title_id=${t.id}`);
      setCriteria(res.data.length > 0 ? res.data : [{ criterion_name: '', weight: '' }]);
    } catch { setCriteria([{ criterion_name: '', weight: '' }]); }
  };

  const handleCriteriaChange = (idx, field, value) => {
    setCriteria(criteria.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const addCriteriaRow = () => setCriteria([...criteria, { criterion_name: '', weight: '' }]);
  const removeCriteriaRow = (idx) => {
    if (criteria.length <= 1) return;
    setCriteria(criteria.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
      setSaving(true);
    try {
      const res = await hrApi.put(`/department-titles/${selected.id}`, {
        ...form,
        job_summary: form.job_summary || null,
        key_responsibilities: form.key_responsibilities || null,
        qualifications: form.qualifications || null,
        technical_skills: form.technical_skills || null,
        core_competencies: form.core_competencies || null,
        min_education_level: form.min_education_level || null,
        min_experience_years: form.min_experience_years || null,
        required_skills: form.required_skills,
        required_certs: form.required_certs,
        preferred_skills: form.preferred_skills,
      });
      await hrApi.post('/evaluation-criteria', {
        title_id: selected.id,
        criteria: criteria.filter(c => c.criterion_name && c.weight !== ''),
      });
      setTitles(prev => prev.map(t => t.id === selected.id ? res.data : t));
      setMsg('Saved successfully');
      setSelected(null);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Save failed');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleAddTitle = async () => {
    if (!addForm.department_id) {
      setMsg('Please select a department');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    if (!addForm.title.trim()) {
      setMsg('Please enter a title');
      setTimeout(() => setMsg(''), 3000);
      return;
    }
    setSaving(true);
    try {
      const res = await hrApi.post('/department-titles', {
        department_id: addForm.department_id,
        title: addForm.title,
        grade_id: addForm.grade_id || null,
        description: addForm.description || null,
        technical: !!addForm.technical,
        max_headcount: addForm.max_headcount || 0,
      });
      setTitles(prev => [...prev, res.data]);
      setMsg('Title added');
      setShowAdd(false);
      setAddForm({ department_id: '', title: '', grade_id: '', description: '', technical: false, max_headcount: '' });
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to add title');
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleDeleteTitle = async () => {
    if (!deleteTarget) return;
    try {
      const res = await hrApi.delete(`/department-titles/${deleteTarget.id}`);
      setTitles(prev => prev.filter(t => t.id !== res.data.id));
      setMsg('Title deleted');
      setDeleteTarget(null);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to delete title');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const toggleCollapse = (deptId) => {
    setCollapsed(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <>
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h2 style={{ margin: 0 }}>Job Architecture</h2>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            {stats.totalDepts} departments · {stats.totalTitles} titles · {stats.totalFilled} filled · {stats.totalMax} max HC
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Title
        </button>
      </div>

      {msg && <div className="alert alert-info" style={{ marginBottom: 16 }}>{msg}</div>}

      {/* ── Search + Filters Row ── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
          <input
            ref={searchRef}
            type="text"
            className="form-control"
            placeholder="Search titles..."
            defaultValue={search}
            onChange={handleSearchChange}
            style={{ width: '100%', paddingLeft: 32, fontSize: '0.85rem' }}
          />
          <kbd style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            background: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: 3,
            padding: '0 5px', fontSize: '0.65rem', color: '#64748b',
          }}>⌘K</kbd>
        </div>

        <select className="form-control" value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          style={{ width: 160, fontSize: '0.8rem' }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select className="form-control" value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
          style={{ width: 140, fontSize: '0.8rem' }}>
          {GRADE_LABELS.map(g => (
            <option key={g.key} value={g.key}>{g.label}</option>
          ))}
        </select>

        {filteredTitles.length < titles.length && (
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {filteredTitles.length} of {titles.length} results
          </span>
        )}
      </div>

      {/* ── Stats Row ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24,
      }}>
        {[
          { label: 'Departments', value: stats.totalDepts, icon: '🏢', color: '#6366f1' },
          { label: 'Titles', value: stats.totalTitles, icon: '📋', color: '#3b82f6' },
          { label: 'Filled', value: stats.totalFilled, icon: '👥', color: '#22c55e' },
          { label: 'Max HC', value: stats.totalMax, icon: '📊', color: '#f59e0b' },
          { label: 'Utilization', value: stats.totalMax > 0 ? `${Math.round(stats.totalFilled / stats.totalMax * 100)}%` : '—', icon: '📈', color: '#a855f7' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0',
            padding: '10px 14px', textAlign: 'center',
            borderTop: `3px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Empty Search State ── */}
      {search && filteredTitles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600, fontSize: 16, color: '#475569' }}>No titles match "{search}"</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Try a different search term or clear filters</div>
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => { setSearch(''); if (searchRef.current) searchRef.current.value = ''; setDeptFilter(''); setGradeFilter(''); }}>
            Clear Filters
          </button>
        </div>
      )}

      {/* ── Department Sections ── */}
      {!search && filteredTitles.length === 0 && titles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, fontSize: 16, color: '#475569' }}>No titles yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Start by adding your first job title</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>+ Add First Title</button>
        </div>
      )}

      {departments.map((dept, idx) => {
        const deptTitles = grouped[dept.id] || [];
        const deptFilled = deptTitles.reduce((s, t) => s + (t.filled_count || 0), 0);
        const deptMax = deptTitles.reduce((s, t) => s + (t.max_headcount || 0), 0);
        const deptPct = deptMax > 0 ? deptFilled / deptMax : 0;
        const isCollapsed = collapsed[dept.id];
        const isEmpty = deptTitles.length === 0;

        return (
          <div key={dept.id} style={{
            marginBottom: 16, background: '#fff', borderRadius: 10,
            border: '1px solid #e2e8f0', overflow: 'hidden',
            animation: `fadeSlideUp ${0.2 + idx * 0.03}s ease-out`,
          }}>
            {/* Department Header */}
            <div
              onClick={() => toggleCollapse(dept.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', cursor: 'pointer',
                background: '#f8fafc', borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 12, color: '#94a3b8', transition: 'transform .2s', transform: isCollapsed ? 'rotate(-90deg)' : '' }}>
                ▼
              </span>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b', flex: 1 }}>
                {dept.name}
                <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>
                  {deptTitles.length} title{deptTitles.length > 1 ? 's' : ''}
                </span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: '#64748b' }}>
                <span>👥 {deptFilled}/{deptMax || '∞'}</span>
                {deptMax > 0 && (
                  <>
                    <div style={{ width: 60, height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(deptPct * 100, 100)}%`, height: '100%',
                        background: deptPct >= 1 ? '#ef4444' : deptPct >= 0.8 ? '#f59e0b' : '#22c55e',
                        borderRadius: 3, transition: 'width .4s ease',
                      }} />
                    </div>
                    <span style={{ fontWeight: 600, color: deptPct >= 1 ? '#ef4444' : deptPct >= 0.8 ? '#f59e0b' : '#22c55e' }}>
                      {Math.round(deptPct * 100)}%
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Cards Grid */}
            {!isCollapsed && (
              <div style={{ padding: 16 }}>
                {isEmpty ? (
                  <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#64748b', marginBottom: 8 }}>
                      No titles in this department yet
                    </div>
                    <button className="btn btn-sm btn-primary" onClick={() => { setAddForm({ ...addForm, department_id: dept.id }); setShowAdd(true); }}>
                      + Add First Title
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {deptTitles.map((t, tIdx) => {
                      const grade = t.grade_id ? gradeMap[t.grade_id] : null;
                      return (
                        <div key={t.id} style={{ animation: `fadeSlideUp ${0.15 + tIdx * 0.03}s ease-out` }}>
                          <TitleCard
                            title={t.title}
                            grade={grade?.name || null}
                            gradeLevel={grade?.grade_level || null}
                            description={t.description}
                            technical={!!t.technical}
                            filled={t.filled_count || 0}
                            max={t.max_headcount || 0}
                            created_at={t.created_at}
                            hasCriteria={false}
                            onClick={() => openEdit(t)}
                            onDelete={() => setDeleteTarget(t)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Title"
          message={`Delete "${deleteTarget.title}"? Employees with this title will have it unset.`}
          onConfirm={handleDeleteTitle}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <h3>Add New Title</h3>
            <div className="form-group">
              <label>Department *</label>
              <select className="form-control" value={addForm.department_id}
                onChange={e => setAddForm({ ...addForm, department_id: e.target.value })}
                style={{ width: '100%' }}>
                <option value="">— Select —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.max_headcount > 0 ? `${d.max_headcount} HC` : '∞'})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Title *</label>
              <input className="form-control" value={addForm.title}
                onChange={e => setAddForm({ ...addForm, title: e.target.value })}
                placeholder="e.g. Software Engineer" style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label>Grade</label>
              <select className="form-control" value={addForm.grade_id}
                onChange={e => setAddForm({ ...addForm, grade_id: e.target.value })}
                style={{ width: '100%' }}>
                <option value="">— None —</option>
                {grades.map(g => <option key={g.id} value={g.id}>Grade {g.grade_level} — {g.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea className="form-control" rows={2} value={addForm.description}
                onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                placeholder="Optional description" style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <input type="checkbox" checked={addForm.technical}
                onChange={e => setAddForm({ ...addForm, technical: e.target.checked })} />
              Technical Position
            </label>
            <div className="form-group">
              <label>Max Headcount</label>
              <input className="form-control" type="number" min="0" value={addForm.max_headcount}
                onChange={e => setAddForm({ ...addForm, max_headcount: e.target.value })}
                placeholder="0 = unlimited" style={{ width: '100%' }} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddTitle} disabled={saving}>
                {saving ? 'Adding...' : 'Add Title'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setEditTab('basic'); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>✏️</span>
                {selected.title}
              </h3>
              <button onClick={() => { setSelected(null); setEditTab('basic'); }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 0, padding: '0 28px', margin: '16px 28px 0', background: '#f4f6fb', borderRadius: 10 }}>
              {[
                { key: 'basic', label: 'Basic Info', icon: '📋' },
                { key: 'details', label: 'Job Details', icon: '📝' },
                { key: 'criteria', label: 'Evaluation Criteria', icon: '📊' },
                { key: 'requirements', label: 'Minimum Requirements', icon: '🎯' },
              ].map(tab => (
                <div key={tab.key}
                  onClick={() => setEditTab(tab.key)}
                  style={{
                    flex: 1, cursor: 'pointer', padding: '12px 8px', textAlign: 'center', borderRadius: 8,
                    background: editTab === tab.key ? '#fff' : 'transparent',
                    boxShadow: editTab === tab.key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                    transition: 'all .2s', borderBottom: editTab === tab.key ? '2px solid #1a1a2e' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600,
                    fontSize: 13, color: editTab === tab.key ? '#1a1a2e' : '#8892a8',
                  }}>
                  <span style={{ fontSize: 16 }}>{tab.icon}</span>
                  {tab.label}
                </div>
              ))}
            </div>

            <div style={{ padding: '20px 28px', minHeight: 260 }}>
              {editTab === 'basic' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: 13 }}>Title</label>
                      <input className="form-control" value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        style={{ width: '100%' }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: 13 }}>Grade</label>
                      <select className="form-control" value={form.grade_id}
                        onChange={e => setForm({ ...form, grade_id: e.target.value })}
                        style={{ width: '100%' }}>
                        <option value="">— None —</option>
                        {grades.map(g => <option key={g.id} value={g.id}>Grade {g.grade_level} — {g.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: 13 }}>Max Headcount</label>
                      <input className="form-control" type="number" min="0" value={form.max_headcount}
                        onChange={e => setForm({ ...form, max_headcount: e.target.value })}
                        placeholder="0 = unlimited" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 600, fontSize: 13 }}>Description</label>
                    <textarea className="form-control" rows={4} value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief description of the position..."
                      style={{ width: '100%', resize: 'vertical' }} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.technical}
                      onChange={e => setForm({ ...form, technical: e.target.checked })}
                      style={{ accentColor: '#1a1a2e', width: 16, height: 16 }} />
                    <span style={{ fontWeight: 500, fontSize: 14 }}>Technical Position</span>
                  </label>
                </div>
              )}

              {editTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="card" style={{ margin: 0, background: '#fafbfc', border: '1px solid #eef0f5' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>📝</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Job Summary</span>
                    </div>
                    <div style={{ padding: '14px 18px' }}>
                      <textarea className="form-control" rows={4}
                        value={form.job_summary}
                        onChange={e => setForm({ ...form, job_summary: e.target.value })}
                        placeholder="Write a compelling summary of the role..."
                        style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="card" style={{ margin: 0, background: '#fafbfc', border: '1px solid #eef0f5' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>📋</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Key Responsibilities</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="form-control" rows={5}
                          value={form.key_responsibilities}
                          onChange={e => setForm({ ...form, key_responsibilities: e.target.value })}
                          placeholder="List the main responsibilities..."
                          style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                      </div>
                    </div>
                    <div className="card" style={{ margin: 0, background: '#fafbfc', border: '1px solid #eef0f5' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🎓</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Qualifications & Skills</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="form-control" rows={5}
                          value={form.qualifications}
                          onChange={e => setForm({ ...form, qualifications: e.target.value })}
                          placeholder="Required education, certifications..."
                          style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="card" style={{ margin: 0, background: '#fafbfc', border: '1px solid #eef0f5' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>⚙️</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Technical Skills & Knowledge</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="form-control" rows={5}
                          value={form.technical_skills}
                          onChange={e => setForm({ ...form, technical_skills: e.target.value })}
                          placeholder="Specific tools, technologies..."
                          style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                      </div>
                    </div>
                    <div className="card" style={{ margin: 0, background: '#fafbfc', border: '1px solid #eef0f5' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>🌟</span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Core Competencies</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="form-control" rows={5}
                          value={form.core_competencies}
                          onChange={e => setForm({ ...form, core_competencies: e.target.value })}
                          placeholder="Soft skills, behavioral traits..."
                          style={{ width: '100%', resize: 'vertical', fontSize: 13, lineHeight: 1.6 }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'criteria' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>Performance Evaluation Criteria</span>
                    <button className="btn btn-sm btn-outline" onClick={addCriteriaRow}
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Criterion
                    </button>
                  </div>
                  {criteria.length === 0 || (criteria.length === 1 && !criteria[0].criterion_name && !criteria[0].weight) ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#8892a8' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>No criteria set</div>
                      <div style={{ fontSize: 13 }}>Click "Add Criterion" to define how this position is evaluated.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {criteria.map((c, idx) => (
                        <div key={idx} style={{
                          display: 'flex', gap: 10, alignItems: 'center',
                          padding: '10px 14px', background: '#fafbfc', borderRadius: 8,
                          border: '1px solid #eef0f5',
                        }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: '#8892a8', width: 24 }}>#{idx + 1}</span>
                          <input className="form-control" placeholder="Criterion name (e.g. Quality of Work)"
                            value={c.criterion_name}
                            onChange={e => handleCriteriaChange(idx, 'criterion_name', e.target.value)}
                            style={{ flex: 1, border: 'none', background: '#fff', borderRadius: 6, padding: '8px 12px', fontSize: 13 }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <input className="form-control" type="number" step="0.01" min="0" max="100"
                              placeholder="%"
                              value={c.weight}
                              onChange={e => handleCriteriaChange(idx, 'weight', e.target.value)}
                              style={{ width: 64, border: 'none', background: '#fff', borderRadius: 6, padding: '8px 12px', fontSize: 13, textAlign: 'center' }} />
                            <span style={{ color: '#8892a8', fontSize: 13, fontWeight: 500, width: 18 }}>%</span>
                          </div>
                          <button className="btn btn-sm btn-outline-danger"
                            onClick={() => removeCriteriaRow(idx)}
                            disabled={criteria.length <= 1}
                            style={{ padding: '4px 10px', fontSize: 16, lineHeight: 1, opacity: criteria.length <= 1 ? 0.4 : 1 }}>&times;</button>
                        </div>
                      ))}
                      {criteria[0]?.criterion_name && (
                        <div style={{
                          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8,
                          padding: '8px 14px', marginTop: 4,
                        }}>
                          <span style={{ fontSize: 13, color: '#8892a8' }}>Total Weight:</span>
                          <span style={{
                            fontWeight: 700, fontSize: 15,
                            color: criteria.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0) === 100 ? '#22c55e' : '#ef4444',
                          }}>
                            {criteria.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0)}%
                          </span>
                          {criteria.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0) !== 100 && (
                            <span style={{ fontSize: 12, color: '#ef4444' }}>(should total 100%)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {editTab === 'requirements' && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e', marginBottom: 16 }}>
                    🎯 Minimum Requirements
                    <div style={{ fontWeight: 400, fontSize: 12, color: '#8892a8', marginTop: 2 }}>
                      Candidates who don't meet these will be auto-rejected when applying to jobs with this title.
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: 13 }}>Minimum Education Level</label>
                      <select className="form-control" value={form.min_education_level}
                        onChange={e => setForm({ ...form, min_education_level: e.target.value })}
                        style={{ width: '100%' }}>
                        <option value="">— None —</option>
                        <option value="high_school">High School</option>
                        <option value="diploma">Diploma</option>
                        <option value="associate">Associate Degree</option>
                        <option value="bachelor">Bachelor's Degree</option>
                        <option value="master">Master's Degree</option>
                        <option value="phd">PhD / Doctorate</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 600, fontSize: 13 }}>Minimum Years of Experience</label>
                      <input className="form-control" type="number" min="0"
                        value={form.min_experience_years}
                        onChange={e => setForm({ ...form, min_experience_years: e.target.value })}
                        style={{ width: '100%' }} placeholder="e.g. 3" />
                    </div>
                  </div>
                  {['required_skills', 'required_certs', 'preferred_skills'].map(field => {
                    const label = field === 'required_skills' ? 'Required Skills'
                      : field === 'required_certs' ? 'Required Certifications'
                      : 'Preferred Skills';
                    const hint = field === 'preferred_skills'
                      ? 'Preferred skills give bonus but won\'t auto-reject if missing'
                      : 'Candidates missing these will be auto-rejected';
                    const items = form[field] || [];
                    return (
                      <div key={field} className="form-group" style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: 600, fontSize: 13 }}>{label}</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: '1px solid #dde1e9', borderRadius: 8, background: '#fff', minHeight: 40, marginTop: 4 }}>
                          {items.map((item, i) => (
                            <span key={i} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                              background: field === 'preferred_skills' ? '#e8f5e9' : '#e3f2fd',
                              color: field === 'preferred_skills' ? '#2e7d32' : '#1565c0',
                            }}>
                              {item}
                              <span onClick={() => setForm({ ...form, [field]: items.filter((_, j) => j !== i) })}
                                style={{ cursor: 'pointer', fontSize: 14, lineHeight: 1, opacity: 0.6 }}>&times;</span>
                            </span>
                          ))}
                          <input
                            placeholder={`Type and press Enter to add ${field === 'required_skills' ? 'a skill' : field === 'required_certs' ? 'a certification' : 'a preferred skill'}`}
                            style={{ border: 'none', outline: 'none', flex: 1, minWidth: 140, fontSize: 13, background: 'transparent' }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                const val = e.target.value.trim();
                                if (val && !items.includes(val)) {
                                  setForm({ ...form, [field]: [...items, val] });
                                }
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 11, color: '#8892a8', marginTop: 4 }}>{hint}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '16px 28px', borderTop: '1px solid #eef0f5',
              background: '#fafbfc',
            }}>
              <button className="btn btn-outline" onClick={() => { setSelected(null); setEditTab('basic'); }}>Cancel</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-danger" onClick={() => { setDeleteTarget(selected); setSelected(null); setEditTab('basic'); }}>Delete</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <span className="spinner-sm" /> : '💾'} {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
