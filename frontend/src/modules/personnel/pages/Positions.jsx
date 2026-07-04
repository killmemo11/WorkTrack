import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ConfirmModal from '../../../shared/components/ConfirmModal';
import TitleCard from '../components/TitleCard';
import MasterSelect from '../../../shared/components/MasterSelect';

const EXP_OPTIONS = [
  { value: '', label: '— None —', rank: 0 },
  { value: '0-1', label: 'Less than 1 year', rank: 1 },
  { value: '1-2', label: '1–2 years', rank: 2 },
  { value: '2-3', label: '2–3 years', rank: 3 },
  { value: '3-5', label: '3–5 years', rank: 4 },
  { value: '5-7', label: '5–7 years', rank: 5 },
  { value: '7-10', label: '7–10 years', rank: 6 },
  { value: '10-15', label: '10–15 years', rank: 7 },
  { value: '15-20', label: '15–20 years', rank: 8 },
  { value: '20+', label: 'More than 20 years', rank: 9 },
];

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

  if (loading) return <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>;

  return (
    <>
      {/* ── Page Header ── */}
      <div className="glass-page-header">
        <div>
          <h2 style={{ margin: 0 }}>Job Architecture</h2>
          <p style={{ margin: '2px 0 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            {stats.totalDepts} departments · {stats.totalTitles} titles · {stats.totalFilled} filled · {stats.totalMax} max HC
          </p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="iconify" data-icon="lucide:plus" /> Add Title
        </button>
      </div>

      {msg && <div className="glass-alert glass-alert-info" style={{ marginBottom: 16 }}>{msg}</div>}

      {/* ── Search + Filters Row ── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span className="iconify" data-icon="lucide:search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: 14, pointerEvents: 'none' }} />
          <input
            ref={searchRef}
            type="text"
            className="glass-input"
            placeholder="Search titles..."
            defaultValue={search}
            onChange={handleSearchChange}
            style={{ width: '100%', paddingLeft: 32, fontSize: '0.85rem' }}
          />
          <kbd style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-glass)', borderRadius: 4,
            padding: '0 5px', fontSize: '0.65rem', color: 'var(--text-dim)',
          }}>⌘K</kbd>
        </div>

        <select className="glass-select" value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          style={{ width: 160, fontSize: '0.8rem' }}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select className="glass-select" value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
          style={{ width: 140, fontSize: '0.8rem' }}>
          {GRADE_LABELS.map(g => (
            <option key={g.key} value={g.key}>{g.label}</option>
          ))}
        </select>

        {filteredTitles.length < titles.length && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {filteredTitles.length} of {titles.length} results
          </span>
        )}
      </div>

      {/* ── Stats Row ── */}
      <div className="glass-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Departments', value: stats.totalDepts, icon: 'lucide:building-2', class: 'gradient-indigo' },
          { label: 'Titles', value: stats.totalTitles, icon: 'lucide:clipboard-list', class: 'gradient-blue' },
          { label: 'Filled', value: stats.totalFilled, icon: 'lucide:users', class: 'gradient-green' },
          { label: 'Max HC', value: stats.totalMax, icon: 'lucide:bar-chart-2', class: 'gradient-amber' },
          { label: 'Utilization', value: stats.totalMax > 0 ? `${Math.round(stats.totalFilled / stats.totalMax * 100)}%` : '—', icon: 'lucide:trending-up', class: 'gradient-purple' },
        ].map(s => (
          <div key={s.label} className={`glass-stat-card ${s.class} card-hover fade-in-up`}>
            <div className="stat-icon"><span className="iconify" data-icon={s.icon} /></div>
            <div className="stat-number">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Empty Search State ── */}
      {search && filteredTitles.length === 0 && (
        <div className="glass-empty">
          <span className="iconify" data-icon="lucide:search-x" style={{ fontSize: 48, color: 'var(--text-dim)' }} />
          <h3>No titles match &quot;{search}&quot;</h3>
          <p style={{ color: 'var(--text-dim)', marginTop: 4 }}>Try a different search term or clear filters</p>
          <button className="glass-btn glass-btn-ghost" style={{ marginTop: 16 }} onClick={() => { setSearch(''); if (searchRef.current) searchRef.current.value = ''; setDeptFilter(''); setGradeFilter(''); }}>
            Clear Filters
          </button>
        </div>
      )}

      {/* ── Empty State ── */}
      {!search && filteredTitles.length === 0 && titles.length === 0 && (
        <div className="glass-empty">
          <span className="iconify" data-icon="lucide:inbox" style={{ fontSize: 48, color: 'var(--text-dim)' }} />
          <h3>No titles yet</h3>
          <p style={{ color: 'var(--text-dim)', marginTop: 4 }}>Start by adding your first job title</p>
          <button className="glass-btn glass-btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
            <span className="iconify" data-icon="lucide:plus" style={{ marginRight: 6 }} /> Add First Title
          </button>
        </div>
      )}

      {/* ── Department Sections ── */}
      {departments.map((dept, idx) => {
        const deptTitles = grouped[dept.id] || [];
        const deptFilled = deptTitles.reduce((s, t) => s + (t.filled_count || 0), 0);
        const deptMax = deptTitles.reduce((s, t) => s + (t.max_headcount || 0), 0);
        const deptPct = deptMax > 0 ? deptFilled / deptMax : 0;
        const isCollapsed = collapsed[dept.id];
        const isEmpty = deptTitles.length === 0;

        return (
          <div key={dept.id} className="glass-card fade-in-up" style={{
            marginBottom: 16, overflow: 'hidden',
            animationDelay: `${idx * 0.03}s`,
          }}>
            {/* Department Header */}
            <div
              onClick={() => toggleCollapse(dept.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', cursor: 'pointer',
                background: 'var(--bg-elevated)', borderBottom: isCollapsed ? 'none' : '1px solid var(--border-glass)',
                userSelect: 'none',
              }}
            >
              <span className="iconify" data-icon={isCollapsed ? 'lucide:chevron-right' : 'lucide:chevron-down'} style={{ fontSize: 12, color: 'var(--text-dim)', transition: 'transform .2s' }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
                {dept.name}
                <span style={{ fontWeight: 400, color: 'var(--text-dim)', fontSize: 12, marginLeft: 8 }}>
                  {deptTitles.length} title{deptTitles.length > 1 ? 's' : ''}
                </span>
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                <span className="iconify" data-icon="lucide:users" style={{ fontSize: 12 }} /> {deptFilled}/{deptMax || '∞'}
                {deptMax > 0 && (
                  <>
                    <div className="stat-bar" style={{ width: 60, height: 5, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-primary)' }}>
                      <div style={{
                        width: `${Math.min(deptPct * 100, 100)}%`, height: '100%',
                        background: deptPct >= 1 ? 'var(--color-danger)' : deptPct >= 0.8 ? 'var(--color-warning)' : 'var(--color-success)',
                        borderRadius: 3, transition: 'width .4s ease',
                      }} />
                    </div>
                    <span style={{ fontWeight: 600, color: deptPct >= 1 ? 'var(--color-danger)' : deptPct >= 0.8 ? 'var(--color-warning)' : 'var(--color-success)' }}>
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
                  <div className="glass-empty" style={{ padding: 30 }}>
                    <span className="iconify" data-icon="lucide:inbox" style={{ fontSize: 32, color: 'var(--text-dim)' }} />
                    <h3 style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
                      No titles in this department yet
                    </h3>
                    <button className="glass-btn glass-btn-primary glass-btn-sm" onClick={() => { setAddForm({ ...addForm, department_id: dept.id }); setShowAdd(true); }}>
                      <span className="iconify" data-icon="lucide:plus" style={{ marginRight: 4 }} /> Add First Title
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
        <div className="glass-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <button className="glass-modal-close" onClick={() => setShowAdd(false)} />
            <div className="glass-card-body">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="iconify" data-icon="lucide:plus" /> Add New Title
              </h3>
            </div>
            <div className="glass-card-body" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 16 }}>
              <div className="glass-form-group">
                <label className="glass-label">Department *</label>
                <select className="glass-select" value={addForm.department_id}
                  onChange={e => setAddForm({ ...addForm, department_id: e.target.value })}>
                  <option value="">— Select —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.max_headcount > 0 ? `${d.max_headcount} HC` : '∞'})</option>)}
                </select>
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Title *</label>
                <input className="glass-input" value={addForm.title}
                  onChange={e => setAddForm({ ...addForm, title: e.target.value })}
                  placeholder="e.g. Software Engineer" />
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Grade</label>
                <select className="glass-select" value={addForm.grade_id}
                  onChange={e => setAddForm({ ...addForm, grade_id: e.target.value })}>
                  <option value="">— None —</option>
                  {grades.map(g => <option key={g.id} value={g.id}>Grade {g.grade_level} — {g.name}</option>)}
                </select>
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Description</label>
                <textarea className="glass-textarea" rows={2} value={addForm.description}
                  onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                  placeholder="Optional description" />
              </div>
              <label className="glass-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={addForm.technical}
                  onChange={e => setAddForm({ ...addForm, technical: e.target.checked })} />
                Technical Position
              </label>
              <div className="glass-form-group">
                <label className="glass-label">Max Headcount</label>
                <input className="glass-input" type="number" min="0" value={addForm.max_headcount}
                  onChange={e => setAddForm({ ...addForm, max_headcount: e.target.value })}
                  placeholder="0 = unlimited" />
              </div>
            </div>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="glass-btn glass-btn-primary" onClick={handleAddTitle} disabled={saving}>
                {saving ? <><span className="spinner-sm" /> Adding...</> : <><span className="iconify" data-icon="lucide:plus" style={{ marginRight: 6 }} /> Add Title</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {selected && (
        <div className="glass-modal-overlay" onClick={() => { setSelected(null); setEditTab('basic'); }}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="iconify" data-icon="lucide:pencil" style={{ fontSize: 22 }} />
                {selected.title}
              </h3>
              <button onClick={() => { setSelected(null); setEditTab('basic'); }}
                className="glass-modal-close" />
            </div>

            <div className="glass-tabs" style={{ margin: '16px 28px 0', background: 'var(--bg-elevated)', borderRadius: 10, padding: 4 }}>
              {[
                { key: 'basic', label: 'Basic Info', icon: 'lucide:clipboard-list' },
                { key: 'details', label: 'Job Details', icon: 'lucide:file-text' },
                { key: 'criteria', label: 'Evaluation Criteria', icon: 'lucide:bar-chart-2' },
                { key: 'requirements', label: 'Minimum Requirements', icon: 'lucide:target' },
              ].map(tab => (
                <div key={tab.key}
                  onClick={() => setEditTab(tab.key)}
                  className={`glass-tab ${editTab === tab.key ? 'glass-tab-active' : ''}`}
                  style={{ border: 'none', boxShadow: editTab === tab.key ? '0 1px 4px rgba(0,0,0,.15)' : 'none' }}>
                  <span className="iconify" data-icon={tab.icon} style={{ marginRight: 4, fontSize: 14 }} />
                  {tab.label}
                </div>
              ))}
            </div>

            <div style={{ padding: '20px 28px', minHeight: 260 }}>
              {editTab === 'basic' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="glass-form-group" style={{ margin: 0 }}>
                      <label className="glass-label">Title</label>
                      <input className="glass-input" value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="glass-form-group" style={{ margin: 0 }}>
                      <label className="glass-label">Grade</label>
                      <select className="glass-select" value={form.grade_id}
                        onChange={e => setForm({ ...form, grade_id: e.target.value })}>
                        <option value="">— None —</option>
                        {grades.map(g => <option key={g.id} value={g.id}>Grade {g.grade_level} — {g.name}</option>)}
                      </select>
                    </div>
                    <div className="glass-form-group" style={{ margin: 0 }}>
                      <label className="glass-label">Max Headcount</label>
                      <input className="glass-input" type="number" min="0" value={form.max_headcount}
                        onChange={e => setForm({ ...form, max_headcount: e.target.value })}
                        placeholder="0 = unlimited" />
                    </div>
                  </div>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Description</label>
                    <textarea className="glass-textarea" rows={4} value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief description of the position..." />
                  </div>
                  <label className="glass-checkbox" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.technical}
                      onChange={e => setForm({ ...form, technical: e.target.checked })} />
                    <span style={{ fontWeight: 500, fontSize: 14 }}>Technical Position</span>
                  </label>
                </div>
              )}

              {editTab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="glass-card" style={{ margin: 0 }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="iconify" data-icon="lucide:file-text" style={{ fontSize: 16 }} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>Job Summary</span>
                    </div>
                    <div style={{ padding: '14px 18px' }}>
                      <textarea className="glass-textarea" rows={4}
                        value={form.job_summary}
                        onChange={e => setForm({ ...form, job_summary: e.target.value })}
                        placeholder="Write a compelling summary of the role..." />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="glass-card" style={{ margin: 0 }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="iconify" data-icon="lucide:list-checks" style={{ fontSize: 16 }} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Key Responsibilities</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="glass-textarea" rows={5}
                          value={form.key_responsibilities}
                          onChange={e => setForm({ ...form, key_responsibilities: e.target.value })}
                          placeholder="List the main responsibilities..." />
                      </div>
                    </div>
                    <div className="glass-card" style={{ margin: 0 }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="iconify" data-icon="lucide:graduation-cap" style={{ fontSize: 16 }} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Qualifications & Skills</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="glass-textarea" rows={5}
                          value={form.qualifications}
                          onChange={e => setForm({ ...form, qualifications: e.target.value })}
                          placeholder="Required education, certifications..." />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="glass-card" style={{ margin: 0 }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="iconify" data-icon="lucide:wrench" style={{ fontSize: 16 }} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Technical Skills & Knowledge</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="glass-textarea" rows={5}
                          value={form.technical_skills}
                          onChange={e => setForm({ ...form, technical_skills: e.target.value })}
                          placeholder="Specific tools, technologies..." />
                      </div>
                    </div>
                    <div className="glass-card" style={{ margin: 0 }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="iconify" data-icon="lucide:sparkles" style={{ fontSize: 16 }} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>Core Competencies</span>
                      </div>
                      <div style={{ padding: '14px 18px' }}>
                        <textarea className="glass-textarea" rows={5}
                          value={form.core_competencies}
                          onChange={e => setForm({ ...form, core_competencies: e.target.value })}
                          placeholder="Soft skills, behavioral traits..." />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'criteria' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Performance Evaluation Criteria</span>
                    <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={addCriteriaRow}
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="iconify" data-icon="lucide:plus" style={{ fontSize: 14 }} /> Add Criterion
                    </button>
                  </div>
                  {criteria.length === 0 || (criteria.length === 1 && !criteria[0].criterion_name && !criteria[0].weight) ? (
                    <div className="glass-empty" style={{ padding: 40 }}>
                      <span className="iconify" data-icon="lucide:bar-chart-2" style={{ fontSize: 40, color: 'var(--text-dim)' }} />
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>No criteria set</div>
                      <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Click &quot;Add Criterion&quot; to define how this position is evaluated.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {criteria.map((c, idx) => (
                        <div key={idx} style={{
                          display: 'flex', gap: 10, alignItems: 'center',
                          padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8,
                          border: '1px solid var(--border-glass)',
                        }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-dim)', width: 24 }}>#{idx + 1}</span>
                          <input className="glass-input" placeholder="Criterion name (e.g. Quality of Work)"
                            value={c.criterion_name}
                            onChange={e => handleCriteriaChange(idx, 'criterion_name', e.target.value)}
                            style={{ flex: 1 }} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <input className="glass-input" type="number" step="0.01" min="0" max="100"
                              placeholder="%"
                              value={c.weight}
                              onChange={e => handleCriteriaChange(idx, 'weight', e.target.value)}
                              style={{ width: 64, textAlign: 'center' }} />
                            <span style={{ color: 'var(--text-dim)', fontSize: 13, fontWeight: 500, width: 18 }}>%</span>
                          </div>
                          <button className="glass-btn glass-btn-danger glass-btn-xs"
                            onClick={() => removeCriteriaRow(idx)}
                            disabled={criteria.length <= 1}
                            style={{ opacity: criteria.length <= 1 ? 0.4 : 1 }}>&times;</button>
                        </div>
                      ))}
                      {criteria[0]?.criterion_name && (
                        <div style={{
                          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8,
                          padding: '8px 14px', marginTop: 4,
                        }}>
                          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Total Weight:</span>
                          <span style={{
                            fontWeight: 700, fontSize: 15,
                            color: criteria.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0) === 100 ? 'var(--color-success)' : 'var(--color-danger)',
                          }}>
                            {criteria.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0)}%
                          </span>
                          {criteria.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0) !== 100 && (
                            <span style={{ fontSize: 12, color: 'var(--color-danger)' }}>(should total 100%)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {editTab === 'requirements' && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
                    <span className="iconify" data-icon="lucide:target" style={{ marginRight: 6 }} /> Minimum Requirements
                    <div style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                      Candidates who don&apos;t meet these will be auto-rejected when applying to jobs with this title.
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="glass-form-group" style={{ margin: 0 }}>
                      <label className="glass-label">Minimum Education Level</label>
                      <select className="glass-select" value={form.min_education_level}
                        onChange={e => setForm({ ...form, min_education_level: e.target.value })}>
                        <option value="">— None —</option>
                        <option value="high_school">High School</option>
                        <option value="diploma">Diploma</option>
                        <option value="associate">Associate Degree</option>
                        <option value="bachelor">Bachelor's Degree</option>
                        <option value="master">Master's Degree</option>
                        <option value="phd">PhD / Doctorate</option>
                      </select>
                    </div>
                    <div className="glass-form-group" style={{ margin: 0 }}>
                      <label className="glass-label">Minimum Years of Experience</label>
                      <select className="glass-select" value={form.min_experience_years}
                        onChange={e => setForm({ ...form, min_experience_years: e.target.value })}>
                        {EXP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}{o.rank > 0 ? ` (Rank ${o.rank})` : ''}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="glass-form-group" style={{ marginBottom: 12 }}>
                    <label className="glass-label">Required Skills</label>
                    <MasterSelect type="skills" value={form.required_skills}
                      onChange={v => setForm({ ...form, required_skills: v })}
                      placeholder="Type to search and add required skills..." />
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Candidates missing these will be auto-rejected</div>
                  </div>
                  <div className="glass-form-group" style={{ marginBottom: 12 }}>
                    <label className="glass-label">Required Certifications</label>
                    <MasterSelect type="certs" value={form.required_certs}
                      onChange={v => setForm({ ...form, required_certs: v })}
                      placeholder="Type to search and add required certifications..." />
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Candidates missing these will be auto-rejected</div>
                  </div>
                  <div className="glass-form-group" style={{ marginBottom: 12 }}>
                    <label className="glass-label">Preferred Skills</label>
                    <MasterSelect type="skills" value={form.preferred_skills}
                      onChange={v => setForm({ ...form, preferred_skills: v })}
                      placeholder="Type to search and add preferred skills..." />
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Preferred skills give bonus but won&apos;t auto-reject if missing</div>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => { setSelected(null); setEditTab('basic'); }}>Cancel</button>
              <div style={{ flex: 1 }} />
              <button className="glass-btn glass-btn-danger" onClick={() => { setDeleteTarget(selected); setSelected(null); setEditTab('basic'); }}>
                <span className="iconify" data-icon="lucide:trash-2" style={{ marginRight: 4 }} /> Delete
              </button>
              <button className="glass-btn glass-btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <span className="spinner-sm" /> : <><span className="iconify" data-icon="lucide:save" /> {saving ? 'Saving...' : 'Save Changes'}</>}
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
