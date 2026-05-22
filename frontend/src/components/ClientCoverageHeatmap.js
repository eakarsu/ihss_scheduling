import React, { useState, useEffect } from 'react';
import api from '../api';

export default function ClientCoverageHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/custom-views/client-coverage-heatmap')
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#94a3b8' }}>Loading heatmap...</div>;
  if (error) return <div style={{ padding: 20, color: '#ef4444' }}>Error: {error}</div>;
  if (!data) return null;

  const colorFor = (pct) => {
    if (pct >= 95) return '#10b981';
    if (pct >= 80) return '#22c55e';
    if (pct >= 70) return '#eab308';
    if (pct >= 50) return '#f97316';
    return '#ef4444';
  };

  return (
    <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h3 style={{ color: '#e2e8f0', fontSize: 18 }}>Client Coverage Heatmap</h3>
        <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#94a3b8' }}>
          <span>Avg: <strong style={{ color: '#3b82f6' }}>{data.summary.avg_coverage_pct}%</strong></span>
          <span>Full: <strong style={{ color: '#10b981' }}>{data.summary.full_coverage}</strong></span>
          <span>Gaps: <strong style={{ color: '#ef4444' }}>{data.summary.gaps}</strong></span>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4 }}>
          <thead>
            <tr>
              <th style={{ color: '#64748b', fontSize: 12, padding: 6, textAlign: 'left' }}>Client / Day</th>
              {data.days.map(d => (
                <th key={d} style={{ color: '#64748b', fontSize: 12, padding: 6, minWidth: 60 }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row, i) => (
              <tr key={i}>
                <td style={{ color: '#e2e8f0', fontSize: 13, padding: 6, fontWeight: 500 }}>{data.clients[i]}</td>
                {row.map((cell, j) => (
                  <td key={j} title={`${cell.scheduled_hours}h / ${cell.required_hours}h required`} style={{
                    background: colorFor(cell.coverage_pct),
                    color: '#fff', textAlign: 'center', borderRadius: 6,
                    padding: 8, fontWeight: 600, fontSize: 12, minWidth: 60,
                    opacity: 0.4 + (cell.coverage_pct / 200),
                  }}>
                    {cell.coverage_pct}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8' }}>
        <span><span style={{ background: '#10b981', padding: '2px 8px', borderRadius: 3, marginRight: 4 }}>&nbsp;</span> Full (≥95%)</span>
        <span><span style={{ background: '#eab308', padding: '2px 8px', borderRadius: 3, marginRight: 4 }}>&nbsp;</span> Partial</span>
        <span><span style={{ background: '#ef4444', padding: '2px 8px', borderRadius: 3, marginRight: 4 }}>&nbsp;</span> Gap</span>
      </div>
    </div>
  );
}
