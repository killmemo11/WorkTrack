// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useRef, useCallback } from 'react';
import hrApi from '../../../shared/api/hrApi';
import './styles/enhanced-upload.css';

export default function EnhancedUploadComponent({ profile, onUploadComplete }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [docType, setDocType] = useState('contract');
  const [docName, setDocName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not supported. Supported types: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX, PPT, PPTX');
    }

    return true;
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleFileSelect = (file) => {
    try {
      validateFile(file);
      fileRef.current.files = e.dataTransfer.files;
      setUploadProgress(0);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        validateFile(file);
        setUploadProgress(0);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setUploading(true);
      setUploadProgress(0);

      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', docType);
      fd.append('doc_name', docName || file.name);
      if (notes) fd.append('notes', notes);

      const config = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        }
      };

      await hrApi.post(`/employees/${profile.id}/documents`, fd, config);
      
      setUploading(false);
      setUploadProgress(0);
      fileRef.current.value = '';
      setDocName('');
      setNotes('');
      onUploadComplete();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const docTypes = [
    { value: 'contract', label: 'Contract' },
    { value: 'id_card', label: 'ID Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'certificate', label: 'Certificate' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className={`upload-container ${dragActive ? 'drag-active' : ''}`}>
      <div className="upload-area" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
        <input
          type="file"
          ref={fileRef}
          onChange={handleFileChange}
          className="file-input"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        />
        <div className="upload-placeholder">
          <div className="upload-icon">📁</div>
          <div className="upload-text">
            <p>Drag & drop files here, or click to select</p>
            <p className="upload-subtext">Supports: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX, PPT, PPTX (Max 10MB)</p>
          </div>
        </div>
      </div>

      <div className="upload-form">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label>Type
            <select className="glass-form-control" value={docType} onChange={e => setDocType(e.target.value)}>
              {docTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>
          <label>File Name
            <input className="glass-form-control" value={docName} onChange={e => setDocName(e.target.value)} placeholder="Leave empty to use original name" />
          </label>
          <label>Notes
            <input className="glass-form-control" value={notes} onChange={e => setNotes(e.target.value)} />
          </label>
        </div>

        {error && <div className="error-message">{error}</div>}

        {uploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <span className="progress-text">{uploadProgress}%</span>
          </div>
        )}

        <button 
          className="glass-btn glass-btn-primary" 
          onClick={handleUpload} 
          disabled={uploading || !fileRef.current?.files?.[0]}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
}