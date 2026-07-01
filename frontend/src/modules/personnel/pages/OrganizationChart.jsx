import { useState, useEffect, useMemo, Fragment } from 'react';
import api from '../../../shared/api';
import hrApi from '../../../shared/api/hrApi';

const DEPT_COLORS = [
  { bg: '#eef2ff', border: '#4f46e5', text: '#4338ca' },
  { bg: '#ecfeff', border: '#0891b2', text: '#0e7490' },
  { bg: '#ecfdf5', border: '#059669', text: '#047857' },
  { bg: '#fffbeb', border: '#d97706', text: '#b45309' },
  { bg: '#fef2f2', border: '#dc2626', text: '#b91c1c' },
  { bg: '#f5f3ff', border: '#7c3aed', text: '#6d28d9' },
  { bg: '#fdf2f8', border: '#db2777', text: '#be185d' },
  { bg: '#fff7ed', border: '#ea580c', text: '#c2410c' },
  { bg: '#f0fdf4', border: '#16a34a', text: '#15803d' },
  { bg: '#fefce8', border: '#ca8a04', text: '#a16207' },
];

export default function OrganizationChart() {
  const [data, setData] = useState(null);
  const [headcount, setHeadcount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/personnel/organization-chart'),
      hrApi.get('/reports/headcount'),
    ])
      .then(([orgRes, hcRes]) => {
        setData(orgRes.data);
        setHeadcount(hcRes.data.byDepartment);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const managerEmails = useMemo(() => {
    if (!data) return new Set();
    return new Set(data.departments.filter(d => d.manager_email).map(d => d.manager_email));
  }, [data]);

  const supervisorIds = useMemo(() => {
    if (!data) return new Set();
    return new Set(data.employees.filter(e => e.supervisor_id).map(e => e.supervisor_id));
  }, [data]);

  const deptColorMap = useMemo(() => {
    if (!data) return {};
    const map = {};
    data.departments.forEach((d, i) => { map[String(d.id)] = DEPT_COLORS[i % DEPT_COLORS.length]; });
    return map;
  }, [data]);

  const headcountMap = useMemo(() => {
    if (!headcount) return {};
    const map = {};
    headcount.forEach(d => { map[String(d.id)] = d; });
    return map;
  }, [headcount]);

  const allDepts = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    data.employees.forEach(e => {
      const id = String(e.department_id || 'other');
      if (!map.has(id)) map.set(id, e.department_name || 'Other');
    });
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ id, name }));
  }, [data]);

  const gradeRows = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();
    const gradeMap = {};
    data.employees.forEach(e => {
      if (q && !e.name.toLowerCase().includes(q)) return;
      const level = e.grade_level || 0;
      if (!gradeMap[level]) gradeMap[level] = [];
      gradeMap[level].push(e);
    });
    const levels = Object.keys(gradeMap).map(Number).sort((a, b) => b - a);
    return levels.map(level => {
      const gradeInfo = data.grades?.find(g => g.grade_level === level);
      const emps = gradeMap[level];
      const deptGroups = {};
      emps.forEach(e => {
        const did = String(e.department_id || 'other');
        if (!deptGroups[did]) deptGroups[did] = [];
        deptGroups[did].push(e);
      });
      return {
        grade_level: level,
        grade_name: gradeInfo?.name || `Level ${level}`,
        total: emps.length,
        deptGroups,
      };
    });
  }, [data, search]);

  const activeDepts = useMemo(() => {
    const activeIds = new Set();
    gradeRows.forEach(g => Object.keys(g.deptGroups).forEach(id => activeIds.add(id)));
    return allDepts.filter(d => activeIds.has(d.id));
  }, [allDepts, gradeRows]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!data) return <div className="error">Could not load organization chart.</div>;

  const numCols = activeDepts.length;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Organization Chart</h1>
          <p className="subtitle">Company hierarchy by grade level</p>
        </div>
        <div className="org-search" style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-control"
            style={{ paddingLeft: 32, minWidth: 220 }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none' }}>🔍</span>
        </div>
      </div>

      <div className="org-levels">
        {headcount && numCols > 0 && (
          <HeadcountRow
            activeDepts={activeDepts}
            headcountMap={headcountMap}
            deptColorMap={deptColorMap}
            numCols={numCols}
          />
        )}
        {gradeRows.map((grade, gi) => (
          <Fragment key={gi}>
            {gi > 0 && (
              <ConnectorRow
                activeDepts={activeDepts}
                prevDepts={gradeRows[gi - 1].deptGroups}
                currDepts={grade.deptGroups}
                numCols={numCols}
              />
            )}
            <GradeBand
              grade={grade}
              activeDepts={activeDepts}
              managerEmails={managerEmails}
              supervisorIds={supervisorIds}
              deptColorMap={deptColorMap}
              headcountMap={headcountMap}
              numCols={numCols}
            />
          </Fragment>
        ))}
        {gradeRows.length === 0 && search && (
          <p className="empty-state" style={{ textAlign: 'center', padding: 40 }}>No employees match "<strong>{search}</strong>"</p>
        )}
      </div>
    </div>
  );
}

