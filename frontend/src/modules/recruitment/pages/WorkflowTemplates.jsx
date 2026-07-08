import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import hrApi from '../../../shared/api/hrApi';
import ConfirmModal from '../../../shared/components/ConfirmModal';

const STAGE_TYPES = ['screening', 'interview', 'technical', 'hr_review', 'offer', 'onboarding', 'custom'];
const RESPONSIBLE_ROLES = ['hr', 'recruiter', 'hiring_manager', 'tech_lead', 'ceo', 'admin'];
const TRIGGER_EVENTS = ['stage_entered', 'stage_completed', 'stage_skipped', 'candidate_rejected', 'candidate_hired'];
const CONDITION_OPERATORS = ['>', '<', '>=', '<=', '==', '!=', 'in', 'not_in', 'contains', 'is_empty', 'always'];
const ACTION_TYPES = ['send_email', 'skip_stage', 'reject_candidate', 'move_to_stage', 'notify_manager', 'assign_reviewer'];

const EMPTY_STAGE = { stage_order: 0, stage_key: '', display_name: '', stage_type: 'interview', responsible_role: 'hr', requires_confirmation: true, requires_attendance: true, requires_evaluation: true, is_optional: false, allow_skip: false, auto_advance: false };
const EMPTY_RULE = { rule_name: '', trigger_event: 'stage_completed', condition_field: 'always', condition_operator: '==', condition_value: '', action_type: 'send_email', action_params: {}, priority: 0 };

