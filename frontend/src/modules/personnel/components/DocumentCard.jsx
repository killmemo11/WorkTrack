// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import './styles/document-card.css';

export default function DocumentCard({ document, onPreview, onDelete }) {
  const [hover, setHover] = useState(false);
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

  const getFileExtension = (filePath) => {
    return filePath.split('.').pop().toUpperCase();
  };

  const getDocTypeColor = (type) => {
    const colors = {
      'contract': 'var(--color-primary)',
      'id_card': 'var(--color-success)',
      'passport': 'var(--color-warning)',
      'certificate': 'var(--color-info)',
      'other': 'var(--color-gray)'
    };
    return colors[type] || 'var(--color-gray)';
  };

  return (
    <div 
      className={`document-card ${hover ? 'hover' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="document-header">
        <div className="document-icon">
          <span style={{ color: getDocTypeColor(document.doc_type) }}>
            {getFileIcon(document.doc_type)}
          </span>
        </div>
        <div className="document-title">
          <h4>{document.doc_name}</h4>
          <span className="document-type" style={{ color: getDocTypeColor(document.doc_type) }}>
            {document.doc_type}
          </span>
        </div>
      </div>
      
      <div className="document-meta">
        <div className="document-info">
          <span className="file-ext">{getFileExtension(document.file_path)}</span>
          <span className="file-size">• {document.file_size || 'Unknown'}</span>
          <span className="upload-date">• {new Date(document.created_at).toLocaleDateString()}</span>
        </div>
        {document.notes && (
          <div className="document-notes">
            <span className="notes-label">Notes:</span>
            <span className="notes-text">{document.notes}</span>
          </div>
        )}
        {document.uploaded_by_name && (
          <div className="uploaded-by">
            Uploaded by: {document.uploaded_by_name}
          </div>
        )}
      </div>

      <div className="document-actions">
        <button 
          className="glass-btn glass-btn-sm glass-btn-ghost"
          onClick={() => onPreview(document)}
        >
          Preview
        </button>
        <button 
          className="glass-btn glass-btn-sm glass-btn-ghost"
          onClick={() => window.open(`/${document.file_path}`, '_blank')}
        >
          View
        </button>
        <button 
          className="glass-btn glass-btn-sm glass-btn-danger"
          onClick={() => onDelete(document.id)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}