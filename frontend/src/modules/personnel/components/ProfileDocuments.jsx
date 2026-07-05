import { useState, useEffect, useRef, useCallback } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ProfileSection from './ProfileSection';
import '../styles/profile.css';

const DOC_TYPE_CONFIG = {
  contract:  { label: 'Contract',  icon: '📄', color: '#818cf8' },
  id_card:   { label: 'ID Card',   icon: '🆔', color: '#4ade80' },
  passport:  { label: 'Passport',  icon: '🛂', color: '#fbbf24' },
  certificate: { label: 'Certificate', icon: '📜', color: '#60a5fa' },
  other:     { label: 'Other',     icon: '📁', color: '#a1a1aa' },
};

const getExt = (path) => (path || '').split('.').pop().toUpperCase();
const getIcon = (type) => DOC_TYPE_CONFIG[type]?.icon || '📁';
const getColor = (type) => DOC_TYPE_CONFIG[type]?.color || '#a1a1aa';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function ProfileDocuments({ profile, onUpdate }) {
  const [documents, setDocuments] = useState(profile.documents || []);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const [uploadType, setUploadType] = useState('contract');
  const [uploadName, setUploadName] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    setDocuments(profile.documents || []);
  }, [profile.documents]);

  useEffect(() => {
    if (!loading) return;
    setDocuments(profile.documents || []);
    setLoading(false);
  }, [profile.documents, loading]);

  // --- Filtering & Sorting ---
  const filtered = documents.filter(d => {
    if (filter !== 'all' && d.doc_type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return d.doc_name.toLowerCase().includes(q) || (d.notes || '').toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const stats = {
    total: documents.length,
    contract: documents.filter(d => d.doc_type === 'contract').length,
    id_card: documents.filter(d => d.doc_type === 'id_card').length,
    passport: documents.filter(d => d.doc_type === 'passport').length,
    certificate: documents.filter(d => d.doc_type === 'certificate').length,
    other: documents.filter(d => d.doc_type === 'other').length,
  };

  // --- Upload ---
  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', uploadType);
      fd.append('doc_name', uploadName || file.name);
      const config = { headers: { 'Content-Type': 'multipart/form-data' }, onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)) };
      await hrApi.post(`/employees/${profile.id}/documents`, fd, config);
      fileRef.current.value = '';
      setUploadName('');
      setShowUpload(false);
      setLoading(true);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try {
      await hrApi.delete(`/employees/${profile.id}/documents/${docId}`);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      onUpdate();
    } catch {}
  };

  const handleDrag = useCallback(e => {
    e.preventDefault();
    setDragOver(e.type === 'dragover');
  }, []);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) {
      fileRef.current.files = e.dataTransfer.files;
      if (!showUpload) setShowUpload(true);
    }
  }, [showUpload]);

  // --- Document Card ---
  const DocumentCard = ({ doc, index }) => (
    <div className="doc-card doc-stagger-enter" onClick={() => setPreview(doc)} style={{ animationDelay: `${index * 60}ms` }}>
      <div className="doc-card-top">
        <div className="doc-card-icon" style={{ background: `${getColor(doc.doc_type)}15` }}>
          {getIcon(doc.doc_type)}
        </div>
        <div className="doc-card-info">
          <h4 className="doc-card-name">{doc.doc_name}</h4>
          <div className="doc-card-meta">
            <span className={`doc-card-badge doc-card-badge-${doc.doc_type}`}>{DOC_TYPE_CONFIG[doc.doc_type]?.label || doc.doc_type}</span>
            {doc.file_path && <span className="doc-card-extension">{getExt(doc.file_path)}</span>}
          </div>
        </div>
      </div>
      <div className="doc-card-bottom">
        <span className="doc-card-date">{fmtDate(doc.created_at)}</span>
        <div className="doc-card-actions">
          <button className="doc-card-action" onClick={(e) => { e.stopPropagation(); window.open(`/${doc.file_path}`, '_blank'); }} title="Download">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button className="doc-card-action doc-card-action-danger" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} title="Delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  );

  // --- List Item ---
  const ListItem = ({ doc, index }) => (
    <div className="doc-list-item doc-stagger-enter" onClick={() => setPreview(doc)} style={{ animationDelay: `${index * 40}ms` }}>
      <div className="doc-list-icon" style={{ background: `${getColor(doc.doc_type)}15` }}>
        {getIcon(doc.doc_type)}
      </div>
      <div className="doc-list-info">
        <div className="doc-list-name">{doc.doc_name}</div>
        <div className="doc-list-meta">
          <span>{DOC_TYPE_CONFIG[doc.doc_type]?.label || doc.doc_type}</span>
          {doc.file_path && <span>{getExt(doc.file_path)}</span>}
          <span>{fmtDate(doc.created_at)}</span>
          {doc.uploaded_by_name && <span>by {doc.uploaded_by_name}</span>}
        </div>
      </div>
      <div className="doc-list-actions">
        <button className="profile-btn profile-btn-xs profile-btn-ghost" onClick={(e) => { e.stopPropagation(); window.open(`/${doc.file_path}`, '_blank'); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button className="profile-btn profile-btn-xs profile-btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}>Delete</button>
      </div>
    </div>
  );

  // --- Preview Modal ---
  const PreviewModal = () => {
    if (!preview) return null;
    const ext = getExt(preview.file_path);
    const isImage = ['JPG','JPEG','PNG','GIF','WEBP'].includes(ext);
    const isPdf = ext === 'PDF';

    return (
      <div className="doc-preview-overlay" onClick={() => setPreview(null)}>
        <div className="doc-preview-modal" onClick={e => e.stopPropagation()}>
          <div className="doc-preview-header">
            <div className="doc-preview-header-left">
              <span style={{ fontSize: 20 }}>{getIcon(preview.doc_type)}</span>
              <h3>{preview.doc_name}</h3>
            </div>
            <div className="doc-preview-header-right">
              <a className="profile-btn profile-btn-primary profile-btn-sm" href={`/${preview.file_path}`} target="_blank" rel="noopener noreferrer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download
              </a>
              <button className="profile-btn profile-btn-ghost profile-btn-sm" onClick={() => setPreview(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Close
              </button>
            </div>
          </div>
          <div className="doc-preview-body">
            {isImage ? (
              <img src={`/${preview.file_path}`} alt={preview.doc_name} />
            ) : isPdf ? (
              <iframe src={`/${preview.file_path}#view=FitH`} title={preview.doc_name} />
            ) : (
              <div className="doc-preview-placeholder">
                <div className="doc-card-icon" style={{ background: `${getColor(preview.doc_type)}15`, width: 64, height: 64, fontSize: 32, margin: '0 auto 16px' }}>
                  {getIcon(preview.doc_type)}
                </div>
                <h4>{preview.doc_name}</h4>
                <p>Preview not available for {ext} files. Download to view.</p>
                <a className="profile-btn profile-btn-primary" href={`/${preview.file_path}`} target="_blank" rel="noopener noreferrer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download File
                </a>
              </div>
            )}
          </div>
          {isImage && (
            <div className="doc-preview-footer">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>
                {preview.doc_name} · {ext}
              </span>
              {preview.notes && <span style={{ fontSize: '0.8rem', color: 'var(--text-faint)' }}>{preview.notes}</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Render ---
  return (
    <>
      <ProfileSection
        title="Documents"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
      >
        {/* Stats Bar */}
        <div className="documents-stats">
          <div className="documents-stat" onClick={() => setFilter('all')} style={{ cursor: 'pointer', borderColor: filter === 'all' ? 'rgba(99,102,241,0.3)' : undefined }}>
            All <span className="documents-stat-count">{stats.total}</span>
          </div>
          {Object.entries(DOC_TYPE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="documents-stat" onClick={() => setFilter(key)} style={{ cursor: 'pointer', borderColor: filter === key ? `${cfg.color}40` : undefined }}>
              {cfg.icon} {cfg.label} <span className="documents-stat-count">{stats[key] || 0}</span>
            </div>
          ))}
        </div>

        {/* Search + Upload + View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div className="doc-search" style={{ margin: 0, flex: 1 }}>
            <svg className="doc-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="doc-search-input" type="text" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="documents-upload-toggle" onClick={() => setShowUpload(!showUpload)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {showUpload ? 'Cancel' : 'Upload'}
          </button>
          <div className="documents-view-toggle">
            <button className={`documents-view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Grid
            </button>
            <button className={`documents-view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              List
            </button>
          </div>
        </div>

        {/* Upload Area */}
        {showUpload && (
          <div className="doc-upload-area" style={{ animation: 'slideDown 300ms ease' }}
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}>
            <input type="file" ref={fileRef} onChange={() => {}} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
            {dragOver ? (
              <>
                <span className="doc-upload-icon" style={{ transform: 'translateY(-4px)' }}>📥</span>
                <div className="doc-upload-title">Drop file here</div>
              </>
            ) : (
              <>
                <span className="doc-upload-icon">📁</span>
                <div className="doc-upload-title">Drag & drop or click to upload</div>
                <div className="doc-upload-hint">PDF, JPG, PNG, DOC, DOCX, XLS, XLSX, PPT, PPTX (max 10MB)</div>
              </>
            )}
          </div>
        )}

        {/* Upload Form */}
        {showUpload && (
          <div className="doc-upload-form">
            <label>Type
              <select className="profile-field-input" value={uploadType} onChange={e => setUploadType(e.target.value)}>
                {Object.entries(DOC_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label>File Name
              <input className="profile-field-input" value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Leave empty for original" />
            </label>
            <label className="doc-upload-full">Selected File
              <input className="profile-field-input" type="text" value={fileRef.current?.files?.[0]?.name || ''} placeholder="No file selected" disabled />
            </label>
            {error && <div className="profile-message profile-message-error" style={{ gridColumn: '1/-1', margin: 0 }}>{error}</div>}
            {uploading && (
              <div className="doc-upload-progress">
                <div className="doc-upload-bar"><div className="doc-upload-fill" style={{ width: `${progress}%` }} /></div>
                <div className="doc-upload-percent">{progress}%</div>
              </div>
            )}
            <button className="profile-btn profile-btn-primary" style={{ gridColumn: '1/-1', justifySelf: 'start' }} onClick={handleUpload} disabled={uploading || !fileRef.current?.files?.[0]}>
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        )}

        {/* Documents List / Grid */}
        {loading ? (
          <div className="doc-skeleton">
            {[1,2,3,4].map(i => <div key={i} className="doc-skeleton-card" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="doc-empty">
            <span className="doc-empty-icon">📁</span>
            <h4>{search || filter !== 'all' ? 'No matching documents' : 'No documents yet'}</h4>
            <p>{search || filter !== 'all' ? 'Try adjusting your search or filters' : 'Upload your first document to get started'}</p>
          </div>
        ) : view === 'grid' ? (
          <div className="documents-grid">
            {filtered.map((d, i) => <DocumentCard key={d.id} doc={d} index={i} />)}
          </div>
        ) : (
          <div className="documents-list">
            {filtered.map((d, i) => <ListItem key={d.id} doc={d} index={i} />)}
          </div>
        )}
      </ProfileSection>

      {preview && <PreviewModal />}
    </>
  );
}