export default function WorkflowTemplates() {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('stages');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await hrApi.get('/recruitment/workflows');
      setTemplates(res.data);
    } catch { setMsg('Failed to load templates'); }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const selectTemplate = async (id) => {
    setSelectedId(id);
    try {
      const res = await hrApi.get(`/recruitment/workflows/${id}`);
      setSelected(res.data);
    } catch { setMsg('Failed to load template details'); }
  };

  const handleCreate = async () => {
    if (!templateForm.name) return;
    setSaving(true);
    try {
      await hrApi.post('/recruitment/workflows', templateForm);
      setMsg('Template created');
      setShowForm(false);
      setTemplateForm({ name: '', description: '' });
      fetchTemplates();
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to create'); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!templateForm.name || !editing) return;
    setSaving(true);
    try {
      await hrApi.put(`/recruitment/workflows/${editing}`, templateForm);
      setMsg('Template updated');
      setShowForm(false);
      setEditing(null);
      setTemplateForm({ name: '', description: '' });
      fetchTemplates();
      if (selectedId == editing) selectTemplate(editing);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to update'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await hrApi.delete(`/recruitment/workflows/${id}`);
      setMsg('Template deleted');
      if (selectedId == id) { setSelected(null); setSelectedId(null); }
      fetchTemplates();
    } catch { setMsg('Failed to delete'); }
    setConfirm(null);
  };

  const openEdit = (t) => {
    setTemplateForm({ name: t.name, description: t.description || '' });
    setEditing(t.id);
    setShowForm(true);
  };

  // ── Stage CRUD ──
  const handleSaveStage = async (stage) => {
    try {
      if (stage.id) {
        await hrApi.put(`/recruitment/workflow-stages/${stage.id}`, stage);
        setMsg('Stage updated');
      } else {
        await hrApi.post('/recruitment/workflow-stages', { ...stage, template_id: selectedId });
        setMsg('Stage created');
      }
      selectTemplate(selectedId);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to save stage'); }
  };

  const handleDeleteStage = async (id) => {
    try {
      await hrApi.delete(`/recruitment/workflow-stages/${id}`);
      setMsg('Stage deleted');
      selectTemplate(selectedId);
    } catch { setMsg('Failed to delete stage'); }
  };

  // ── Rule CRUD ──
  const handleSaveRule = async (rule) => {
    try {
      if (rule.id) {
        await hrApi.put(`/recruitment/workflow-rules/${rule.id}`, rule);
        setMsg('Rule updated');
      } else {
        await hrApi.post('/recruitment/workflow-rules', { ...rule, workflow_template_id: selectedId });
        setMsg('Rule created');
      }
      selectTemplate(selectedId);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed to save rule'); }
  };

  const handleDeleteRule = async (id) => {
    try {
      await hrApi.delete(`/recruitment/workflow-rules/${id}`);
      setMsg('Rule deleted');
      selectTemplate(selectedId);
    } catch { setMsg('Failed to delete rule'); }
  };

  return (
    <div className="page fade-in-up">
      {msg && (
        <div className="glass-alert glass-alert-info" style={{ marginBottom: 16 }}>
          <Icon icon="lucide:info" /> {msg}
          <button onClick={() => setMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar */}
        <div className="glass-card" style={{ flex: '0 0 300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon icon="lucide:git-branch" /> Workflows
            </h4>
            <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => { setTemplateForm({ name: '', description: '' }); setEditing(null); setShowForm(true); }}>
              <Icon icon="lucide:plus" /> New
            </button>
          </div>
          {loading ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>Loading...</p>
          ) : templates.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)', textAlign: 'center', padding: 20 }}>No workflow templates</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {templates.map(t => (
                <div key={t.id} onClick={() => selectTemplate(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    background: selectedId === t.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                    border: selectedId === t.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                    fontSize: '0.85rem',
                  }}>
                  <Icon icon="lucide:workflow" style={{ color: t.is_active ? 'var(--success)' : 'var(--text-faint)', fontSize: 16 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                      {t.stages_count || 0} stages · {t.rules_count || 0} rules
                    </div>
                  </div>
                  <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={e => { e.stopPropagation(); openEdit(t); }}>
                    <Icon icon="lucide:pencil" style={{ fontSize: 13 }} />
                  </button>
                  <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={e => { e.stopPropagation(); setConfirm(t); }}
                    style={{ color: 'var(--error)' }}>
                    <Icon icon="lucide:trash-2" style={{ fontSize: 13 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="glass-card" style={{ flex: 1 }}>
          {!selected ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)' }}>
              <Icon icon="lucide:workflow" style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '0.95rem' }}>Select a workflow template to manage stages and rules</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon icon="lucide:workflow" style={{ color: 'var(--brand-primary)' }} /> {selected.name}
                  </h4>
                  {selected.description && <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selected.description}</p>}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!selected.is_active}
                    onChange={async () => {
                      await hrApi.put(`/recruitment/workflows/${selected.id}`, { is_active: !selected.is_active });
                      selectTemplate(selected.id);
                    }} />
                  Active
                </label>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-glass)', marginBottom: 16 }}>
                {[
                  { key: 'stages', label: 'Stages', icon: 'lucide:list-ordered' },
                  { key: 'rules', label: 'Rules', icon: 'lucide:shield' },
                ].map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{
                      padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                      color: tab === t.key ? 'var(--brand-primary)' : 'var(--text-faint)',
                      borderBottom: tab === t.key ? '2px solid var(--brand-primary)' : '2px solid transparent',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    <Icon icon={t.icon} /> {t.label}
                  </button>
                ))}
              </div>

              {/* Stages Tab */}
              {tab === 'stages' && (
                <StageManager stages={selected.stages || []} onSave={handleSaveStage} onDelete={handleDeleteStage} />
              )}

              {/* Rules Tab */}
              {tab === 'rules' && (
                <RuleManager rules={selected.rules || []} onSave={handleSaveRule} onDelete={handleDeleteRule} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Create / Edit Template Modal */}
      {showForm && (
        <div className="glass-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="glass-modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                <Icon icon={editing ? 'lucide:pencil' : 'lucide:plus'} style={{ color: 'var(--brand-primary)', marginRight: 8 }} />
                {editing ? 'Edit Workflow' : 'New Workflow Template'}
              </h3>
              <button className="glass-modal-close" onClick={() => setShowForm(false)}><Icon icon="lucide:x" /></button>
            </div>
            <div style={{ padding: '20px 28px' }}>
              <div className="glass-form-group">
                <label className="glass-label">Name *</label>
                <input className="glass-input" value={templateForm.name}
                  onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} />
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Description</label>
                <textarea className="glass-textarea" rows={3} value={templateForm.description}
                  onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} />
              </div>
            </div>
            <div className="glass-modal-footer" style={{ padding: '16px 28px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="glass-btn glass-btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={editing ? handleUpdate : handleCreate}
                disabled={saving || !templateForm.name}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message={`Delete workflow "${confirm.name}"? This will remove all associated stages and rules.`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function StageManager({ stages, onSave, onDelete }) {
  const [editingStage, setEditingStage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_STAGE);

  const openCreate = () => {
    setForm({ ...EMPTY_STAGE, stage_order: stages.length + 1 });
    setEditingStage(null);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setForm({ ...s });
    setEditingStage(s);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.stage_key || !form.display_name) return;
    onSave(form);
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{stages.length} stage{stages.length !== 1 ? 's' : ''}</span>
        <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={openCreate}>
          <Icon icon="lucide:plus" /> Add Stage
        </button>
      </div>

      {stages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-faint)', fontSize: '0.85rem' }}>
          No stages defined. Add stages to build the workflow.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {stages.map((s, i) => (
            <div key={s.id || i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', fontSize: '0.85rem',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: 'rgba(99,102,241,0.15)',
                color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, flexShrink: 0,
              }}>{s.stage_order}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{s.display_name}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: '0.75rem', color: 'var(--text-faint)', flexWrap: 'wrap' }}>
                  <span>Key: {s.stage_key}</span>
                  <span>Type: {s.stage_type}</span>
                  {s.responsible_role && <span>Role: {s.responsible_role}</span>}
                  {s.is_optional && <span className="glass-badge glass-badge-warning" style={{ fontSize: '0.7rem' }}>Optional</span>}
                  {s.allow_skip && <span className="glass-badge glass-badge-info" style={{ fontSize: '0.7rem' }}>Skippable</span>}
                  {s.auto_advance && <span className="glass-badge glass-badge-success" style={{ fontSize: '0.7rem' }}>Auto</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => openEdit(s)}>
                  <Icon icon="lucide:pencil" style={{ fontSize: 13 }} />
                </button>
                <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => onDelete(s.id)}
                  style={{ color: 'var(--error)' }}>
                  <Icon icon="lucide:trash-2" style={{ fontSize: 13 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="glass-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="glass-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>
                  <Icon icon={editingStage ? 'lucide:pencil' : 'lucide:plus'} style={{ color: 'var(--brand-primary)', marginRight: 8 }} />
                  {editingStage ? 'Edit Stage' : 'Add Stage'}
                </h3>
                <button type="button" className="glass-modal-close" onClick={() => setShowForm(false)}><Icon icon="lucide:x" /></button>
              </div>
              <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Order</label>
                    <input className="glass-input" type="number" min="0" value={form.stage_order}
                      onChange={e => setForm(f => ({ ...f, stage_order: parseInt(e.target.value) || 0 }))} style={{ width: '100%' }} />
                  </div>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Stage Key *</label>
                    <input className="glass-input" value={form.stage_key}
                      onChange={e => setForm(f => ({ ...f, stage_key: e.target.value.replace(/\s+/g, '_').toLowerCase() }))} style={{ width: '100%' }}
                      placeholder="e.g. tech_interview" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Display Name *</label>
                    <input className="glass-input" value={form.display_name}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} style={{ width: '100%' }}
                      placeholder="e.g. Technical Interview" />
                  </div>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Stage Type</label>
                    <select className="glass-select" value={form.stage_type}
                      onChange={e => setForm(f => ({ ...f, stage_type: e.target.value }))} style={{ width: '100%' }}>
                      {STAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Responsible Role</label>
                    <select className="glass-select" value={form.responsible_role}
                      onChange={e => setForm(f => ({ ...f, responsible_role: e.target.value }))} style={{ width: '100%' }}>
                      {RESPONSIBLE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Message Template</label>
                    <input className="glass-input" value={form.message_template_id || ''}
                      onChange={e => setForm(f => ({ ...f, message_template_id: e.target.value ? parseInt(e.target.value) : null }))}
                      style={{ width: '100%' }} placeholder="Template ID (optional)" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '8px 0' }}>
                  {[
                    { key: 'requires_confirmation', label: 'Requires Confirmation' },
                    { key: 'requires_attendance', label: 'Requires Attendance' },
                    { key: 'requires_evaluation', label: 'Requires Evaluation' },
                    { key: 'is_optional', label: 'Is Optional' },
                    { key: 'allow_skip', label: 'Allow Skip' },
                    { key: 'auto_advance', label: 'Auto Advance' },
                  ].map(c => (
                    <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!form[c.key]}
                        onChange={e => setForm(f => ({ ...f, [c.key]: e.target.checked }))} />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="glass-modal-footer" style={{ padding: '16px 28px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="glass-btn glass-btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="glass-btn glass-btn-sm glass-btn-primary" disabled={!form.stage_key || !form.display_name}>
                  {editingStage ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function RuleManager({ rules, onSave, onDelete }) {
  const [editingRule, setEditingRule] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_RULE);

  const openCreate = () => {
    setForm({ ...EMPTY_RULE, priority: rules.length + 1 });
    setEditingRule(null);
    setShowForm(true);
  };

  const openEdit = (r) => {
    setForm({ ...r, action_params: typeof r.action_params === 'string' ? JSON.parse(r.action_params) : (r.action_params || {}) });
    setEditingRule(r);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.rule_name || !form.trigger_event || !form.action_type) return;
    onSave(form);
    setShowForm(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{rules.length} rule{rules.length !== 1 ? 's' : ''}</span>
        <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={openCreate}>
          <Icon icon="lucide:plus" /> Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-faint)', fontSize: '0.85rem' }}>
          No rules defined. Rules automate actions when events occur.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rules.map((r, i) => (
            <div key={r.id || i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', fontSize: '0.85rem',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,158,11,0.15)',
                color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, flexShrink: 0,
              }}>{r.priority}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{r.rule_name}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: '0.75rem', color: 'var(--text-faint)', flexWrap: 'wrap' }}>
                  <span>On: {r.trigger_event}</span>
                  {r.condition_field !== 'always' && <span>When: {r.condition_field} {r.condition_operator} {r.condition_value}</span>}
                  {r.condition_field === 'always' && <span>Always</span>}
                  <span>Action: {r.action_type}</span>
                  {!r.is_active && <span className="glass-badge glass-badge-neutral" style={{ fontSize: '0.7rem' }}>Inactive</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => openEdit(r)}>
                  <Icon icon="lucide:pencil" style={{ fontSize: 13 }} />
                </button>
                <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => onDelete(r.id)}
                  style={{ color: 'var(--error)' }}>
                  <Icon icon="lucide:trash-2" style={{ fontSize: 13 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="glass-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="glass-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>
                  <Icon icon={editingRule ? 'lucide:pencil' : 'lucide:plus'} style={{ color: 'var(--brand-primary)', marginRight: 8 }} />
                  {editingRule ? 'Edit Rule' : 'Add Rule'}
                </h3>
                <button type="button" className="glass-modal-close" onClick={() => setShowForm(false)}><Icon icon="lucide:x" /></button>
              </div>
              <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Rule Name *</label>
                    <input className="glass-input" value={form.rule_name}
                      onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))} style={{ width: '100%' }} />
                  </div>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Priority</label>
                    <input className="glass-input" type="number" min="0" value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} style={{ width: '100%' }} />
                  </div>
                </div>
                <div className="glass-form-group" style={{ margin: 0 }}>
                  <label className="glass-label">Trigger Event *</label>
                  <select className="glass-select" value={form.trigger_event}
                    onChange={e => setForm(f => ({ ...f, trigger_event: e.target.value }))} style={{ width: '100%' }}>
                    {TRIGGER_EVENTS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Condition Field</label>
                    <input className="glass-input" value={form.condition_field}
                      onChange={e => setForm(f => ({ ...f, condition_field: e.target.value }))} style={{ width: '100%' }}
                      placeholder="score / always" />
                  </div>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Operator</label>
                    <select className="glass-select" value={form.condition_operator}
                      onChange={e => setForm(f => ({ ...f, condition_operator: e.target.value }))} style={{ width: '100%' }}>
                      {CONDITION_OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Value</label>
                    <input className="glass-input" value={form.condition_value}
                      onChange={e => setForm(f => ({ ...f, condition_value: e.target.value }))} style={{ width: '100%' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Action Type *</label>
                    <select className="glass-select" value={form.action_type}
                      onChange={e => setForm(f => ({ ...f, action_type: e.target.value }))} style={{ width: '100%' }}>
                      {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="glass-form-group" style={{ margin: 0 }}>
                    <label className="glass-label">Is Active</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', marginTop: 4 }}>
                      <input type="checkbox" checked={form.is_active !== false}
                        onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                      Active
                    </label>
                  </div>
                </div>
              </div>
              <div className="glass-modal-footer" style={{ padding: '16px 28px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="glass-btn glass-btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="glass-btn glass-btn-sm glass-btn-primary" disabled={!form.rule_name || !form.trigger_event || !form.action_type}>
                  {editingRule ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
