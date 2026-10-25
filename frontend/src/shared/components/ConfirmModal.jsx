import { useId } from 'react';
import Icon from './Icon';
import useModalA11y from '../hooks/useModalA11y';
// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText, confirmClass }) {
  const titleId = useId();
  const dialogRef = useModalA11y(onCancel);

  return (
    <div className="glass-modal-overlay" onClick={onCancel}>
      <div
        className="glass-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-modal-header">
          <h3 className="glass-modal-title" id={titleId}>{title}</h3>
          <button type="button" className="glass-modal-close" onClick={onCancel} aria-label="Close dialog">
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
