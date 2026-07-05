// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useRef, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import './styles/preview-modal.css';

export default function DocumentPreviewModal({ document, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (document && isOpen) {
      loadPreview();
    }
  }, [document, isOpen]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await hrApi.get(`/my-documents/${document.id}/preview`);
      setPreviewUrl(response.data.previewUrl);
    } catch (err) {
      setError('Failed to load preview');
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type) => {
    const icons = {
      'contract': '📄',
      'id_card': '🆔',
      'passport': '🛂',
      'certificate': '📜',
      'other': '📁'
    };
    return icons[type] || '📁';
  };

  const getMimeType = (filePath) => {
    const ext = filePath.split('.').pop().toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{document.doc_name}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading && <div className="loading-spinner">Loading preview...</div>}
          {error && <div className="error-message">{error}</div>}
          {previewUrl && (
            <div className="preview-container">
              {getMimeType(document.file_path).startsWith('image/') ? (
                <img src={`/${document.file_path}`} alt={document.doc_name} className="preview-image" />
              ) : getMimeType(document.file_path) === 'application/pdf' ? (
                <iframe src={`/${document.file_path}`} className="preview-iframe" title={document.doc_name} />
              ) : (
                <div className="file-preview-placeholder">
                  <div className="file-icon">{getFileIcon(document.doc_type)}</div>
                  <div className="file-info">
                    <div className="file-name">{document.doc_name}</div>
                    <div className="file-type">{getMimeType(document.file_path)}</div>
                  </div>
                  <button className="download-btn" onClick={() => window.open(`/${document.file_path}`, '_blank')}>
                    Download File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="glass-btn glass-btn-primary" onClick={() => window.open(`/${document.file_path}`, '_blank')}>
            Download
          </button>
          <button className="glass-btn glass-btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}