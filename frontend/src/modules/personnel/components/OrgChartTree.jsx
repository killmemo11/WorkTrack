import { useMemo, useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Mail, Phone, Building, X, Calendar, Search } from 'lucide-react';

function OrgCard({ employee, isManager, isSupervisor, isHighlighted, onClick, onMouseEnter, onMouseLeave, isHovered }) {
  return (
    <motion.div
      className={`glass-card org-tree-card${isManager ? ' org-tree-card-manager' : ''}${isHighlighted ? ' org-tree-card-highlighted' : ''}`}
      style={{
        padding: '10px 14px',
        cursor: 'pointer',
        position: 'relative',
        minWidth: 180,
        maxWidth: 200,
      }}
      whileHover={{ scale: 1.05, boxShadow: '0 8px 25px rgba(0,0,0,0.15)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="org-tree-avatar">
          {employee.avatar_path
            ? <img src={`/${employee.avatar_path}`} alt="" />
            : <span>{employee.name?.[0]?.toUpperCase()}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="org-tree-name">{employee.name}</div>
          <div className="org-tree-title">{employee.position_title || '—'}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {isManager && <span className="glass-badge glass-badge-success" style={{ fontSize: 10, padding: '2px 6px' }}>M</span>}
          {isSupervisor && !isManager && <span className="glass-badge glass-badge-info" style={{ fontSize: 10, padding: '2px 6px' }}>S</span>}
        </div>
      </div>
      {employee.children?.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
          {employee.children.length} {employee.children.length === 1 ? 'report' : 'reports'}
        </div>
      )}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="org-tree-tooltip"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Mail size={12} />
              <span>{employee.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building size={12} />
              <span>{employee.department_name}</span>
            </div>
            {employee.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Phone size={12} />
                <span>{employee.phone}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TreeConnectors({ positions, gradientId }) {
  const posArray = Array.from(positions.values());

  return (
    <svg className="org-tree-connectors" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {posArray.map(pos => {
        const node = pos.node;
        if (!node.children?.length) return null;
        return node.children.map(child => {
          const childPos = positions.get(child.id);
          if (!childPos) return null;
          const x1 = pos.x;
          const y1 = pos.y + 40;
          const x2 = childPos.x;
          const y2 = childPos.y - 20;
          const midY = (y1 + y2) / 2;
          const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
          return (
            <motion.path
              key={`conn-${node.id}-${child.id}`}
              d={path}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          );
        });
      })}
    </svg>
  );
}

function EmployeeModal({ employee, onClose }) {
  if (!employee) return null;

  return (
    <motion.div
      className="glass-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        className="glass-modal"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 420, padding: 0, overflow: 'hidden' }}
      >
        <div className="glass-modal-header" style={{
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="org-tree-avatar" style={{ width: 52, height: 52, border: '2px solid rgba(255,255,255,0.5)' }}>
              {employee.avatar_path
                ? <img src={`/${employee.avatar_path}`} alt="" />
                : <span style={{ fontSize: 22 }}>{employee.name?.[0]?.toUpperCase()}</span>}
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'white', fontSize: 18, fontWeight: 600 }}>{employee.name}</h3>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{employee.position_title || '—'}</p>
            </div>
          </div>
          <button className="glass-btn glass-btn-ghost" onClick={onClose} style={{ color: 'white', padding: 8, minWidth: 'auto', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>
        <div className="glass-modal-body" style={{ padding: '24px' }}>
          <div className="glass-detail-row">
            <span className="glass-detail-label"><Mail size={14} /> Email</span>
            <span className="glass-detail-value">{employee.email}</span>
          </div>
          <div className="glass-detail-row">
            <span className="glass-detail-label"><Building size={14} /> Department</span>
            <span className="glass-detail-value">{employee.department_name}</span>
          </div>
          <div className="glass-detail-row">
            <span className="glass-detail-label"><Calendar size={14} /> Grade Level</span>
            <span className="glass-detail-value">Lv.{employee.grade_level}</span>
          </div>
          {employee.phone && (
            <div className="glass-detail-row">
              <span className="glass-detail-label"><Phone size={14} /> Phone</span>
              <span className="glass-detail-value">{employee.phone}</span>
            </div>
          )}
          {employee.hire_date && (
            <div className="glass-detail-row">
              <span className="glass-detail-label"><Calendar size={14} /> Hire Date</span>
              <span className="glass-detail-value">{new Date(employee.hire_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function OrgChartTree({
  positions,
  managerEmails,
  supervisorIds,
  hoveredEmployee,
  setHoveredEmployee,
  selectedEmployee,
  setSelectedEmployee,
  search,
}) {
  const gradientId = useId();
  const [collapsed, setCollapsed] = useState(new Set());
  const posArray = useMemo(() => Array.from(positions.values()), [positions]);

  const toggleCollapse = (e, id) => {
    e.stopPropagation();
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleNodes = useMemo(() => {
    const visible = new Set();
    const walk = (node) => {
      if (collapsed.has(node.id)) {
        visible.add(node.id);
        return;
      }
      visible.add(node.id);
      node.children?.forEach(child => walk(child));
    };
    posArray.forEach(p => walk(p.node));
    return visible;
  }, [posArray, collapsed]);

  const maxX = posArray.length ? Math.max(...posArray.map(p => p.x)) + 120 : 0;
  const maxY = posArray.length ? Math.max(...posArray.map(p => p.y)) + 80 : 0;

  return (
    <div className="org-tree-container" style={{ position: 'relative', minHeight: 400 }}>
      <div className="org-tree-wrapper" style={{ position: 'relative', width: maxX, height: maxY }}>
        <TreeConnectors positions={positions} gradientId={gradientId} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          {posArray.map(pos => {
            const node = pos.node;
            if (!visibleNodes.has(node.id)) return null;
            const isManager = managerEmails.has(node.email);
            const isSupervisor = supervisorIds.has(node.id);
            const isHighlighted = search?.trim() && node.name.toLowerCase().includes(search.toLowerCase().trim());
            const isHovered = hoveredEmployee === node.id;
            const hasChildren = node.children?.length > 0;
            const isCollapsed = collapsed.has(node.id);

            return (
              <motion.div
                key={node.id}
                className="org-tree-node"
                style={{
                  position: 'absolute',
                  left: pos.x - 100,
                  top: pos.y,
                  transform: 'translateX(0)',
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                <OrgCard
                  employee={node}
                  isManager={isManager}
                  isSupervisor={isSupervisor}
                  isHighlighted={isHighlighted}
                  onClick={() => setSelectedEmployee(node.id)}
                  onMouseEnter={() => setHoveredEmployee(node.id)}
                  onMouseLeave={() => setHoveredEmployee(null)}
                  isHovered={isHovered}
                />
                {hasChildren && (
                  <button
                    className="glass-btn glass-btn-ghost org-tree-collapse-btn"
                    onClick={(e) => toggleCollapse(e, node.id)}
                    style={{
                      position: 'absolute',
                      bottom: -14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 28,
                      height: 28,
                      padding: 0,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 'auto',
                      zIndex: 5,
                    }}
                  >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
      {posArray.length === 0 && (
        <div className="glass-empty" style={{ padding: 48, textAlign: 'center' }}>
          <Search size={48} style={{ color: 'var(--text-dim)', marginBottom: 16 }} />
          <h3 style={{ color: 'var(--text-primary)', fontSize: 16 }}>No employees found</h3>
        </div>
      )}
    </div>
  );
}

export { OrgCard, TreeConnectors, EmployeeModal };
