import React, { useState } from 'react';

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    background: '#1e293b',
    borderRadius: 16,
    border: '1px solid #334155',
    width: '90%',
    maxWidth: 700,
    maxHeight: '85vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  header: (color) => ({
    background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
    borderBottom: `1px solid ${color}33`,
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }),
  title: (color) => ({
    fontSize: 18,
    fontWeight: 700,
    color: color,
  }),
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1px solid #475569',
    background: '#0f172a',
    color: '#94a3b8',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 24 },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#e2e8f0',
    padding: '8px 12px',
    background: '#0f172a',
    borderRadius: 8,
    border: '1px solid #334155',
    minHeight: 38,
    wordBreak: 'break-word',
  },
  input: {
    width: '100%',
    fontSize: 14,
    color: '#e2e8f0',
    padding: '8px 12px',
    background: '#0f172a',
    borderRadius: 8,
    border: '1px solid #475569',
    outline: 'none',
    fontFamily: 'inherit',
  },
  textarea: {
    width: '100%',
    fontSize: 14,
    color: '#e2e8f0',
    padding: '8px 12px',
    background: '#0f172a',
    borderRadius: 8,
    border: '1px solid #475569',
    outline: 'none',
    fontFamily: 'inherit',
    minHeight: 80,
    resize: 'vertical',
  },
  actions: {
    padding: '16px 24px',
    borderTop: '1px solid #334155',
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
  },
  btn: (bg) => ({
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    background: bg,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  }),
};

const longFields = ['description', 'notes', 'corrective_action', 'justification', 'mitigation',
  'work_completed', 'issues', 'materials_used', 'visitor_log', 'skills', 'defects_found', 'tags'];

export default function DetailModal({ item, columns, color, onClose, onDelete, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...item });

  const formatLabel = (col) =>
    col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const formatValue = (val) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
      if (val > 10000) return `$${val.toLocaleString()}`;
      return val.toLocaleString();
    }
    return String(val);
  };

  const handleSave = () => {
    onSave(form);
    setEditing(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header(color)}>
          <span style={styles.title(color)}>
            {editing ? 'Edit Record' : 'Record Details'}
          </span>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={styles.body}>
          {columns.map((col) => (
            <div style={styles.field} key={col}>
              <div style={styles.label}>{formatLabel(col)}</div>
              {editing ? (
                longFields.includes(col) ? (
                  <textarea
                    style={styles.textarea}
                    value={form[col] || ''}
                    onChange={(e) => setForm({ ...form, [col]: e.target.value })}
                  />
                ) : (
                  <input
                    style={styles.input}
                    value={form[col] || ''}
                    onChange={(e) => setForm({ ...form, [col]: e.target.value })}
                  />
                )
              ) : (
                <div style={styles.value}>{formatValue(item[col])}</div>
              )}
            </div>
          ))}
        </div>
        <div style={styles.actions}>
          {editing ? (
            <>
              <button style={styles.btn('#475569')} onClick={() => setEditing(false)}>Cancel</button>
              <button style={styles.btn('#3b82f6')} onClick={handleSave}>Save Changes</button>
            </>
          ) : (
            <>
              <button
                style={styles.btn('#ef4444')}
                onClick={() => onDelete(item.id)}
                onMouseEnter={(e) => e.target.style.opacity = 0.8}
                onMouseLeave={(e) => e.target.style.opacity = 1}
              >
                Delete
              </button>
              <button
                style={styles.btn('#f59e0b')}
                onClick={() => setEditing(true)}
                onMouseEnter={(e) => e.target.style.opacity = 0.8}
                onMouseLeave={(e) => e.target.style.opacity = 1}
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
