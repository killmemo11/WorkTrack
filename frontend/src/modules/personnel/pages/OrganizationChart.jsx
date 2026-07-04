import { useState, useEffect, useMemo, Fragment, useRef } from 'react';
import api from '../../../shared/api';
import hrApi from '../../../shared/api/hrApi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, ChevronRight, ZoomIn, ZoomOut, Download, Printer, Filter, X, Search, 
  User, Mail, Phone, Calendar, Award, TrendingUp, Users, Building, 
  ChevronLeft, AlertCircle 
} from 'lucide-react';

export default function OrganizationChart() {
  const [data, setData] = useState(null);
  const [headcount, setHeadcount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [hoveredEmployee, setHoveredEmployee] = useState(null);
  const [animateCards, setAnimateCards] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [expandedDepts, setExpandedDepts] = useState(() => new Set());
  const [filters, setFilters] = useState({});
  const containerRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/personnel/organization-chart'),
      hrApi.get('/reports/headcount'),
    ])
      .then(([orgRes, hcRes]) => {
        setData(orgRes.data);
        setHeadcount(hcRes.data.byDepartment);
        const deptIds = new Set(orgRes.data.employees.map(e => String(e.department_id || 'other')));
        setExpandedDepts(deptIds);
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
    <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="glass-loading" style={{ 
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glass)',
        borderRadius: '12px',
        padding: '32px 40px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16
      }}>
        <div className="spinner" style={{ 
          width: 48, 
          height: 48, 
          border: '4px solid var(--border-glass)',
          borderTop: '4px solid var(--brand-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ 
          fontSize: 16, 
          fontWeight: 500, 
          color: 'var(--text-primary)' 
        }}>
          Loading organization chart...
        </span>
        <p style={{ 
          fontSize: 13, 
          color: 'var(--text-secondary)' 
        }}>
          Fetching company hierarchy data
        </p>
      </div>
    </div>
  );
  if (error) return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="glass-alert glass-alert-danger" style={{ 
        background: 'var(--bg-card)',
        border: '1px solid var(--border-danger)',
        borderRadius: '12px',
        padding: '32px 40px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        maxWidth: 500
      }}>
        <div style={{ 
          fontSize: 48, 
          color: 'var(--color-danger)', 
          marginBottom: 16 
        }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <AlertCircle size={48} />
          </div>
        </div>
        <h3 style={{ 
          fontSize: 18, 
          fontWeight: 600, 
          color: 'var(--text-primary)', 
          marginBottom: 8 
        }}>
          Could not load organization chart
        </h3>
        <p style={{ 
          fontSize: 14, 
          color: 'var(--text-secondary)', 
          marginBottom: 16 
        }}>
          {error}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              background: 'var(--brand-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--brand-primary-hover)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--brand-primary)'}
          >
            Retry
          </button>
          <button 
            onClick={() => window.location.href = '/personnel/employees'}
            style={{ 
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
            onMouseLeave={(e) => e.target.style.background = 'var(--bg-elevated)'}
          >
            View Employees
          </button>
        </div>
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

  const toggleDept = (deptId) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId);
    } else {
      newExpanded.add(deptId);
    }
    setExpandedDepts(newExpanded);
  };

  const handleZoomIn = () => setZoomLevel(Math.min(zoomLevel + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(Math.max(zoomLevel - 0.1, 0.5));

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="page"
      style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
    >
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, padding: '0 20px' }}
      >
        <motion.div
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Organization Chart</h1>
          <p className="subtitle" style={{ fontSize: '14px', fontWeight: 400, margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Company hierarchy by grade level</p>
        </motion.div>
        <motion.div
          initial={{ x: 20 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ display: 'flex', gap: 12, alignItems: 'center' }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <button 
              onClick={handleZoomOut}
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-secondary)' }}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', minWidth: '30px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button 
              onClick={handleZoomIn}
              style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-secondary)' }}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="glass-input"
              style={{ paddingLeft: 36, minWidth: 240, fontSize: '14px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-dim)' }} />
          </div>
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
                  expandedDepts={expandedDepts}
                  toggleDept={toggleDept}
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
              style={{ 
                background: 'var(--bg-card)',
                border: '1px solid var(--border-glass)',
                borderRadius: '12px',
                padding: '32px',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div style={{ 
                fontSize: 64, 
                color: 'var(--text-dim)', 
                marginBottom: 16 
              }}>
                <Search size={64} />
              </div>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                color: 'var(--text-primary)', 
                marginBottom: 8 
              }}>
                No employees match &quot;<strong>{search}</strong>&quot;
              </h3>
              <p style={{ 
                fontSize: 14, 
                color: 'var(--text-secondary)' 
              }}>
                Try adjusting your search terms or check if the employee exists in the system
              </p>
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
            style={{ background: 'rgba(0, 0, 0, 0.5)' }}
          >
            <motion.div
              className="employee-details-content"
              onClick={(e) => e.stopPropagation()}
              style={{ 
                background: 'var(--bg-card)',
                border: '1px solid var(--border-glass)',
                borderRadius: '12px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                maxWidth: 400,
                overflow: 'hidden'
              }}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="employee-details-header" style={{ 
                background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div className="employee-avatar" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {selectedEmployeeData.avatar_path
                    ? <img src={`/${selectedEmployeeData.avatar_path}`} alt="" style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid white' }} />
                    : <div style={{ 
                        width: 48, 
                        height: 48, 
                        borderRadius: '50%', 
                        background: 'var(--brand-primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'white', 
                        fontSize: 20, 
                        fontWeight: 600 
                      }}>
                        {selectedEmployeeData.name?.[0]?.toUpperCase()}
                      </div>}
                  <div>
                    <h3 style={{ 
                      fontSize: 18, 
                      fontWeight: 600, 
                      color: 'white', 
                      margin: 0 
                    }}>
                      {selectedEmployeeData.name}
                    </h3>
                    <p style={{ 
                      fontSize: 14, 
                      color: 'rgba(255, 255, 255, 0.9)', 
                      margin: 0 
                    }}>
                      {selectedEmployeeData.position_title || '—'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.2)', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: 32, 
                    height: 32, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer',
                    color: 'white',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="employee-details-body" style={{ padding: '20px' }}>
                <div className="employee-info" style={{ spaceY: '16px' }}>
                  <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Mail size={16} style={{ color: 'var(--text-dim)' }} />
                    <span className="label" style={{ fontSize: 14, color: 'var(--text-secondary)', width: 80 }}>Email:</span>
                    <span className="value" style={{ fontSize: 14, color: 'var(--text-primary)' }}>{selectedEmployeeData.email}</span>
                  </div>
                  <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building size={16} style={{ color: 'var(--text-dim)' }} />
                    <span className="label" style={{ fontSize: 14, color: 'var(--text-secondary)', width: 80 }}>Department:</span>
                    <span className="value" style={{ fontSize: 14, color: 'var(--text-primary)' }}>{selectedEmployeeData.department_name}</span>
                  </div>
                  <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={16} style={{ color: 'var(--text-dim)' }} />
                    <span className="label" style={{ fontSize: 14, color: 'var(--text-secondary)', width: 80 }}>Grade Level:</span>
                    <span className="value" style={{ fontSize: 14, color: 'var(--text-primary)' }}>Lv.{selectedEmployeeData.grade_level}</span>
                  </div>
                  {selectedEmployeeData.phone && (
                    <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Phone size={16} style={{ color: 'var(--text-dim)' }} />
                      <span className="label" style={{ fontSize: 14, color: 'var(--text-secondary)', width: 80 }}>Phone:</span>
                      <span className="value" style={{ fontSize: 14, color: 'var(--text-primary)' }}>{selectedEmployeeData.phone}</span>
                    </div>
                  )}
                  {selectedEmployeeData.hire_date && (
                    <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={16} style={{ color: 'var(--text-dim)' }} />
                      <span className="label" style={{ fontSize: 14, color: 'var(--text-secondary)', width: 80 }}>Hire Date:</span>
                      <span className="value" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                        {new Date(selectedEmployeeData.hire_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedEmployeeData.performance_rating && (
                    <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendingUp size={16} style={{ color: 'var(--text-dim)' }} />
                      <span className="label" style={{ fontSize: 14, color: 'var(--text-secondary)', width: 80 }}>Performance:</span>
                      <span className="value" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                        {selectedEmployeeData.performance_rating}/5
                      </span>
                    </div>
                  )}
                  {selectedEmployeeData.certifications && selectedEmployeeData.certifications.length > 0 && (
                    <div className="info-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Award size={16} style={{ color: 'var(--text-dim)' }} />
                      <span className="label" style={{ fontSize: 14, color: 'var(--text-secondary)', width: 80 }}>Certifications:</span>
                      <span className="value" style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                        {selectedEmployeeData.certifications.length} certified
                      </span>
                    </div>
                  )}
                </div>
                
                <div style={{ 
                  marginTop: 20, 
                  padding: '12px', 
                  background: 'var(--bg-elevated)', 
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Team Information</span>
                    <span style="font-size: 12px; color: var(--text-dim)">Direct reports: {selectedEmployeeData.direct_reports || 0}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand-primary)' }}>
                        {selectedEmployeeData.team_size || 0}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Team Size</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand-secondary)' }}>
                        {selectedEmployeeData.years_of_service || 0}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Years of Service</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HeadcountRow({ activeDepts, headcountMap, numCols }) {
  return (
    <div className="org-grade" style={{ marginBottom: 16 }}>
      <div className="org-grade-header" style={{ 
        background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%)', 
        borderBottom: '1px solid var(--border-glass)', 
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <div className="org-grade-title" style={{ display: 'flex', alignItems: 'center', padding: '12px 16px' }}>
          <TrendingUp size={16} style={{ marginRight: 8, color: 'var(--brand-primary)' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Department Headcount</span>
        </div>
      </div>
      <div className="org-grade-body" style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${numCols}, 1fr)`, 
        gap: 16, 
        padding: '16px', 
        background: 'var(--bg-elevated)' 
      }}>
        {activeDepts.map(dept => {
          const hc = headcountMap[dept.id];
          if (!hc) return <div key={dept.id} />;
          const pct = hc.max_headcount > 0 ? Math.round((hc.count / hc.max_headcount) * 100) : null;
          const isOverCapacity = hc.count > hc.max_headcount;
          const isNearCapacity = pct >= 90 && !isOverCapacity;
          
          return (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ 
                background: 'var(--bg-card)',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)'
              }}>
                <span>{dept.name}</span>
                <span style={{ 
                  fontSize: 12, 
                  color: isOverCapacity ? 'var(--color-danger)' : isNearCapacity ? 'var(--color-warning)' : 'var(--text-dim)'
                }}>
                  {pct != null ? `${pct}%` : 'Unlimited'}
                </span>
              </div>
              
              {pct != null ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                    <span>{hc.count} / {hc.max_headcount === 0 ? '\u221E' : hc.max_headcount}</span>
                    <span style={{ fontWeight: 600 }}>{hc.count > hc.max_headcount ? 'OVER' : isNearCapacity ? 'NEAR' : 'OK'}</span>
                  </div>
                  <div className="stat-bar" style={{ height: 8, borderRadius: '4px', overflow: 'hidden' }}>
                    <motion.div
                      className="stat-bar-fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        height: '100%',
                        background: isOverCapacity ? 'var(--color-danger)' : isNearCapacity ? 'var(--color-warning)' : 'var(--brand-primary)',
                        borderRadius: '4px',
                        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(pct, 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  {isOverCapacity && (
                    <div style={{ 
                      marginTop: 4, 
                      fontSize: 10, 
                      color: 'var(--color-danger)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 4 
                    }}>
                      <span>⚠</span>
                      <span>Over capacity by {hc.count - hc.max_headcount}</span>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ 
                  fontSize: 11, 
                  color: 'var(--text-dim)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4 
                }}>
                  <span>—</span>
                  <span>No headcount limit</span>
                </div>
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

function GradeBand({ grade, activeDepts, managerEmails, supervisorIds, headcountMap, numCols, hoveredEmployee, setHoveredEmployee, selectedEmployee, setSelectedEmployee, expandedDepts, toggleDept }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, delay: grade.grade_level * 0.05 }}
      className="org-grade"
    >
      <div className="org-grade-header" style={{ 
        background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%)', 
        borderBottom: '1px solid var(--border-glass)', 
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' 
      }}>
        <div className="org-grade-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="org-grade-level" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--brand-primary)' }}>Lv.{grade.grade_level}</span>
            <span className="org-grade-name" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{grade.grade_name}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="org-grade-count" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{grade.total} {grade.total === 1 ? 'member' : 'members'}</span>
            <span className="org-grade-count" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>•</span>
            <span className="org-grade-count" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{activeDepts.length} departments</span>
          </div>
        </div>
      </div>
      {numCols > 0 && (
        <div className="org-grade-body" style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${numCols}, 1fr)`, 
          gap: 16, 
          padding: '16px', 
          background: 'var(--bg-elevated)' 
        }}>
          {activeDepts.map(dept => {
            const members = grade.deptGroups[dept.id];
            const isExpanded = expandedDepts.has(dept.id);
            return (
              <motion.div
                key={dept.id}
                className={`org-dept-section${!members ? ' org-dept-empty' : ''}`}
                style={{ 
                  borderLeft: `3px solid var(--brand-primary)`,
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  padding: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: dept.id * 0.02 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                    onClick={() => members && toggleDept(dept.id)}
                  >
                    {members && (
                      <span style={{ color: 'var(--brand-primary)' }}>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                    )}
                    <span>{dept.name}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    {members ? `${members.length} members` : 'No members'}
                  </span>
                </div>
                {members && (
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="org-dept-members" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                      </motion.div>
                    )}
                  </AnimatePresence>
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
      style={{ 
        padding: '10px 14px', 
        cursor: 'pointer', 
        position: 'relative',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glass)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: employee.id * 0.01 }}
      whileHover={{ 
        scale: 1.05, 
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)',
        border: '1px solid var(--brand-primary)',
        background: 'var(--bg-elevated)'
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setSelectedEmployee(employee.id)}
      onMouseEnter={() => setHoveredEmployee(employee.id)}
      onMouseLeave={() => setHoveredEmployee(null)}
    >
      <div className="org-emp-avatar">
        {employee.avatar_path
          ? <img src={`/${employee.avatar_path}`} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
          : <div style={{ 
              width: 32, 
              height: 32, 
              borderRadius: '50%', 
              background: 'var(--brand-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontSize: 14, 
              fontWeight: 600 
            }}>
              {employee.name?.[0]?.toUpperCase()}
            </div>}
      </div>
      <div className="org-emp-body" style={{ marginLeft: 10, flex: 1 }}>
        <div className="org-emp-name" style={{ 
          fontSize: 14, 
          fontWeight: 600, 
          color: 'var(--text-primary)', 
          marginBottom: 2 
        }}>
          {employee.name}
        </div>
        <div className="org-emp-title" style={{ 
          fontSize: 12, 
          color: 'var(--text-secondary)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 4 
        }}>
          <Building size={12} />
          {employee.position_title || '—'}
        </div>
      </div>
      <div className="org-emp-tags" style={{ display: 'flex', gap: 6 }}>
        {isManager && (
          <span className="glass-badge glass-badge-success" title="Department Manager" style={{ fontSize: 11, padding: '2px 8px', borderRadius: '4px' }}>
            <span style={{ fontWeight: 600 }}>M</span>
          </span>
        )}
        {isSupervisor && !isManager && (
          <span className="glass-badge glass-badge-info" title="Supervisor" style={{ fontSize: 11, padding: '2px 8px', borderRadius: '4px' }}>
            <span style={{ fontWeight: 600 }}>S</span>
          </span>
        )}
        {employee.grade_level && (
          <span className="glass-badge glass-badge-secondary" style={{ fontSize: 11, padding: '2px 8px', borderRadius: '4px' }}>
            Lv.{employee.grade_level}
          </span>
        )}
      </div>
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="org-emp-tooltip"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ 
              position: 'absolute', 
              top: '100%', 
              left: 0, 
              right: 0, 
              zIndex: 10,
              marginTop: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: 12,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="tooltip-content" style={{ fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Mail size={14} />
                <span style={{ color: 'var(--text-primary)' }}>{employee.email}</span>
              </div>
<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Building size={14} />
                  <span style={{ color: 'var(--text-secondary)' }}>{employee.department_name}</span>
                </div>
{employee.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Phone size={14} />
                      <span style={{ color: 'var(--text-secondary)' }}>{employee.phone}</span>
                    </div>
                  )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}