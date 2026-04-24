import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const styles = {
  page: { padding: '32px 40px', maxWidth: 1400, margin: '0 auto' },
  header: { marginBottom: 36 },
  title: { fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', fontWeight: 400 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 36 },
  stat: (color) => ({ background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`, border: `1px solid ${color}33`, borderRadius: 16, padding: '20px 24px' }),
  statValue: (color) => ({ fontSize: 28, fontWeight: 800, color: color, marginBottom: 4 }),
  statLabel: { fontSize: 13, color: '#64748b', fontWeight: 500 },
  hierarchy: { marginBottom: 36 },
  hierarchyTitle: { fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 },
  hierarchyFlow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 20, background: '#1e293b', borderRadius: 16, border: '1px solid #334155' },
  hierarchyItem: (color) => ({ padding: '12px 24px', borderRadius: 12, background: `${color}15`, border: `1px solid ${color}33`, color: color, fontWeight: 700, fontSize: 14 }),
  arrow: { color: '#475569', fontSize: 20, fontWeight: 700 },
  sectionTitle: { fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 },
  card: (color) => ({ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: 16, border: `1px solid ${color}33`, padding: 24, cursor: 'pointer', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }),
  cardGlow: (color) => ({ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}00)` }),
  cardIcon: { fontSize: 36, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 },
  cardCount: (color) => ({ fontSize: 24, fontWeight: 800, color: color, marginBottom: 4 }),
  cardLabel: { fontSize: 12, color: '#64748b', fontWeight: 500 },
  cardAi: { position: 'absolute', top: 12, right: 12, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#fff' },
};

export default function Dashboard({ features }) {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    features.forEach(async (f) => {
      try {
        const res = await api.get(f.api);
        setCounts((prev) => ({ ...prev, [f.key]: res.data.length }));
      } catch { setCounts((prev) => ({ ...prev, [f.key]: 0 })); }
    });
  }, [features]);

  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
  const aiFeatures = features.filter((f) => f.ai).length;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.title}>Welcome back, {user.name || 'User'}</div>
        <div style={styles.subtitle}>Territory-based workforce scheduling and management</div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.stat('#f59e0b')}><div style={styles.statValue('#f59e0b')}>{features.length}</div><div style={styles.statLabel}>Total Modules</div></div>
        <div style={styles.stat('#3b82f6')}><div style={styles.statValue('#3b82f6')}>{totalItems}</div><div style={styles.statLabel}>Total Records</div></div>
        <div style={styles.stat('#ef4444')}><div style={styles.statValue('#ef4444')}>{aiFeatures}</div><div style={styles.statLabel}>AI-Powered</div></div>
        <div style={styles.stat('#10b981')}><div style={styles.statValue('#10b981')}>{counts['stores'] || 0}</div><div style={styles.statLabel}>Store Locations</div></div>
      </div>

      <div style={styles.hierarchy}>
        <div style={styles.hierarchyTitle}>Territory Hierarchy</div>
        <div style={styles.hierarchyFlow}>
          <div style={styles.hierarchyItem('#f59e0b')}>Corporate</div>
          <div style={styles.arrow}>&rarr;</div>
          <div style={styles.hierarchyItem('#ef4444')}>Regions ({counts['regions'] || '...'})</div>
          <div style={styles.arrow}>&rarr;</div>
          <div style={styles.hierarchyItem('#8b5cf6')}>Districts ({counts['districts'] || '...'})</div>
          <div style={styles.arrow}>&rarr;</div>
          <div style={styles.hierarchyItem('#3b82f6')}>Stores ({counts['stores'] || '...'})</div>
          <div style={styles.arrow}>&rarr;</div>
          <div style={styles.hierarchyItem('#10b981')}>Employees ({counts['employees'] || '...'})</div>
        </div>
      </div>

      <div style={styles.sectionTitle}>Feature Modules</div>
      <div style={styles.grid}>
        {features.map((f) => (
          <div key={f.key} style={styles.card(f.color)} onClick={() => navigate(`/${f.key}`)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${f.color}22`; e.currentTarget.style.borderColor = `${f.color}66`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = `${f.color}33`; }}
          >
            <div style={styles.cardGlow(f.color)}></div>
            {f.ai && <div style={styles.cardAi}>AI</div>}
            <div style={styles.cardIcon}>{f.icon}</div>
            <div style={styles.cardTitle}>{f.label}</div>
            <div style={styles.cardCount(f.color)}>{counts[f.key] ?? '...'}</div>
            <div style={styles.cardLabel}>records</div>
          </div>
        ))}
      </div>
    </div>
  );
}
