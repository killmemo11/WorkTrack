// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import hrApi from '../../../shared/api/hrApi';


export default function BulkProfiles() {
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function handleExport() {
    try {
      const response = await hrApi.get('/profiles/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'employee-profiles.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Template downloaded' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to export' });
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await hrApi.post('/profiles/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      let msg = data.message;
      if (data.errors) msg += `. Errors: ${data.errors.slice(0, 5).join('; ')}`;
      setMessage({ type: data.errors ? 'error' : 'success', text: msg });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Import failed' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <>
      <div className="page-header"><h2>Bulk Profile Management</h2></div>
      {message && <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>{message.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header"><h3>Export Template</h3></div>
          <div className="card-body">
            <p className="text-muted">Download an Excel file with all employees and their profile fields.</p>
            <p className="text-muted" style={{ marginTop: 8 }}>Fill in the data and upload it back using the Import section.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleExport}>Download Excel Template</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Import Profiles</h3></div>
          <div className="card-body">
            <p className="text-muted">Upload the filled Excel file to update employee profiles in bulk.</p>
            <label className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex', cursor: 'pointer' }}>
              {uploading ? 'Uploading...' : 'Upload Excel File'}
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} disabled={uploading} />
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Instructions</h3></div>
        <div className="card-body">
          <ol style={{ paddingLeft: 20, lineHeight: 2, color: '#555' }}>
            <li>Click <strong>Download Excel Template</strong> to get a file with all registered employees.</li>
            <li>Open the file in Excel or Google Sheets.</li>
            <li><strong>Profiles sheet:</strong> Fill in the profile fields for each employee (all fields are optional).</li>
            <li><strong>SalaryComponents sheet:</strong> Add/edit salary components (employee_id, component_name, amount). Rows with the same employee_id + component_name will update; new ones will be added.</li>
            <li>Save the file and upload it using the <strong>Upload Excel File</strong> button.</li>
            <li>The system will update each employee&apos;s profile and salary components automatically.</li>
          </ol>
        </div>
      </div>
    </>
  );
}
