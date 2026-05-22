import React, { useState, useEffect } from 'react';
import api from '../api';

const RULE_TYPES = ['max_hours', 'break_required', 'cert_required', 'travel_buffer', 'min_rest', 'overtime_limit'];
const APPLIES_TO = ['all_caregivers', 'overnight_shifts', 'between_clients', 'weekends', 'holidays'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function SchedulingRulesEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', rule_type: 'max_hours', value: '', applies_to: 'all_caregivers', priority: 'medium', active: true });

  const load = () => {
    setLoading(true);
    api.get('/custom-views/scheduling-rules')
      .then(r => setRules(r.data.rules))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = () => {
    setError('');
    const req = editing
      ? api.put(`/custom-views/scheduling-rules/${editing}`, form)
      : api.post('/custom-views/scheduling-rules', form);
    req.then(() => { load(); reset(); }).catch(e => setError(e.response?.data?.error || e.message));
  };

  const remove = (id) => {
    if (!window.confirm('Delete this rule?')) return;
    api.delete(`/custom-views/scheduling-rules/${id}`)
      .then(() => load()).catch(e => setError(e.message));
  };

  const edit = (r) => { setEditing(r.id); setForm({ ...r }); };
  const reset = () => { setEditing(null); setForm({ name: '', rule_type: 'max_hours', value: '', applies_to: 'all_caregivers', priority: 'medium', active: true }); };

  const priColor = (p) => ({ critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#64748b' }[p] || '#64748b');

  return (
    <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155' }}>
      <h3 style={{ color: '#e2e8f0', fontSize: 18, marginBottom: 16 }}>Scheduling Rules Editor</h3>
      {error && <div style={{ color: '#ef4444', padding: 12, background: '#ef444422', borderRadius: 6, marginBottom: 12 }}>{error}</div>}

      {/* Form */}
      <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid #334155' }}>
        <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 12 }}>{editing ? `Edit Rule #${editing}` : 'Add New Rule'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <input placeholder="Rule name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '8px 12px', borderRadius: 6, fontSize: 13 }} />
          <select value={form.rule_type} onChange={e => setForm({ ...form, rule_type: e.target.value })}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
            {RULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input placeholder="Value" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '8px 12px', borderRadius: 6, fontSize: 13 }} />
          <select value={form.applies_to} onChange={e => setForm({ ...form, applies_to: e.target.value })}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
            {APPLIES_TO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
            {PRIORITIES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <label style={{ color: '#e2e8f0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
            Active
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={save} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            {editing ? 'Update' : 'Create'}
          </button>
          {editing && <button onClick={reset} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>}
        </div>
      </div>

      {/* List */}
      {loading ? <div style={{ color: '#94a3b8' }}>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['ID', 'Name', 'Type', 'Value', 'Applies', 'Priority', 'Active', 'Actions'].map(h => (
                <th key={h} style={{ color: '#94a3b8', padding: 10, textAlign: 'left', fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ color: '#64748b', padding: 10 }}>{r.id}</td>
                <td style={{ color: '#e2e8f0', padding: 10, fontWeight: 500 }}>{r.name}</td>
                <td style={{ color: '#94a3b8', padding: 10 }}>{r.rule_type}</td>
                <td style={{ color: '#e2e8f0', padding: 10 }}>{r.value}</td>
                <td style={{ color: '#94a3b8', padding: 10 }}>{r.applies_to}</td>
                <td style={{ padding: 10 }}>
                  <span style={{ color: priColor(r.priority), padding: '2px 8px', background: `${priColor(r.priority)}22`, borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                    {r.priority}
                  </span>
                </td>
                <td style={{ padding: 10 }}>
                  <span style={{ color: r.active ? '#10b981' : '#64748b' }}>{r.active ? '✓' : '○'}</span>
                </td>
                <td style={{ padding: 10 }}>
                  <button onClick={() => edit(r)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginRight: 4 }}>Edit</button>
                  <button onClick={() => remove(r.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
