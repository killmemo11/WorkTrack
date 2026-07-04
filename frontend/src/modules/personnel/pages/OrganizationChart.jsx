import { useState, useEffect, useMemo, Fragment, useRef } from 'react';
import api from '../../../shared/api';
import hrApi from '../../../shared/api/hrApi';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrganizationChart() {
  const [data, setData] = useState(null);
  const [headcount, setHeadcount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [hoveredEmployee, setHoveredEmployee] = useState(null);
  const [animateCards, setAnimateCards] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/personnel/organization-chart'),
      hrApi.get('/reports/headcount'),
    ])
      .then(([orgRes, hcRes]) => {
        setData(orgRes.data);
        setHeadcount(hcRes.data.byDepartment);
        setTimeout(() => setAnimateCards(true), 100);
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.message || 'Unknown error';
        console.error('Organization chart error:', msg, err);
        setError(msg);
      })
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

  const selectedEmployeeData = useMemo(() => {
    if (!selectedEmployee || !data) return null;
    return data.employees.find(e => e.id === selectedEmployee) || null;
  }, [selectedEmployee, data]);

  if (loading) return (
    <div className="page">
      <div className="glass-loading"><div className="spinner" /><span>Loading organization chart...</span></div>
    </div>
  );
  if (error) return (
    <div className="page">
      <div className="glass-alert glass-alert-danger">
        <span className="iconify" data-icon="lucide:alert-circle" style={{ marginRight: 8 }} />
        Could not load organization chart.
        <br /><small style={{ opacity: 0.7 }}>{error}</small>
      </div>
    </div>
  );
  if (!data) return (
    <div className="page">
      <div className="glass-alert glass-alert-danger">
        <span className="iconify" data-icon="lucide:alert-circle" style={{ marginRight: 8 }} />
        Could not load organization chart.
      </div>
    </div>
  );

  const numCols = activeDepts.length;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="page"
    >
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
      >
        <motion.div
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1>Organization Chart</h1>
          <p className="subtitle">Company hierarchy by grade level</p>
        </motion.div>
        <motion.div
          initial={{ x: 20 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ position: 'relative' }}
        >
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="glass-input"
            style={{ paddingLeft: 32, minWidth: 220 }}
          />
          <span className="iconify" data-icon="lucide:search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none', color: 'var(--text-dim)' }} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="org-levels"
      >
        <AnimatePresence>
          {headcount && numCols > 0 && (
            <motion.div
              key="headcount"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <HeadcountRow
                activeDepts={activeDepts}
                headcountMap={headcountMap}
                numCols={numCols}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {gradeRows.map((grade, gi) => (
            <Fragment key={gi}>
              {gi > 0 && (
                <motion.div
                  key={`connector-${gi}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <ConnectorRow
                    activeDepts={activeDepts}
                    prevDepts={gradeRows[gi - 1].deptGroups}
                    currDepts={grade.deptGroups}
                    numCols={numCols}
                  />
                </motion.div>
              )}
              <motion.div
                key={`grade-${gi}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, delay: gi * 0.05 }}
              >
                <GradeBand
                  grade={grade}
                  activeDepts={activeDepts}
                  managerEmails={managerEmails}
                  supervisorIds={supervisorIds}
                  headcountMap={headcountMap}
                  numCols={numCols}
                  hoveredEmployee={hoveredEmployee}
                  setHoveredEmployee={setHoveredEmployee}
                  selectedEmployee={selectedEmployee}
                  setSelectedEmployee={setSelectedEmployee}
                />
              </motion.div>
            </Fragment>
          ))}
        </AnimatePresence>
        
        <AnimatePresence>
          {gradeRows.length === 0 && search && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass-empty"
            >
              <span className="iconify" data-icon="lucide:search-x" style={{ fontSize: 48, color: 'var(--text-dim)' }} />
              <h3>No employees match &quot;<strong>{search}</strong>&quot;</h3>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {selectedEmployeeData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="employee-details-modal"
            onClick={() => setSelectedEmployee(null)}
          >
            <div className="employee-details-content" onClick={(e) => e.stopPropagation()}>
              <div className="employee-details-header">
                <button onClick={() => setSelectedEmployee(null)} className="close-btn">
                  <span className="iconify" data-icon="lucide:x" />
                </button>
                <div className="employee-avatar">
                  {selectedEmployeeData.avatar_path
                    ? <img src={`/${selectedEmployeeData.avatar_path}`} alt="" />
                    : <span>{selectedEmployeeData.name?.[0]?.toUpperCase()}</span>}
                </div>
              </div>
              <div className="employee-details-body">
                <h3>{selectedEmployeeData.name}</h3>
                <div className="employee-info">
                  <div className="info-row">
                    <span className="label">Position:</span>
                    <span className="value">{selectedEmployeeData.position_title}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Department:</span>
                    <span className="value">{selectedEmployeeData.department_name}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Email:</span>
                    <span className="value">{selectedEmployeeData.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Grade Level:</span>
                    <span className="value">Lv.{selectedEmployeeData.grade_level}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HeadcountRow({ activeDepts, headcountMap, numCols }) {
  return (
    <div className="org-grade" style={{ marginBottom: 8 }}>
      <div className="org-grade-header" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-glass)' }}>
        <div className="org-grade-title">
          <span className="iconify" data-icon="lucide:bar-chart-2" style={{ marginRight: 6, fontSize: 13 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Headcount</span>
        </div>
      </div>
      <div className="org-grade-body" style={{ display: 'grid', gridTemplateColumns: `repeat(${numCols}, 1fr)`, gap: 12, padding: '10px 16px' }}>
        {activeDepts.map(dept => {
          const hc = headcountMap[dept.id];
          if (!hc) return <div key={dept.id} />;
          const pct = hc.max_headcount > 0 ? Math.round((hc.count / hc.max_headcount) * 100) : null;
          return (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ fontSize: 12 }}
            >
              {pct != null ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, color: 'var(--text-secondary)' }}>
                    <span>{hc.count} / {hc.max_headcount === 0 ? '\u221E' : hc.max_headcount}</span>
                    <span style={{ fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div className="stat-bar" style={{ height: 6, marginBottom: 0 }}>
                    <motion.div
                      className="stat-bar-fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        height: '100%',
                        background: hc.count > hc.max_headcount ? 'var(--color-danger)' : pct >= 90 ? 'var(--color-warning)' : 'var(--brand-primary)',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </>
              ) : (
                <span style={{ color: 'var(--text-dim)' }}>No limit set</span>
              )}
            </motion.div>
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
              {hasPrev && <line x1={cx} y1="0" x2={cx} y2="14" stroke="var(--border-glass)" strokeWidth="2" />}
              {hasCurr && <line x1={cx} y1="14" x2={cx} y2="28" stroke="var(--border-glass)" strokeWidth="2" />}
              {hasPrev && hasCurr && <circle cx={cx} cy="14" r="3" fill="var(--text-dim)" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function GradeBand({ grade, activeDepts, managerEmails, supervisorIds, headcountMap, numCols, hoveredEmployee, setHoveredEmployee, selectedEmployee, setSelectedEmployee }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, delay: grade.grade_level * 0.05 }}
      className="org-grade"
    >
      <div className="org-grade-header" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-glass)' }}>
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
            return (
              <motion.div
                key={dept.id}
                className={`org-dept-section${!members ? ' org-dept-empty' : ''}`}
                style={{ borderLeftColor: 'var(--brand-primary)' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: dept.id * 0.02 }}
              >
                {members && (
                  <>
                    <div className="org-dept-label" style={{ color: 'var(--text-secondary)' }}>{dept.name}</div>
                    <div className="org-dept-members">
                      {members.map(m => (
                        <OrgCard
                          key={m.id}
                          employee={m}
                          isManager={managerEmails.has(m.email)}
                          isSupervisor={supervisorIds.has(m.id)}
                          hoveredEmployee={hoveredEmployee}
                          setHoveredEmployee={setHoveredEmployee}
                          selectedEmployee={selectedEmployee}
                          setSelectedEmployee={setSelectedEmployee}
                        />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function OrgCard({ employee, isManager, isSupervisor, hoveredEmployee, setHoveredEmployee, selectedEmployee, setSelectedEmployee }) {
  const isHovered = hoveredEmployee === employee.id;
  const isSelected = selectedEmployee === employee.id;

  return (
    <motion.div
      className={`glass-card org-emp-card${isManager ? ' org-emp-card-manager' : ''}`}
      style={{ padding: '8px 12px', cursor: 'pointer', position: 'relative' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: employee.id * 0.01 }}
      whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setSelectedEmployee(employee.id)}
      onMouseEnter={() => setHoveredEmployee(employee.id)}
      onMouseLeave={() => setHoveredEmployee(null)}
    >
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
        {isManager && <span className="glass-badge glass-badge-success" title="Department Manager" style={{ fontSize: 10, padding: '2px 6px' }}>M</span>}
        {isSupervisor && !isManager && <span className="glass-badge glass-badge-info" title="Supervisor" style={{ fontSize: 10, padding: '2px 6px' }}>S</span>}
      </div>
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="org-emp-tooltip"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="tooltip-content">
              <div className="tooltip-email">{employee.email}</div>
              <div className="tooltip-dept">{employee.department_name}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}