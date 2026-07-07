import { useState, useEffect, useCallback } from 'react';
import Icon from '../../../shared/components/Icon';
import hrApi from '../../../shared/api/hrApi';

const CATEGORY_LABELS = { communication: 'Communication', technical: 'Technical', experience: 'Experience', culture: 'Culture Fit', general: 'General' };

export default function PhoneTemplates() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [questionForm, setQuestionForm] = useState({ question: '', weight: 1, max_rating: 5, category: 'general', sort_order: 0 });
  const [showQuestion, setShowQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [msg, setMsg] = useState('');

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await hrApi.get('/recruitment/phone-screening/templates');
      setTemplates(res.data);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const selectTemplate = async (id) => {
    try {
      const res = await hrApi.get(`/recruitment/phone-screening/templates/${id}`);
      setSelected(res.data);
    } catch { }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name) return;
    try {
      setSaving(true);
      await hrApi.post('/recruitment/phone-screening/templates', templateForm);
      setMsg('Template created');
      setShowForm(false);
      setTemplateForm({ name: '', description: '' });
      fetchTemplates();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to create template');
    } finally { setSaving(false); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Delete this template and all its questions?')) return;
    try {
      await hrApi.delete(`/recruitment/phone-screening/templates/${id}`);
      setMsg('Template deleted');
      if (selected?.id === id) setSelected(null);
      fetchTemplates();
    } catch { setMsg('Failed to delete template'); }
  };

  const handleAddQuestion = async () => {
    if (!questionForm.question || !selected) return;
    try {
      setSaving(true);
      await hrApi.post(`/recruitment/phone-screening/templates/${selected.id}/questions`, questionForm);
      setMsg('Question added');
      setShowQuestion(false);
      setQuestionForm({ question: '', weight: 1, max_rating: 5, category: 'general', sort_order: 0 });
      selectTemplate(selected.id);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to add question');
    } finally { setSaving(false); }
  };

  const handleUpdateQuestion = async () => {
    if (!questionForm.question || !editingQuestion) return;
    try {
      setSaving(true);
      await hrApi.put(`/recruitment/phone-screening/questions/${editingQuestion.id}`, questionForm);
      setMsg('Question updated');
      setShowQuestion(false);
      setEditingQuestion(null);
      setQuestionForm({ question: '', weight: 1, max_rating: 5, category: 'general', sort_order: 0 });
      selectTemplate(selected.id);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to update question');
    } finally { setSaving(false); }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!confirm('Delete this question?')) return;
    try {
      await hrApi.delete(`/recruitment/phone-screening/questions/${qId}`);
      setMsg('Question deleted');
      selectTemplate(selected.id);
    } catch { setMsg('Failed to delete question'); }
  };

  const editQuestion = (q) => {
    setQuestionForm({ question: q.question, weight: q.weight, max_rating: q.max_rating, category: q.category, sort_order: q.sort_order });
    setEditingQuestion(q);
    setShowQuestion(true);
  };

  const newQuestion = () => {
    setQuestionForm({ question: '', weight: 1, max_rating: 5, category: 'general', sort_order: (selected?.questions?.length || 0) + 1 });
    setEditingQuestion(null);
    setShowQuestion(true);
  };

  return (
    <div>
      {msg && (
        <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
          <Icon icon="lucide:info" style={{ color: 'var(--brand-primary)' }} />
          {msg}
          <button onClick={() => setMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Template list */}
        <div className="glass-card" style={{ flex: '0 0 320px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon icon="lucide:list" /> Templates
            </h4>
            <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => setShowForm(true)}>
              <Icon icon="lucide:plus" /> New
            </button>
          </div>
          {loading ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>Loading...</p>
          ) : templates.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)', textAlign: 'center', padding: 20 }}>No templates yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {templates.map(t => (
                <div key={t.id} onClick={() => selectTemplate(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                    background: selected?.id === t.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                    border: selected?.id === t.id ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                    transition: 'all 0.15s', fontSize: '0.85rem',
                  }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                      {t.question_count || 0} questions{t.is_default ? ' • Default' : ''}
                    </div>
                  </div>
                  {!t.is_default && (
                    <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={e => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                      style={{ color: 'var(--error)' }}>
                      <Icon icon="lucide:trash-2" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="glass-card" style={{ flex: 1 }}>
          {!selected ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)' }}>
              <Icon icon="lucide:file-question" style={{ fontSize: '2rem', marginBottom: 8 }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>Select a template to manage its questions</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon icon="lucide:file-question" /> {selected.name}
                  </h4>
                  {selected.description && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selected.description}</p>
                  )}
                </div>
                <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={newQuestion}>
                  <Icon icon="lucide:plus" /> Add Question
                </button>
              </div>

              {(!selected.questions || selected.questions.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-faint)' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>No questions in this template</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.questions.map((q, i) => (
                    <div key={q.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                      borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                      fontSize: '0.85rem',
                    }}>
                      <span style={{ color: 'var(--text-faint)', minWidth: 24, paddingTop: 2 }}>{i + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{q.question}</div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                          <span>Weight: {q.weight}</span>
                          <span>Max: {q.max_rating}</span>
                          <span>Category: {CATEGORY_LABELS[q.category] || q.category}</span>
                          <span>Order: {q.sort_order}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="glass-btn glass-btn-xs" onClick={() => editQuestion(q)}>
                          <Icon icon="lucide:edit" />
                        </button>
                        <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => handleDeleteQuestion(q.id)}
                          style={{ color: 'var(--error)' }}>
                          <Icon icon="lucide:trash-2" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Template Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowForm(false)}>
          <div className="glass-card" style={{ padding: 24, maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 16px' }}>New Template</h4>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Name *</label>
              <input className="glass-input" value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Description</label>
              <textarea className="glass-input" rows={2} value={templateForm.description} onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="glass-btn glass-btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={handleCreateTemplate} disabled={saving || !templateForm.name}>
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Question Modal */}
      {showQuestion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowQuestion(false); setEditingQuestion(null); }}>
          <div className="glass-card" style={{ padding: 24, maxWidth: 500, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 16px' }}>{editingQuestion ? 'Edit Question' : 'Add Question'}</h4>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Question *</label>
              <textarea className="glass-input" rows={2} value={questionForm.question} onChange={e => setQuestionForm(f => ({ ...f, question: e.target.value }))} style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Weight</label>
                <input className="glass-input" type="number" step="0.5" min="0.5" max="5"
                  value={questionForm.weight} onChange={e => setQuestionForm(f => ({ ...f, weight: parseFloat(e.target.value) || 1 }))} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Max Rating</label>
                <input className="glass-input" type="number" min="1" max="10"
                  value={questionForm.max_rating} onChange={e => setQuestionForm(f => ({ ...f, max_rating: parseInt(e.target.value) || 5 }))} style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Category</label>
                <select className="glass-select" value={questionForm.category} onChange={e => setQuestionForm(f => ({ ...f, category: e.target.value }))}
                  style={{ width: '100%' }}>
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Sort Order</label>
                <input className="glass-input" type="number" min="0"
                  value={questionForm.sort_order} onChange={e => setQuestionForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="glass-btn glass-btn-sm" onClick={() => { setShowQuestion(false); setEditingQuestion(null); }}>Cancel</button>
              <button className="glass-btn glass-btn-sm glass-btn-primary"
                onClick={editingQuestion ? handleUpdateQuestion : handleAddQuestion}
                disabled={saving || !questionForm.question}>
                {saving ? 'Saving...' : editingQuestion ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
