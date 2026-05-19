import React, { useState } from 'react';
import CaregiverScheduleTimeline from '../components/CaregiverScheduleTimeline';
import ClientCoverageHeatmap from '../components/ClientCoverageHeatmap';
import TimesheetPDFGenerator from '../components/TimesheetPDFGenerator';
import SchedulingRulesEditor from '../components/SchedulingRulesEditor';

const TABS = [
  { key: 'timeline', label: 'Caregiver Timeline', icon: '🕐', color: '#3b82f6' },
  { key: 'heatmap', label: 'Coverage Heatmap', icon: '🗺️', color: '#10b981' },
  { key: 'timesheet', label: 'Timesheet PDF', icon: '📄', color: '#f59e0b' },
  { key: 'rules', label: 'Scheduling Rules', icon: '⚙️', color: '#8b5cf6' },
];

export default function CustomViewsPage() {
  const [tab, setTab] = useState('timeline');

  return (
    <div style={{ padding: 24, minHeight: 'calc(100vh - 64px)', background: '#0f172a' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 800,
          background: 'linear-gradient(135deg, #3b82f6, #10b981, #f59e0b, #8b5cf6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 6,
        }}>IHSS Custom Views</h1>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>
          Specialized scheduling and coverage tools for in-home supportive services
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #334155', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? `${t.color}22` : 'transparent',
            color: tab === t.key ? t.color : '#94a3b8',
            border: 'none',
            borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
            padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            transition: 'all 0.2s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div data-testid={`custom-view-${tab}`}>
        {tab === 'timeline' && <CaregiverScheduleTimeline />}
        {tab === 'heatmap' && <ClientCoverageHeatmap />}
        {tab === 'timesheet' && <TimesheetPDFGenerator />}
        {tab === 'rules' && <SchedulingRulesEditor />}
      </div>
    </div>
  );
}