function HeadcountRow({ activeDepts, headcountMap, deptColorMap, numCols }) {
  return (
    <div className="org-grade" style={{ marginBottom: 8 }}>
      <div className="org-grade-header" style={{ background: '#f1f5f9' }}>
        <div className="org-grade-title">
          <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Headcount</span>
        </div>
      </div>
      <div className="org-grade-body" style={{ display: 'grid', gridTemplateColumns: `repeat(${numCols}, 1fr)`, gap: 12, padding: '10px 16px' }}>
        {activeDepts.map(dept => {
          const hc = headcountMap[dept.id];
          const color = deptColorMap[dept.id] || DEPT_COLORS[0];
          if (!hc) return <div key={dept.id} />;
          const pct = hc.max_headcount > 0 ? Math.round((hc.count / hc.max_headcount) * 100) : null;
          return (
            <div key={dept.id} style={{ fontSize: 12 }}>
              {pct != null ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, color: color.text }}>
                    <span>{hc.count} / {hc.max_headcount === 0 ? '\u221E' : hc.max_headcount}</span>
                    <span style={{ fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div className="progress-track" style={{ height: 6, marginBottom: 0 }}>
                    <div className="progress-fill" style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: hc.count > hc.max_headcount ? '#ef4444' : pct >= 90 ? '#f59e0b' : color.border,
                    }} />
                  </div>
                </>
              ) : (
                <span className="text-muted">No limit set</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectorRow({ activeDepts, prevDepts, currDepts, numCols }) {
  if (numCols === 0) return null;
  return (
    <div className="org-connector">
      <svg viewBox={`0 0 100 28`} style={{ width: '100%', height: 28, display: 'block', pointerEvents: 'none' }}>
        {activeDepts.map((dept, i) => {
          const cx = ((i + 0.5) / numCols) * 100;
          const hasPrev = dept.id in prevDepts;
          const hasCurr = dept.id in currDepts;
          if (!hasPrev && !hasCurr) return null;
          return (
            <g key={dept.id}>
              {hasPrev && <line x1={cx} y1="0" x2={cx} y2="14" stroke="#cbd5e1" strokeWidth="2" />}
              {hasCurr && <line x1={cx} y1="14" x2={cx} y2="28" stroke="#cbd5e1" strokeWidth="2" />}
              {hasPrev && hasCurr && <circle cx={cx} cy="14" r="3" fill="#cbd5e1" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function GradeBand({ grade, activeDepts, managerEmails, supervisorIds, deptColorMap, headcountMap, numCols }) {
  return (
    <div className="org-grade">
      <div className="org-grade-header">
        <div className="org-grade-title">
          <span className="org-grade-level">Lv.{grade.grade_level}</span>
          <span className="org-grade-name">{grade.grade_name}</span>
        </div>
        <span className="org-grade-count">{grade.total} {grade.total === 1 ? 'member' : 'members'}</span>
      </div>
      {numCols > 0 && (
        <div className="org-grade-body" style={{ display: 'grid', gridTemplateColumns: `repeat(${numCols}, 1fr)`, gap: 12, padding: '12px 16px' }}>
          {activeDepts.map(dept => {
            const members = grade.deptGroups[dept.id];
            const color = deptColorMap[dept.id] || DEPT_COLORS[0];
            return (
              <div key={dept.id} className={`org-dept-section${!members ? ' org-dept-empty' : ''}`} style={{ borderLeftColor: color.border }}>
                {members && (
                  <>
                    <div className="org-dept-label" style={{ color: color.text }}>{dept.name}</div>
                    <div className="org-dept-members">
                      {members.map(m => (
                        <OrgCard
                          key={m.id}
                          employee={m}
                          isManager={managerEmails.has(m.email)}
                          isSupervisor={supervisorIds.has(m.id)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrgCard({ employee, isManager, isSupervisor }) {
  return (
    <div className={`org-emp-card${isManager ? ' org-emp-card-manager' : ''}`}>
      <div className="org-emp-avatar">
        {employee.avatar_path
          ? <img src={`/${employee.avatar_path}`} alt="" />
          : <span>{employee.name?.[0]?.toUpperCase()}</span>}
      </div>
      <div className="org-emp-body">
        <div className="org-emp-name">{employee.name}</div>
        <div className="org-emp-title">{employee.position_title || '—'}</div>
      </div>
      <div className="org-emp-tags">
        {isManager && <span className="org-tag org-tag-manager" title="Department Manager">M</span>}
        {isSupervisor && !isManager && <span className="org-tag org-tag-supervisor" title="Supervisor">S</span>}
      </div>
    </div>
  );
}
