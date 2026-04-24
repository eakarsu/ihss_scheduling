import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIResponseDisplay from '../components/AIResponseDisplay';

const styles = {
  page: {
    padding: '32px 40px',
    maxWidth: 1400,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  icon: { fontSize: 36 },
  title: (color) => ({
    fontSize: 28,
    fontWeight: 800,
    color: color,
  }),
  count: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  btn: (bg) => ({
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none',
    background: bg,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }),
  searchRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: 200,
    padding: '10px 16px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 10,
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  },
  tableWrapper: {
    background: '#1e293b',
    borderRadius: 16,
    border: '1px solid #334155',
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: (color) => ({
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottom: `2px solid ${color}33`,
    background: '#0f172a',
    whiteSpace: 'nowrap',
  }),
  tr: {
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#cbd5e1',
    borderBottom: '1px solid #1e293b',
    maxWidth: 250,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statusBadge: (status) => {
    const colors = {
      active: '#10b981', 'in progress': '#3b82f6', completed: '#10b981', pending: '#f59e0b',
      approved: '#10b981', draft: '#64748b', open: '#ef4444', resolved: '#10b981',
      planning: '#8b5cf6', 'in use': '#3b82f6', available: '#10b981', delivered: '#10b981',
      ordered: '#f59e0b', 'in transit': '#3b82f6', scheduled: '#8b5cf6', pass: '#10b981',
      passed: '#10b981', fail: '#ef4444', failed: '#ef4444', conditional: '#f59e0b',
      'under review': '#f59e0b', 'over budget': '#ef4444', critical: '#ef4444',
      suspended: '#ef4444', normal: '#10b981', modified: '#f59e0b', monitoring: '#3b82f6',
      'high': '#ef4444', 'medium': '#f59e0b', 'low': '#10b981',
      'in progress': '#3b82f6', 're-inspection required': '#ef4444',
    };
    const s = (status || '').toLowerCase();
    const c = colors[s] || '#64748b';
    return {
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      background: `${c}22`,
      color: c,
      border: `1px solid ${c}44`,
    };
  },
  empty: {
    padding: 48,
    textAlign: 'center',
    color: '#475569',
    fontSize: 14,
  },
  aiSection: {
    marginTop: 24,
    background: '#1e293b',
    borderRadius: 16,
    border: '1px solid #334155',
    padding: 24,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  aiFieldsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  aiField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  aiInput: {
    padding: '8px 12px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  },
};

const statusColumns = ['status', 'severity', 'priority', 'impact_level', 'work_status', 'result', 'condition_rating', 'impact', 'probability'];

export default function FeaturePage({ feature }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [aiForm, setAiForm] = useState({});
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const res = await api.get(feature.api);
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [feature.api]);

  useEffect(() => {
    setItems([]);
    setSearch('');
    setSelectedItem(null);
    setShowForm(false);
    setAiResult(null);
    setAiForm({});
    setLoading(true);
    fetchItems();
  }, [feature.key, fetchItems]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.delete(`${feature.api}/${id}`);
      setItems(items.filter((i) => i.id !== id));
      setSelectedItem(null);
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSave = async (form) => {
    try {
      const res = await api.put(`${feature.api}/${form.id}`, form);
      setItems(items.map((i) => (i.id === form.id ? res.data : i)));
      setSelectedItem(null);
    } catch (err) {
      alert('Save failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCreate = async (form) => {
    try {
      const res = await api.post(feature.api, form);
      setItems([res.data, ...items]);
    } catch (err) {
      alert('Create failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAi = async () => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post(feature.ai.endpoint, aiForm);
      setAiResult(res.data);
    } catch (err) {
      setAiResult({ success: false, result: err.response?.data?.error || err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const filtered = items.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(item).some((v) => String(v || '').toLowerCase().includes(s));
  });

  const formatLabel = (col) => col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const formatCell = (val, col) => {
    if (val === null || val === undefined) return '—';
    if (statusColumns.includes(col)) {
      return <span style={styles.statusBadge(val)}>{val}</span>;
    }
    if (typeof val === 'number' && val > 1000) return `$${val.toLocaleString()}`;
    const s = String(val);
    return s.length > 60 ? s.substring(0, 57) + '...' : s;
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <span style={styles.icon}>{feature.icon}</span>
          <div>
            <div style={styles.title(feature.color)}>{feature.label}</div>
            <div style={styles.count}>{items.length} records</div>
          </div>
        </div>
        <div style={styles.actions}>
          <button
            style={styles.btn(feature.color)}
            onClick={() => setShowForm(true)}
            onMouseEnter={(e) => e.target.style.opacity = 0.85}
            onMouseLeave={(e) => e.target.style.opacity = 1}
          >
            + New Item
          </button>
          {feature.ai && (
            <button
              style={styles.btn('linear-gradient(135deg, #3b82f6, #8b5cf6)')}
              onClick={() => document.getElementById('ai-section')?.scrollIntoView({ behavior: 'smooth' })}
              onMouseEnter={(e) => e.target.style.opacity = 0.85}
              onMouseLeave={(e) => e.target.style.opacity = 1}
            >
              🤖 AI Analysis
            </button>
          )}
        </div>
      </div>

      <div style={styles.searchRow}>
        <input
          style={styles.searchInput}
          placeholder="Search records..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={(e) => e.target.style.borderColor = feature.color}
          onBlur={(e) => e.target.style.borderColor = '#334155'}
        />
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th(feature.color)}>#</th>
              {feature.tableColumns.map((col) => (
                <th key={col} style={styles.th(feature.color)}>{formatLabel(col)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={feature.tableColumns.length + 1} style={styles.empty}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={feature.tableColumns.length + 1} style={styles.empty}>No records found</td></tr>
            ) : (
              filtered.map((item, idx) => (
                <tr
                  key={item.id}
                  style={styles.tr}
                  onClick={() => setSelectedItem(item)}
                  onMouseEnter={(e) => e.currentTarget.style.background = `${feature.color}08`}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ ...styles.td, color: '#475569', fontWeight: 600 }}>{idx + 1}</td>
                  {feature.tableColumns.map((col) => (
                    <td key={col} style={styles.td}>{formatCell(item[col], col)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {feature.ai && (
        <div id="ai-section" style={styles.aiSection}>
          <div style={styles.aiTitle}>
            <span>🤖</span>
            <span style={{ color: feature.color }}>{feature.ai.title}</span>
          </div>
          <div style={styles.aiFieldsGrid}>
            {feature.ai.fields.map((field) => (
              <div key={field} style={styles.aiField}>
                <label style={styles.aiLabel}>{formatLabel(field)}</label>
                <input
                  style={styles.aiInput}
                  value={aiForm[field] || ''}
                  onChange={(e) => setAiForm({ ...aiForm, [field]: e.target.value })}
                  placeholder={`Enter ${formatLabel(field).toLowerCase()}...`}
                  onFocus={(e) => e.target.style.borderColor = feature.color}
                  onBlur={(e) => e.target.style.borderColor = '#334155'}
                />
              </div>
            ))}
          </div>
          <button
            style={styles.btn('linear-gradient(135deg, #3b82f6, #8b5cf6)')}
            onClick={handleAi}
            disabled={aiLoading}
            onMouseEnter={(e) => e.target.style.opacity = 0.85}
            onMouseLeave={(e) => e.target.style.opacity = 1}
          >
            {aiLoading ? 'Analyzing...' : `Run ${feature.ai.title}`}
          </button>
          <AIResponseDisplay result={aiResult} loading={aiLoading} title={feature.ai.title} />
        </div>
      )}

      {selectedItem && (
        <DetailModal
          item={selectedItem}
          columns={feature.columns}
          color={feature.color}
          onClose={() => setSelectedItem(null)}
          onDelete={handleDelete}
          onSave={handleSave}
        />
      )}

      {showForm && (
        <FormModal
          columns={feature.columns}
          color={feature.color}
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
          title={`New ${feature.label} Record`}
        />
      )}
    </div>
  );
}
