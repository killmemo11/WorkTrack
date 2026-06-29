// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText, confirmClass }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className={confirmClass || 'btn btn-danger'} onClick={onConfirm}>{confirmText || 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}