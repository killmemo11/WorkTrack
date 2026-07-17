// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import hrApi from '../../../shared/api/hrApi';
import ConfirmModal from '../../../shared/components/ConfirmModal';
import RichTextEditor from '../../../shared/components/RichTextEditor';
import { sanitizeHTML } from '../../../shared/utils/sanitize';

export default function ContractTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'permanent', content_html: '', placeholders: '' });
  const [confirm, setConfirm] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewName, setPreviewName] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await hrApi.get('/contract-templates');
      setTemplates(res.data);
    } catch (err) {
      setMessage('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({
      name: '',
      type: 'permanent',
      content_html: `<div style="font-family: 'Traditional Arabic', Arial, sans-serif; direction: rtl; padding: 20px;">
<h2 style="text-align: center;">عقد عمل محدد المدة</h2>
<p style="text-align: center;">أنه فى يوم ........... الموافق  ...../....../    20</p>
<p>قد تم الاتفاق والتراضى بين كل من:-</p>
<p><strong>الطرف الأول:</strong> {{company_name}} – الكائن مقرها {{company_address}} ويمثلها فى هذا العقد السيد الأستاذ/ {{company_representative}}.</p>
<p><strong>الطرف الثانى:</strong> الأستاذ/ {{name}} – بطاقة رقم قومي ({{national_id}}) صادرة في {{national_id_place}} والمقيم فى {{address}}.</p>
<h3>تم الاتفاق على ما يلى:-</h3>
<p><strong>أولاً:</strong> يعمل الطرف الثانى لدى الطرف الأولى فى وظيفة {{position}} بإدارة {{department}}، وقد حددت مدة هذا العقد بسنة ميلادية تبدأ إعتبارا من {{start_date}} وتنتهى فى {{end_date}} دون الحاجة إلى تنبيه أو إنذار ولا تجدد تلقائياً ما لم يتفق الطرفان على التجديد كتابياً قبل إنتهاء مدة هذا العقد بشهر على الأقل.</p>
<p><strong>ثانياً:</strong> يعتبر الطرف الثاني معينا تحت الاختبار لمدة ثلاثة أشهر وفى خلال هذه الفترة أو عند انتهائها يكون للطرف الأول الحق في إنهاء أو فسخ هذا العقد فى أي وقت خلال مدته ودون دفع أي مبالغ بصفة تعويض أو مكافأة بعد إخطار الطرف الثانى بذلك قبل التاريخ المحدد للإنهاء أو الفسخ بشهر على الاقل.</p>
<p><strong>ثالثاً:</strong> يعمل الطرف الثانى لدى الطرف الأول بمحل العمل الذى يحدده الطرف الأول وذلك بأجر شهرى شامل قدره {{salary}} جنيه مصري (فقط {{salary_text}} جنيه مصري لاغير) قبل الاستقطاعات.</p>
<p><strong>رابعاً:</strong> يوافق الطرف الثانى صراحة على إجمالى المرتب أعلاه ويلتزم بالقيام بعمله المكلف به وواجباته على أكمل وجه ويلتزم بتنفيذ القواعد والنظم الواردة بلوائح الشركة وما توجبه أحكام قانون العمل رقم (14) لسنة 2025.</p>
<p><strong>خامساً:</strong> يقر الطرف الثانى بأنه لا يعمل لدى أي جهة حكومية أو غير حكومية، بأجر أو بدون أجر كما يتعهد بأن لا يعمل لدى الغير بأجر أو بدون أجر إلا بعد الحصول على الموافقة الكتابية المسبقة من الشركة.</p>
<p><strong>سادساً:</strong> يقر الطرف الثانى بأنه مسئول عن صحة البيانات وسلامة المستندات المقدمة للشركة ويتعهد بإخطار الطرف الاول فوراً بأى تغيير يطرأ عليها.</p>
<p><strong>سابعاً:</strong> يلتزم الطرف الثانى بالحفاظ على سرية المعلومات التى تصل إلى علمه بحكم عمله بالشركة وبعدم إفشاء هذه المعلومات.</p>
<p><strong>ثامناً:</strong> أى نزاع ينشأ فيما يتعلق أو يتصل بهذا العقد سيتم تسويته وحله عن طريق المحاكم المصرية بالقاهرة.</p>
<p><strong>تاسعاً:</strong> تحرر هذا العقد من أربع نسخ لكل طرف نسخة والثالثة ترسل لمكتب التامينات الاجتماعية والرابعة لمكتب العمل.</p>
<br/>
<table style="width: 100%;">
<tr>
<td style="text-align: center; width: 50%;"><strong>الطرف الأول</strong><br/>{{company_name}}<br/><br/>الاسم: {{company_representative}}<br/>التوقيع: ................</td>
<td style="text-align: center; width: 50%;"><strong>الطرف الثانى</strong><br/>{{name}}<br/><br/>التوقيع: ................</td>
</tr>
</table>
<br/>
<p style="text-align: center; font-size: 12px;">إدارة الموارد البشرية – HUMAN RESOURCES DEPARTMENT</p>
<p style="text-align: center; font-size: 12px;">نموذج عقد عمل محدد المدة – Definite Employment Contract</p>
</div>`,
      placeholders: 'company_name: الشركة المصرية لضمان الصادرات\ncompany_address: 5 طريق النصر – مدينة نصر – الدور الرابع\ncompany_representative: رئيس مجلس الإدارة\nnational_id: 12345678901234\nnational_id_place: القاهرة\nsalary: 5000\nsalary_text: خمسة آلاف'
    });
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditId(t.id);
    let placeholdersStr = '';
    if (t.placeholders) {
      try { const p = typeof t.placeholders === 'string' ? JSON.parse(t.placeholders) : t.placeholders; placeholdersStr = Object.entries(p).map(([k, v]) => `${k}: ${v}`).join('\n'); } catch (e) {}
    }
    setForm({ name: t.name, type: t.type, content_html: t.content_html, placeholders: placeholdersStr });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.content_html.trim()) { setMessage('Name and content are required'); setTimeout(() => setMessage(''), 3000); return; }
    let placeholdersObj = null;
    if (form.placeholders.trim()) {
      placeholdersObj = {};
      form.placeholders.split('\n').filter(Boolean).forEach(line => {
        const [k, ...v] = line.split(':');
        if (k && v.length) placeholdersObj[k.trim()] = v.join(':').trim();
      });
    }
    try {
      if (editId) {
        await hrApi.put(`/contract-templates/${editId}`, { ...form, placeholders: placeholdersObj });
        setMessage('Template updated');
      } else {
        await hrApi.post('/contract-templates', { ...form, placeholders: placeholdersObj });
        setMessage('Template created');
      }
      setShowForm(false);
      fetchTemplates();
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = async (id) => {
    try { await hrApi.delete(`/contract-templates/${id}`); setMessage('Deleted'); fetchTemplates(); } catch (err) { setMessage('Failed'); }
    setConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const openPreview = (t) => {
    setPreviewName(t.name);
    setPreviewContent(t.content_html);
  };

  if (loading) return <div className="glass-loading"><div className="spinner"/><span>Loading...</span></div>;

  return (
      <div className="page">
        <div className="glass-page-header">
          <div>
            <h1>Contract Templates</h1>
            <p className="subtitle" style={{color:'var(--text-dim)'}}>Manage employment contract templates with auto-fill placeholders</p>
          </div>
          <button className="glass-btn glass-btn-primary" onClick={openCreate}><Icon icon="lucide:file-plus" /> New Template</button>
        </div>

        {message && <div className={`glass-alert ${message.includes('Failed') ? 'glass-alert-danger' : 'glass-alert-success'}`}>{message}</div>}

        <div className="glass-table-wrapper fade-in-up">
          {templates.length === 0 ? (
            <div className="glass-empty"><Icon icon="lucide:file-text" /><p>No templates yet.</p></div>
          ) : (
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.name}</strong></td>
                    <td><span className="glass-badge glass-badge-info">{t.type}</span></td>
                    <td>{t.is_active ? <span className="glass-badge glass-badge-success">Active</span> : <span className="glass-badge glass-badge-default">Inactive</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => openEdit(t)}><Icon icon="lucide:pencil" /></button>
                        <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => openPreview(t)}><Icon icon="lucide:eye" /></button>
                        <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => setConfirm({ action: () => handleDelete(t.id), label: `Delete "${t.name}"?` })}><Icon icon="lucide:trash-2" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showForm && (
          <div className="glass-modal-overlay" onClick={() => setShowForm(false)}>
            <div className="glass-modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <button className="glass-modal-close" onClick={() => setShowForm(false)}><Icon icon="lucide:x" /></button>
              <h3>{editId ? 'Edit Template' : 'New Template'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass-form-group">
                  <label>Name *</label>
                  <input className="glass-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="glass-form-group">
                  <label>Type</label>
                  <select className="glass-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="permanent">Permanent</option>
                    <option value="annual">Annual</option>
                    <option value="probation">Probation</option>
                    <option value="contractor">Contractor</option>
                  </select>
                </div>
              </div>
              <div className="glass-form-group">
                <label>Content (HTML with placeholders)</label>
                <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                  Placeholders: {'{{name}}'}, {'{{position}}'}, {'{{department}}'}, {'{{salary}}'}, {'{{start_date}}'}, {'{{end_date}}'}, {'{{hire_date}}'}, {'{{employee_id}}'}, {'{{email}}'}, {'{{phone}}'}, {'{{nationality}}'}, {'{{national_id}}'}, {'{{address}}'}, {'{{bank_name}}'}, {'{{bank_account}}'}, {'{{company_name}}'}, {'{{company_address}}'}, {'{{company_representative}}'}, {'{{salary_text}}'}, {'{{contract_type}}'}, {'{{day}}'}, {'{{month}}'}, {'{{year}}'}
                </p>
                <RichTextEditor value={form.content_html} onChange={v => setForm({...form, content_html: v})} placeholder="Write your contract template here..." />
              </div>
              <div className="glass-form-group">
                <label>Custom Placeholders (one per line: key: value)</label>
                <textarea className="glass-textarea" rows="3" value={form.placeholders} onChange={e => setForm({...form, placeholders: e.target.value})} placeholder="company_name: Your Company&#10;manager_name: Ahmed" />
              </div>
              <div className="glass-modal-footer">
                <button className="glass-btn glass-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="glass-btn glass-btn-primary" onClick={handleSave}>{editId ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {previewContent && (
          <div className="glass-modal-overlay" onClick={() => setPreviewContent(null)}>
            <div className="glass-modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
              <button className="glass-modal-close" onClick={() => setPreviewContent(null)}><Icon icon="lucide:x" /></button>
              <h3>Preview: {previewName}</h3>
              <div className="glass-card" style={{ padding: 24 }} dangerouslySetInnerHTML={{ __html: sanitizeHTML(previewContent) }} />
              <div className="glass-modal-footer">
                <button className="glass-btn glass-btn-ghost" onClick={() => setPreviewContent(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {confirm && <ConfirmModal message={confirm.label} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
      </div>
  );
}
