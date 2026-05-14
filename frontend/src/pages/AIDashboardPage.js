import React, { useState } from 'react';
import api from '../api';
import AIResponseDisplay from '../components/AIResponseDisplay';

const SAMPLE_FORECAST = `{
  "store_name": "Store #142",
  "predicted_traffic": 4830,
  "predicted_sales": 92500,
  "recommended_staff": 22,
  "confidence_level": "high"
}`;

const SAMPLE_TURNOVER = `[
  { "employee_id": "E-1042", "store": "Store #142", "risk_pct": 78, "trend": "worsening" },
  { "employee_id": "E-1099", "store": "Store #142", "risk_pct": 42, "trend": "stable" }
]`;

const SAMPLE_COMPLIANCE = `[
  { "store": "Store #142", "rule": "CA daily OT", "likelihood": "high", "shift_id": 5512 },
  { "store": "Store #142", "rule": "minor labor hours", "likelihood": "medium", "shift_id": 5601 }
]`;

const SAMPLE_COVERAGE = `[
  { "store": "Store #142", "department": "Front End", "day_of_week": "Sat", "current_staff": 4, "optimal_staff": 7 }
]`;

const SAMPLE_EMPLOYEES = `[
  { "employee_id": "E-1042", "role": "Cashier", "tenure_months": 5, "risk_pct": 78, "key_signals": ["missed shifts", "negative review"] },
  { "employee_id": "E-1099", "role": "Stocker", "tenure_months": 22, "risk_pct": 42, "key_signals": ["mild attendance dip"] }
]`;

const SAMPLE_METRICS = `{
  "vacancy_rate_pct": 12,
  "exits_last_90d": 5,
  "internal_moves_last_90d": 3
}`;

const styles = {
  page: { padding: '32px 40px', maxWidth: 1400, margin: '0 auto' },
  title: {
    fontSize: 32, fontWeight: 800,
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: '#64748b', marginBottom: 24 },
  tabs: { display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #334155' },
  tab: (active) => ({
    padding: '12px 20px',
    background: active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
    color: active ? '#fff' : '#94a3b8',
    border: 'none',
    borderRadius: '10px 10px 0 0',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
  }),
  card: {
    background: '#1e293b',
    borderRadius: 16,
    border: '1px solid #334155',
    padding: 24,
    marginBottom: 16,
  },
  label: {
    fontSize: 11, fontWeight: 600, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 1,
    display: 'block', marginTop: 14, marginBottom: 6,
  },
  textarea: {
    width: '100%',
    minHeight: 110,
    padding: 12,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'monospace',
    boxSizing: 'border-box',
    outline: 'none',
  },
  input: {
    width: '100%',
    padding: 10,
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    boxSizing: 'border-box',
    outline: 'none',
  },
  btn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
    marginTop: 16,
  },
  errorBanner: {
    background: '#7f1d1d33',
    border: '1px solid #ef4444',
    color: '#fca5a5',
    padding: '10px 14px',
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 13,
  },
};

function tryParse(label, raw) {
  try { return JSON.parse(raw); }
  catch (e) { throw new Error(`${label}: invalid JSON (${e.message})`); }
}

