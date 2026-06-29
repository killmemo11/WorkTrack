// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useRef } from 'react';
import hrApi from '../../../shared/api/hrApi';

export default function ProfileDocuments({ profile, onUpdate }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('contract');
  const [docName, setDocName] = useState('');
  const [notes, setNotes] = useState('');

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_type', docType);
    fd.append('doc_name', docName || file.name);
    if (notes) fd.append('notes', notes);
    await hrApi.post(`/employees/${profile.id}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setUploading(false);
    fileRef.current.value = '';
    setDocName('');
    setNotes('');
    onUpdate();
  }

  async function handleDelete(docId) {
    if (!confirm('Delete this document?')) return;
    await hrApi.delete(`/employees/${profile.id}/documents/${docId}`);
    onUpdate();
  }

  const docTypes = [
    { value: 'contract', label: 'Contract' },
    { value: 'id_card', label: 'ID Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="card">
      <div className="card-header"><h3>Documents</h3></div>
      <div className="card-body">
        <div className="upload-section">
          <h4>Upload Document</h4>
          <div className="form-row">
            <label>Type
              <select className="form-control" value={docType} onChange={e => setDocType(e.target.value)}>
                {docTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>
            <label>File Name
              <input className="form-control" value={docName} onChange={e => setDocName(e.target.value)} placeholder="Leave empty to use original name" />
            </label>
            <label>Notes
              <input className="form-control" value={notes} onChange={e => setNotes(e.target.value)} />
            </label>
            <label>File
              <input className="form-control" type="file" ref={fileRef} />
            </label>
          </div>
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading} style={{ marginTop: 8 }}>{uploading ? 'Uploading...' : 'Upload'}</button>
        </div>

        {profile.documents.length === 0 && <p className="text-muted" style={{ marginTop: 20 }}>No documents.</p>}
        {profile.documents.map(d => (
          <div key={d.id} className="list-item">
            <div><strong>{d.doc_name}</strong> <span className="badge badge-info">{d.doc_type}</span></div>
            <div className="text-muted">{d.notes || ''} {d.uploaded_by_name ? `| Uploaded by: ${d.uploaded_by_name}` : ''}</div>
            <div className="list-actions">
              <a className="btn btn-sm btn-outline" href={`/${d.file_path}`} target="_blank" rel="noopener noreferrer">View</a>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
