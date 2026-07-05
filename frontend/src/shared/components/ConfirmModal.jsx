import Icon from './Icon';
// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText, confirmClass }) {
  return (
    <div className="glass-modal-overlay" onClick={onCancel}>
      <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
        <div className="glass-modal-header">
          <h3 className="glass-modal-title">{title}</h3>
          <button className="glass-modal-close" onClick={onCancel}>
            <Icon icon="lucide:x" />
          </button>
        </div>
        <div className="glass-modal-body">
          <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
        </div>
        <div className="glass-modal-footer">
          <button className="glass-btn glass-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={confirmClass || 'glass-btn glass-btn-danger'} onClick={onConfirm}>
            {confirmText || 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}