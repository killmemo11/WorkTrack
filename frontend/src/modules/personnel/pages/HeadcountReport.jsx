// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';


export default function HeadcountReport() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    hrApi.get('/reports/headcount').then(r => setReport(r.data)).catch(() => {});
  }, []);

  if (!report) return <div className="loading">Loading...</div>;

  return (
    <>
      <div className="page-header"><h2>Headcount Report</h2></div>

      <div className="card">
        <div className="card-header"><h3>By Department</h3></div>
        <div className="card-body">
          <table className="table">
            <thead><tr><th>Department</th><th>Count</th></tr></thead>
            <tbody>
              {report.byDepartment.map(d => (
                <tr key={d.id}><td>{d.name}</td><td><strong>{d.count}</strong></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>By Position</h3></div>
        <div className="card-body">
          <table className="table">
            <thead><tr><th>Position</th><th>Department</th><th>Count</th></tr></thead>
            <tbody>
              {report.byPosition.map(p => (
                <tr key={p.id}><td>{p.title}</td><td>{p.department_name || <span className="text-muted">—</span>}</td><td><strong>{p.count}</strong></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>By Contract Type</h3></div>
        <div className="card-body">
          <table className="table">
            <thead><tr><th>Contract Type</th><th>Count</th></tr></thead>
            <tbody>
              {report.byContract.map(c => (
                <tr key={c.contract_type}><td>{c.contract_type}</td><td><strong>{c.count}</strong></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
