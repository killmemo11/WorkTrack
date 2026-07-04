import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import api from '../../../shared/api';
import hrApi from '../../../shared/api/hrApi';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Search, AlertCircle, Users } from 'lucide-react';
import OrgChartTree, { EmployeeModal } from '../components/OrgChartTree';
import { buildOrgTree, calcTreeLayout } from '../components/orgChartUtils';

export default function OrganizationChart() {
  const [data, setData] = useState(null);
  const [headcount, setHeadcount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [hoveredEmployee, setHoveredEmployee] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get('/personnel/organization-chart'),
      hrApi.get('/reports/headcount'),
    ])
      .then(([orgRes, hcRes]) => {
        setData(orgRes.data);
        setHeadcount(hcRes.data.byDepartment);
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

  const orgTree = useMemo(() => {
    if (!data) return [];
    return buildOrgTree(data.employees, search);
  }, [data, search]);

  const treePositions = useMemo(() => {
    if (!orgTree.length) return new Map();
    return calcTreeLayout(orgTree, 200, 40, 100);
  }, [orgTree]);

  const headcountSummary = useMemo(() => {
    if (!headcount) return null;
    const total = headcount.reduce((s, d) => s + (d.count || 0), 0);
    const maxTotal = headcount.reduce((s, d) => s + (d.max_headcount || 0), 0);
    return { total, maxTotal };
  }, [headcount]);

  const selectedEmployeeData = useMemo(() => {
    if (!selectedEmployee || !data) return null;
    return data.employees.find(e => e.id === selectedEmployee) || null;
  }, [selectedEmployee, data]);

  const handleZoomIn = () => setZoomLevel(Math.min(zoomLevel + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(Math.max(zoomLevel - 0.1, 0.3));

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoomLevel(prev => Math.max(0.3, Math.min(2, prev + delta)));
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = (e) => {
    if (e.target.closest('.org-tree-node, .glass-btn, .glass-input')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setDragOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  if (loading) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{ width: 48, height: 48, border: '4px solid var(--border-glass)', borderTop: '4px solid var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Loading organization chart...</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 8 }}>Building company hierarchy tree</p>
      </div>
    </motion.div>
  );

  if (error) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center', maxWidth: 500 }}>
        <AlertCircle size={48} style={{ color: 'var(--color-danger)', marginBottom: 16 }} />
        <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>Could not load organization chart</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>{error}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="glass-btn glass-btn-primary" onClick={() => window.location.reload()}>Retry</button>
          <button className="glass-btn glass-btn-ghost" onClick={() => window.location.href = '/personnel/employees'}>View Employees</button>
        </div>
      </div>
    </motion.div>
  );

  if (!data) return (
    <div className="page">
      <div className="glass-alert glass-alert-danger">Could not load organization chart.</div>
    </div>
  );

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="page"
      style={{ overflow: 'hidden', cursor: isDragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, padding: '12px 20px', cursor: 'default' }}
      >
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} style={{ color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Organization Chart</h1>
              <p className="subtitle" style={{ fontSize: 13, margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                Company hierarchy — {data?.employees?.length || 0} employees
                {headcountSummary && ` · ${headcountSummary.total} filled / ${headcountSummary.maxTotal} total`}
              </p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ display: 'flex', gap: 10, alignItems: 'center' }}
        >
          <div className="glass-btn-group" style={{ display: 'flex', gap: 2, background: 'var(--bg-elevated)', padding: 4, borderRadius: 8, border: '1px solid var(--border-glass)' }}>
            <button className="glass-btn glass-btn-ghost" onClick={handleZoomOut} title="Zoom out" style={{ padding: 6, minWidth: 32, height: 32 }}>
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', minWidth: 36, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button className="glass-btn glass-btn-ghost" onClick={handleZoomIn} title="Zoom in" style={{ padding: 6, minWidth: 32, height: 32 }}>
              <ZoomIn size={16} />
            </button>
          </div>
          <div className="glass-input-wrapper" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="glass-input"
              style={{ paddingLeft: 36, minWidth: 240, height: 38 }}
            />
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="org-tree-viewport"
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          paddingBottom: 8,
        }}
      >
        <div
          style={{
            transform: `scale(${zoomLevel}) translate(${dragOffset.x / zoomLevel}px, ${dragOffset.y / zoomLevel}px)`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease',
            padding: 32,
            minWidth: 'fit-content',
          }}
        >
          <OrgChartTree
            positions={treePositions}
            managerEmails={managerEmails}
            supervisorIds={supervisorIds}
            hoveredEmployee={hoveredEmployee}
            setHoveredEmployee={setHoveredEmployee}
            selectedEmployee={selectedEmployee}
            setSelectedEmployee={setSelectedEmployee}
            search={search}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedEmployeeData && (
          <EmployeeModal
            employee={selectedEmployeeData}
            onClose={() => setSelectedEmployee(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
