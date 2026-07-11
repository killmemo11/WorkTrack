// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';

export default function RBACManager() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({ permissions: [], grouped: {} });
  const [users, setUsers] = useState({ admins: [], employees: [] });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('roles');
  const [editingRole, setEditingRole] = useState(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [assigningUser, setAssigningUser] = useState(null);
  const [assigningUserType, setAssigningUserType] = useState(null);
  const [userSearch, setUserSearch] = useState('');

  const authHeaders = { Authorization: `Bearer ${localStorage.getItem('adminToken')}` };
  const jsonHeaders = { ...authHeaders, 'Content-Type': 'application/json' };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes, usersRes, servicesRes] = await Promise.all([
        fetch('/api/admin/rbac/roles', { headers: authHeaders }),
        fetch('/api/admin/rbac/permissions', { headers: authHeaders }),
        fetch('/api/admin/rbac/users', { headers: authHeaders }),
        fetch('/api/admin/rbac/services', { headers: authHeaders }),
      ]);
      if (rolesRes.ok) setRoles((await rolesRes.json()).roles);
      if (permsRes.ok) setPermissions(await permsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (servicesRes.ok) setServices((await servicesRes.json()).services);
    } catch (err) { console.error('Failed:', err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateRole = () => {
    setEditingRole(null);
    setShowRoleForm(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setShowRoleForm(true);
  };

  const handleDeleteRole = async (id, name) => {
    if (!confirm(`Delete role "${name}"?`)) return;
    await fetch(`/api/admin/rbac/roles/${id}`, { method: 'DELETE', headers: authHeaders });
    fetchData();
  };

  const handleSaveRole = async (formData) => {
    const body = {
      name: formData.name,
      display_name: formData.display_name,
      description: formData.description,
      permission_ids: formData.permission_ids,
    };
    if (editingRole) {
      await fetch(`/api/admin/rbac/roles/${editingRole.id}`, {
        method: 'PUT', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
    } else {
      await fetch('/api/admin/rbac/roles', {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
    }
    setShowRoleForm(false);
    fetchData();
  };

  const handleToggleService = async (id, is_enabled) => {
    await fetch(`/api/admin/rbac/services/${id}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ is_enabled }),
    });
    fetchData();
  };

  const handleAssignRole = async (userId, roleId) => {
    await fetch('/api/admin/rbac/assign-role', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ user_id: userId, role_id: roleId }),
    });
    setAssigningUser(null);
    fetchData();
  };

  const handleRemoveRole = async (userId, roleId) => {
    await fetch('/api/admin/rbac/remove-role', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ user_id: userId, role_id: roleId }),
    });
    fetchData();
  };

  const allUsers = [
    ...users.admins.map(u => ({ ...u, _type: 'admin', _label: u.username })),
    ...users.employees.map(u => ({ ...u, _type: 'employee', _label: u.name || u.username })),
  ].filter(u => !userSearch || u._label.toLowerCase().includes(userSearch.toLowerCase()) || (u.email || '').toLowerCase().includes(userSearch.toLowerCase()));

  if (loading) return <div className="glass-loading"><div className="spinner" /><span>Loading RBAC...</span></div>;

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1>Access Control & Services</h1>
          <p className="subtitle" style={{color:'var(--text-dim)'}}>Manage roles, permissions & service toggles</p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={handleCreateRole}>
          <Icon icon="lucide:plus" size={16} /> New Role
        </button>
      </div>

      <div className="glass-card" style={{marginBottom:16}}>
        <div style={{display:'flex',gap:'4px',padding:'12px 20px',borderBottom:'1px solid var(--border-light)'}}>
          {[
            {key:'roles',label:'Roles & Permissions',icon:'lucide:shield'},
            {key:'users',label:'User Assignments',icon:'lucide:users'},
            {key:'services',label:'Service Toggles',icon:'lucide:toggle-right'},
          ].map(tab => (
            <button key={tab.key} className={`glass-btn glass-btn-sm ${activeSection === tab.key ? 'glass-btn-primary' : 'glass-btn-ghost'}`} onClick={() => setActiveSection(tab.key)}>
              <Icon icon={tab.icon} size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {activeSection === 'roles' && (
          <div style={{padding:'20px'}}>
            {roles.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No roles found</div>
            ) : (
              <table className="glass-table" style={{width:'100%'}}>
                <thead><tr><th style={{padding:'12px'}}>Role</th><th>Permissions</th><th>Users</th><th>Actions</th></tr></thead>
                <tbody>
                  {roles.map(role => (
                    <tr key={role.id} style={{borderBottom:'1px solid var(--border-light)'}}>
                      <td style={{padding:'12px'}}>
                        <strong>{role.display_name}</strong>
                        <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{role.name}</div>
                        {role.is_system && <span className="glass-badge glass-badge-info" style={{fontSize:'0.65rem'}}>System</span>}
                      </td>
                      <td style={{padding:'12px'}}>{role.permission_count || 0}</td>
                      <td style={{padding:'12px'}}>{role.user_count || 0}</td>
                      <td style={{padding:'12px'}}>
                        <div style={{display:'flex',gap:'4px'}}>
                          <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => handleEditRole(role)}><Icon icon="lucide:edit" size={14} /></button>
                          {!role.is_system && role.user_count === 0 && (
                            <button className="glass-btn glass-btn-sm glass-btn-error" onClick={() => handleDeleteRole(role.id, role.display_name)}><Icon icon="lucide:trash-2" size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeSection === 'users' && (
          <div style={{padding:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{margin:0}}>User Assignments</h3>
              <input
                className="glass-input"
                placeholder="Search users..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{width:'240px',fontSize:'0.85rem'}}
              />
            </div>
            {allUsers.length === 0 ? (
              <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No users found</div>
            ) : (
              <table className="glass-table" style={{width:'100%'}}>
                <thead>
                  <tr>
                    <th style={{padding:'10px 12px'}}>User</th>
                    <th style={{padding:'10px 12px'}}>Type</th>
                    <th style={{padding:'10px 12px'}}>Assigned Roles</th>
                    <th style={{padding:'10px 12px',width:'120px'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(user => (
                    <tr key={`${user._type}-${user.id}`} style={{borderBottom:'1px solid var(--border-light)'}}>
                      <td style={{padding:'10px 12px'}}>
                        <strong>{user._label}</strong>
                        <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{user.email}</div>
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <span className={`glass-badge ${user._type === 'admin' ? 'glass-badge-warning' : 'glass-badge-info'}`} style={{fontSize:'0.7rem'}}>
                          {user._type === 'admin' ? 'Admin User' : 'Employee'}
                        </span>
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{display:'flex',gap:'4px',flexWrap:'wrap',alignItems:'center'}}>
                          {user.roles && user.roles.filter(r => r && r.role_id).map(role => (
                            <span key={role.role_id} className="glass-badge glass-badge-info" style={{fontSize:'0.7rem',display:'inline-flex',alignItems:'center',gap:'4px'}}>
                              {role.display_name || role.role_name}
                              <button
                                onClick={() => handleRemoveRole(user.id, role.role_id)}
                                style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',padding:0,lineHeight:1,fontSize:'0.8rem'}}
                                title="Remove role"
                              >&times;</button>
                            </span>
                          ))}
                          <button
                            className="glass-btn glass-btn-sm glass-btn-ghost"
                            onClick={() => { setAssigningUser(user); setAssigningUserType(user._type); }}
                            style={{fontSize:'0.75rem'}}
                          >
                            <Icon icon="lucide:plus" size={12} /> Add Role
                          </button>
                        </div>
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <span style={{fontSize:'0.75rem',color:user.is_active ? 'var(--success)' : 'var(--text-muted)'}}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeSection === 'services' && (
          <div style={{padding:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h3 style={{margin:0}}>Service Toggles</h3>
              <p style={{fontSize:'0.85rem',color:'var(--text-dim)',margin:0}}>
                Enable or disable services by module. Disabled services are hidden from users and blocked at the API level.
              </p>
            </div>
            <div className="services-grid">
              {services.map(svc => (
                <div key={svc.id} className="service-card glass-card fade-in-up" style={{transition:'transform 0.2s, box-shadow 0.2s'}}>
                  <div className="service-card-header">
                    <div className="service-icon-wrapper">
                      <Icon icon={svc.icon || 'lucide:layers'} size={22} />
                    </div>
                    <div className="service-status">
                      {svc.is_enabled ? (
                        <span className="service-badge enabled"><Icon icon="lucide:check-circle" size={12} /> Active</span>
                      ) : (
                        <span className="service-badge disabled"><Icon icon="lucide:x-circle" size={12} /> Inactive</span>
                      )}
                    </div>
                  </div>
                  <div className="service-card-body">
                    <h4 className="service-name">{svc.service_name}</h4>
                    <p className="service-description">{svc.description || 'No description'}</p>
                    <div className="service-meta">
                      <span className="service-key">{svc.service_key}</span>
                    </div>
                  </div>
                  <div className="service-card-footer">
                    <button
                      className={`service-toggle-btn ${svc.is_enabled ? 'active' : ''}`}
                      onClick={() => handleToggleService(svc.id, !svc.is_enabled)}
                      disabled={svc.is_visible === 0}
                    >
                      <span className="toggle-track">
                        <span className="toggle-thumb" />
                      </span>
                      <span className="toggle-label">{svc.is_enabled ? 'Enabled' : 'Disabled'}</span>
                    </button>
                    {svc.is_visible === 0 && (
                      <span className="service-hidden-notice"><Icon icon="lucide:eye-off" size={10} /> Hidden from users</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showRoleForm && (
        <RoleForm role={editingRole} permissions={permissions} onSave={handleSaveRole} onCancel={() => setShowRoleForm(false)} headers={authHeaders} />
      )}

      {assigningUser && (
        <div className="platform-modal-overlay" onClick={() => setAssigningUser(null)}>
          <div className="platform-modal glass-card" onClick={e => e.stopPropagation()} style={{maxWidth:'400px'}}>
            <div className="platform-modal-header">
              <h3>Assign Role to {assigningUser._label}</h3>
              <button onClick={() => setAssigningUser(null)} className="glass-btn glass-btn-ghost glass-btn-sm"><Icon icon="lucide:x" size={18} /></button>
            </div>
            <div className="platform-modal-body" style={{padding:'16px 20px'}}>
              <p style={{fontSize:'0.85rem',color:'var(--text-dim)',marginBottom:'12px'}}>
                Select a role to assign. The system auto-detects whether this is an admin user or employee.
              </p>
              {roles.filter(r => {
                const alreadyAssigned = assigningUser.roles?.some(ur => ur && ur.role_id === r.id);
                return !alreadyAssigned;
              }).map(role => (
                <div key={role.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',border:'1px solid var(--border-light)',borderRadius:'8px',marginBottom:'8px',cursor:'pointer',transition:'background 0.15s'}}
                  className="glass-card"
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                  onClick={() => handleAssignRole(assigningUser.id, role.id)}
                >
                  <div>
                    <strong style={{fontSize:'0.9rem'}}>{role.display_name}</strong>
                    <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{role.permission_count || 0} permissions</div>
                  </div>
                  <Icon icon="lucide:plus" size={16} style={{color:'var(--primary)'}} />
                </div>
              ))}
              {roles.filter(r => !assigningUser.roles?.some(ur => ur && ur.role_id === r.id)).length === 0 && (
                <div style={{textAlign:'center',padding:'20px',color:'var(--text-muted)'}}>All roles already assigned</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleForm({ role, permissions, onSave, onCancel, headers }) {
  const [name, setName] = useState(role?.name || '');
  const [displayName, setDisplayName] = useState(role?.display_name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [selectedPerms, setSelectedPerms] = useState(new Set());
  const [existingPerms, setExistingPerms] = useState(new Set());

  useEffect(() => {
    if (role) {
      fetch(`/api/admin/rbac/roles/${role.id}/permissions`, { headers })
        .then(res => res.json())
        .then(data => {
          const set = new Set(data.permissions.map(p => p.id));
          setExistingPerms(set);
          setSelectedPerms(new Set(set));
        });
    }
  }, [role]);

  const handleTogglePerm = (permId) => {
    const next = new Set(selectedPerms);
    if (next.has(permId)) next.delete(permId); else next.add(permId);
    setSelectedPerms(next);
  };

  const handleToggleModule = (module) => {
    const modulePerms = permissions.permissions.filter(p => p.module === module);
    const allSelected = modulePerms.every(p => selectedPerms.has(p.id));
    const next = new Set(selectedPerms);
    if (allSelected) {
      modulePerms.forEach(p => next.delete(p.id));
    } else {
      modulePerms.forEach(p => next.add(p.id));
    }
    setSelectedPerms(next);
  };

  return (
    <div className="platform-modal-overlay" onClick={onCancel}>
      <div className="platform-modal glass-card" onClick={e => e.stopPropagation()} style={{maxWidth:'640px'}}>
        <div className="platform-modal-header">
          <h3>{role ? 'Edit Role' : 'Create Role'}</h3>
          <button onClick={onCancel} className="glass-btn glass-btn-ghost glass-btn-sm"><Icon icon="lucide:x" size={18} /></button>
        </div>
        <div className="platform-modal-body" style={{maxHeight:'70vh',overflowY:'auto'}}>
          <div className="glass-input-group"><label>Role Name (unique)</label><input className="glass-input" value={name} onChange={e => setName(e.target.value)} disabled={role?.is_system} /></div>
          <div className="glass-input-group"><label>Display Name</label><input className="glass-input" value={displayName} onChange={e => setDisplayName(e.target.value)} /></div>
          <div className="glass-input-group"><label>Description</label><textarea className="glass-input" rows={2} value={description} onChange={e => setDescription(e.target.value)} /></div>

          <h4 style={{margin:'16px 0 8px'}}>Permissions</h4>
          {Object.entries(permissions.grouped).map(([module, perms]) => {
            const allSelected = perms.every(p => selectedPerms.has(p.id));
            return (
              <div key={module} style={{marginBottom:'12px',padding:'12px',border:'1px solid var(--border-light)',borderRadius:'8px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                  <strong style={{textTransform:'capitalize'}}>{module}</strong>
                  <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => handleToggleModule(module)}>
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                  {perms.map(p => (
                    <label key={p.id} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'0.85rem',cursor:'pointer'}}>
                      <input type="checkbox" checked={selectedPerms.has(p.id)} onChange={() => handleTogglePerm(p.id)} />
                      <span>{p.action}</span>
                      <span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>— {p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{padding:'16px 20px',display:'flex',gap:'8px',justifyContent:'flex-end',borderTop:'1px solid var(--border-light)'}}>
          <button className="glass-btn glass-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="glass-btn glass-btn-primary" onClick={() => onSave({ name, display_name: displayName, description, permission_ids: Array.from(selectedPerms) })}>
            <Icon icon="lucide:save" size={16} /> Save Role
          </button>
        </div>
      </div>
    </div>
  );
}