export default function AIDashboardPage() {
  const [tab, setTab] = useState('aggregate');
  const [error, setError] = useState('');

  // Aggregate inputs
  const [forecast, setForecast] = useState(SAMPLE_FORECAST);
  const [turnoverSignals, setTurnoverSignals] = useState(SAMPLE_TURNOVER);
  const [complianceSignals, setComplianceSignals] = useState(SAMPLE_COMPLIANCE);
  const [coverageGaps, setCoverageGaps] = useState(SAMPLE_COVERAGE);
  const [timeframe, setTimeframe] = useState('next 14 days');
  const [aggResult, setAggResult] = useState(null);
  const [aggLoading, setAggLoading] = useState(false);

  // Per-store rollup inputs
  const [storeName, setStoreName] = useState('Store #142');
  const [employees, setEmployees] = useState(SAMPLE_EMPLOYEES);
  const [recentMetrics, setRecentMetrics] = useState(SAMPLE_METRICS);
  const [rollupResult, setRollupResult] = useState(null);
  const [rollupLoading, setRollupLoading] = useState(false);

  const handleAggregate = async () => {
    setError('');
    setAggResult(null);
    setAggLoading(true);
    try {
      const body = {
        forecast: tryParse('Forecast', forecast),
        turnover_signals: tryParse('Turnover signals', turnoverSignals),
        compliance_signals: tryParse('Compliance signals', complianceSignals),
        coverage_gaps: tryParse('Coverage gaps', coverageGaps),
        timeframe,
      };
      const res = await api.post('/ai-dashboard/ai-aggregate', body);
      setAggResult({ success: true, result: typeof res.data === 'string' ? res.data : (res.data.result || JSON.stringify(res.data, null, 2)), model: res.data.model, usage: res.data.usage });
    } catch (err) {
      if (err.response?.status === 503) {
        setError('AI service unavailable — OPENROUTER_API_KEY is not configured on the backend.');
      } else if (err.message && !err.response) {
        setError(err.message);
      } else {
        setError(err.response?.data?.result || err.response?.data?.error || err.message);
      }
    } finally {
      setAggLoading(false);
    }
  };

  const handleRollup = async () => {
    setError('');
    setRollupResult(null);
    setRollupLoading(true);
    try {
      const body = {
        store_name: storeName,
        employees: tryParse('Employees', employees),
        recent_metrics: tryParse('Recent metrics', recentMetrics),
      };
      const res = await api.post('/ai-dashboard/ai-store-turnover-rollup', body);
      setRollupResult({ success: true, result: typeof res.data === 'string' ? res.data : (res.data.result || JSON.stringify(res.data, null, 2)), model: res.data.model, usage: res.data.usage });
    } catch (err) {
      if (err.response?.status === 503) {
        setError('AI service unavailable — OPENROUTER_API_KEY is not configured on the backend.');
      } else if (err.message && !err.response) {
        setError(err.message);
      } else {
        setError(err.response?.data?.result || err.response?.data?.error || err.message);
      }
    } finally {
      setRollupLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.title}>AI Center — Aggregate Dashboard</div>
      <div style={styles.subtitle}>
        Cross-feature AI roll-ups: combine forecast, turnover, compliance, and coverage
        signals into a single executive narrative; or roll up turnover risk to the store level.
      </div>

      <div style={styles.tabs}>
        <button style={styles.tab(tab === 'aggregate')} onClick={() => { setTab('aggregate'); setError(''); }}>
          Aggregate Dashboard
        </button>
        <button style={styles.tab(tab === 'rollup')} onClick={() => { setTab('rollup'); setError(''); }}>
          Per-Store Turnover Roll-up
        </button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {tab === 'aggregate' && (
        <div style={styles.card}>
          <label style={styles.label}>Timeframe</label>
          <input style={styles.input} value={timeframe} onChange={(e) => setTimeframe(e.target.value)} />

          <label style={styles.label}>Demand Forecast (JSON)</label>
          <textarea style={styles.textarea} value={forecast} onChange={(e) => setForecast(e.target.value)} />

          <label style={styles.label}>Turnover Signals (JSON array)</label>
          <textarea style={styles.textarea} value={turnoverSignals} onChange={(e) => setTurnoverSignals(e.target.value)} />

          <label style={styles.label}>Compliance Early-Warning Signals (JSON array)</label>
          <textarea style={styles.textarea} value={complianceSignals} onChange={(e) => setComplianceSignals(e.target.value)} />

          <label style={styles.label}>Coverage Gaps (JSON array)</label>
          <textarea style={styles.textarea} value={coverageGaps} onChange={(e) => setCoverageGaps(e.target.value)} />

          <button style={styles.btn} onClick={handleAggregate} disabled={aggLoading}>
            {aggLoading ? 'Generating…' : 'Generate Aggregate Dashboard'}
          </button>

          <AIResponseDisplay result={aggResult} loading={aggLoading} title="AI Aggregate Dashboard" />
        </div>
      )}

      {tab === 'rollup' && (
        <div style={styles.card}>
          <label style={styles.label}>Store Name</label>
          <input style={styles.input} value={storeName} onChange={(e) => setStoreName(e.target.value)} />

          <label style={styles.label}>Employees (JSON array, with per-employee risk)</label>
          <textarea style={styles.textarea} value={employees} onChange={(e) => setEmployees(e.target.value)} />

          <label style={styles.label}>Recent Store Metrics (JSON)</label>
          <textarea style={styles.textarea} value={recentMetrics} onChange={(e) => setRecentMetrics(e.target.value)} />

          <button style={styles.btn} onClick={handleRollup} disabled={rollupLoading}>
            {rollupLoading ? 'Rolling up…' : 'Generate Store Roll-up'}
          </button>

          <AIResponseDisplay result={rollupResult} loading={rollupLoading} title="Per-Store Turnover Roll-up" />
        </div>
      )}
    </div>
  );
}
