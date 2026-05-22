import React, { useState } from 'react';
import api from '../api';

export default function TimesheetPDFGenerator() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employeeId, setEmployeeId] = useState('1');
  const [period, setPeriod] = useState('current_week');

  const generate = () => {
    setLoading(true);
    setError('');
    api.get(`/custom-views/timesheet-pdf?employee_id=${employeeId}&period=${period}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  const downloadPDF = () => {
    if (!data?.pdf_base64) return;
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${data.pdf_base64}`;
    link.download = `timesheet_${data.employee_name.replace(/ /g, '_')}_${period}.pdf`;
    link.click();
  };

  return (
    <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' }}>
      <h3 style={{ color: '#e2e8f0', fontSize: 18, marginBottom: 16 }}>Timesheet PDF Generator</h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>Employee ID</label>
          <input value={employeeId} onChange={e => setEmployeeId(e.target.value)}
            style={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '8px 12px', borderRadius: 6, fontSize: 13 }} />
        </div>
        <div>
          <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 4 }}>Period</label>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
            <option value="current_week">Current Week</option>
            <option value="last_week">Last Week</option>
            <option value="bi_weekly">Bi-Weekly</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={generate} disabled={loading}
            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? 'Generating...' : 'Generate Timesheet'}
          </button>
        </div>
      </div>
      {error && <div style={{ color: '#ef4444', padding: 12, background: '#ef444422', borderRadius: 6, marginBottom: 12 }}>{error}</div>}
      {data && (
        <div style={{ background: '#0f172a', borderRadius: 8, padding: 16, border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 16 }}>{data.employee_name}</div>
              <div style={{ color: '#64748b', fontSize: 12 }}>{data.pay_period_start} → {data.pay_period_end}</div>
            </div>
            <button onClick={downloadPDF}
              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              Download PDF ({data.pdf_size_bytes} bytes)
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Day', 'Date', 'Client', 'Start', 'End', 'Hours'].map(h => (
                  <th key={h} style={{ color: '#94a3b8', padding: 8, textAlign: 'left', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ color: '#e2e8f0', padding: 8 }}>{e.day}</td>
                  <td style={{ color: '#94a3b8', padding: 8 }}>{e.date}</td>
                  <td style={{ color: '#e2e8f0', padding: 8 }}>{e.client}</td>
                  <td style={{ color: '#94a3b8', padding: 8 }}>{e.start}</td>
                  <td style={{ color: '#94a3b8', padding: 8 }}>{e.end}</td>
                  <td style={{ color: '#3b82f6', padding: 8, fontWeight: 600 }}>{e.hours}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #334155' }}>
                <td colSpan={5} style={{ padding: 8, color: '#94a3b8', textAlign: 'right', fontWeight: 600 }}>Total Hours / Gross Pay:</td>
                <td style={{ padding: 8, color: '#10b981', fontWeight: 700 }}>{data.summary.total_hours}h / ${data.summary.gross_pay}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
