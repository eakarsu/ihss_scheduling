import React, { useState, useEffect } from 'react';
import api from '../api';

export default function CaregiverScheduleTimeline() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/custom-views/caregiver-schedule-timeline')
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#94a3b8' }}>Loading timeline...</div>;
  if (error) return <div style={{ padding: 20, color: '#ef4444' }}>Error: {error}</div>;
  if (!data) return null;

  const HOUR_START = data.hour_range.start;
  const HOUR_END = data.hour_range.end;
  const totalHours = HOUR_END - HOUR_START;
  const HOUR_PX = 50;

  return (
    <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h3 style={{ color: '#e2e8f0', fontSize: 18 }}>Caregiver Schedule Timeline — {data.date}</h3>
        <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#94a3b8' }}>
          <span>Caregivers: <strong style={{ color: '#3b82f6' }}>{data.summary.total_caregivers}</strong></span>
          <span>Shifts: <strong style={{ color: '#10b981' }}>{data.summary.total_shifts}</strong></span>
          <span>Hours: <strong style={{ color: '#f59e0b' }}>{data.summary.total_hours}</strong></span>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 200 + totalHours * HOUR_PX }}>
          {/* Hour ruler */}
          <div style={{ display: 'flex', borderBottom: '1px solid #334155', paddingBottom: 8, marginBottom: 8 }}>
            <div style={{ width: 200, color: '#64748b', fontSize: 12, fontWeight: 600 }}>Caregiver</div>
            <div style={{ position: 'relative', flex: 1, height: 20 }}>
              {Array.from({ length: totalHours + 1 }).map((_, i) => (
                <div key={i} style={{
                  position: 'absolute', left: i * HOUR_PX, color: '#64748b', fontSize: 11,
                  borderLeft: '1px solid #334155', paddingLeft: 4, height: 20,
                }}>{HOUR_START + i}:00</div>
              ))}
            </div>
          </div>
          {/* Caregiver rows */}
          {data.caregivers.map(cg => (
            <div key={cg.caregiver_id} style={{ display: 'flex', alignItems: 'center', marginBottom: 10, height: 40 }}>
              <div style={{ width: 200, color: '#e2e8f0', fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>{cg.caregiver_name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{cg.shift_count} shifts · {cg.total_hours}h</div>
              </div>
              <div style={{ position: 'relative', flex: 1, height: 36, background: '#0f172a', borderRadius: 6 }}>
                {cg.shifts.map(sh => {
                  const startH = parseInt(sh.start_time.split(':')[0]);
                  const endH = parseInt(sh.end_time.split(':')[0]);
                  const left = (startH - HOUR_START) * HOUR_PX;
                  const width = (endH - startH) * HOUR_PX;
                  return (
                    <div key={sh.shift_id} title={`${sh.client_name} — ${sh.care_type}`} style={{
                      position: 'absolute', left, width, top: 2, height: 32,
                      background: sh.color, borderRadius: 4, padding: '4px 6px',
                      color: '#fff', fontSize: 10, overflow: 'hidden',
                    }}>
                      <div style={{ fontWeight: 600 }}>{sh.client_name}</div>
                      <div style={{ opacity: 0.85 }}>{sh.start_time}-{sh.end_time}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
