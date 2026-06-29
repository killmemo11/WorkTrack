// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../api/hrApi';

export default function IDCardModal({ employeeId, onClose }) {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrApi.get(`/employees/${employeeId}/id-card`)
      .then(res => setCard(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [employeeId]);

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>ID Card - ${card?.name}</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .id-card { width: 340px; border: 2px solid #1a1a2e; border-radius: 12px; padding: 24px; text-align: center; background: #fff; }
        .id-card .photo { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #1a1a2e; margin-bottom: 12px; }
        .id-card .photo-placeholder { width: 100px; height: 100px; border-radius: 50%; background: #e0e0e0; display: flex; align-items: center; justify-content: center; font-size: 36px; color: #999; margin: 0 auto 12px; border: 3px solid #1a1a2e; }
        .id-card h2 { margin: 4px 0; font-size: 20px; color: #1a1a2e; }
        .id-card .emp-id { color: #666; font-size: 14px; margin-bottom: 12px; }
        .id-card .info { text-align: left; font-size: 13px; line-height: 1.8; }
        .id-card .info strong { display: inline-block; width: 100px; }
        .id-card .dept { color: #3b82f6; font-size: 14px; margin: 4px 0; }
        .id-card .position { color: #666; font-size: 13px; margin-bottom: 12px; }
        .id-card .company { font-size: 11px; color: #999; margin-top: 16px; border-top: 1px solid #eee; padding-top: 8px; }
        @media print { body { margin: 0; } }
      </style></head><body>
      <div class="id-card">
        ${card.photo_url ? `<img class="photo" src="${card.photo_url}" />` : `<div class="photo-placeholder">${card.name?.[0]?.toUpperCase() || '?'}</div>`}
        <h2>${card.name}</h2>
        <div class="emp-id">${card.employee_id}</div>
        <div class="dept">${card.department}</div>
        <div class="position">${card.position}</div>
        <div class="info">
          <strong>Hire Date:</strong> ${card.hire_date}<br/>
          <strong>Contract:</strong> ${card.contract_type}<br/>
          <strong>Nationality:</strong> ${card.nationality}<br/>
          <strong>Gender:</strong> ${card.gender}<br/>
        </div>
        <div class="company">${card.company_name || ''}</div>
      </div>
      <script>window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  if (loading) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        {card && (
          <>
            <div style={{
              width: 300, margin: '0 auto', border: '2px solid #1a1a2e', borderRadius: 12, padding: 20, background: '#fff'
            }}>
              {card.photo_url
                ? <img src={card.photo_url} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #1a1a2e', marginBottom: 8 }} />
                : <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#999', margin: '0 auto 8px', border: '3px solid #1a1a2e' }}>{card.name?.[0]?.toUpperCase()}</div>}
              <h3 style={{ margin: '4px 0' }}>{card.name}</h3>
              <div style={{ color: '#666', fontSize: 13 }}>{card.employee_id}</div>
              <div style={{ color: '#3b82f6', fontSize: 14, margin: '4px 0' }}>{card.department}</div>
              <div style={{ color: '#666', fontSize: 13 }}>{card.position}</div>
              <div style={{ textAlign: 'left', fontSize: 12, lineHeight: 1.8, marginTop: 12 }}>
                <strong>Hire Date:</strong> {card.hire_date}<br />
                <strong>Contract:</strong> {card.contract_type}<br />
                <strong>Nationality:</strong> {card.nationality}<br />
                <strong>Birth Date:</strong> {card.birth_date}<br />
                <strong>Status:</strong> {card.status}
              </div>
              <div style={{ fontSize: 10, color: '#999', marginTop: 12, borderTop: '1px solid #eee', paddingTop: 6 }}>{card.company_name || ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handlePrint}>Print</button>
              <button className="btn btn-outline" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
