import { useState } from 'react';
import api from '../api';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1a1a2e 50%, #0f172a 100%)',
    padding: 20,
  },
  card: {
    background: '#1e293b',
    borderRadius: 24,
    border: '1px solid #334155',
    padding: 48,
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
  },
  logo: { textAlign: 'center', marginBottom: 32 },
  logoIcon: { fontSize: 56, display: 'block', marginBottom: 12 },
  logoTitle: {
    fontSize: 28,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: 4,
  },
  logoSub: { fontSize: 14, color: '#64748b', fontWeight: 400 },
  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    width: '100%', padding: '12px 16px', background: '#0f172a', border: '1px solid #334155',
    borderRadius: 10, fontSize: 15, color: '#e2e8f0', outline: 'none', fontFamily: 'inherit',
  },
  btn: {
    width: '100%', padding: '14px', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff',
    fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8,
  },
  fillBtn: {
    width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #334155',
    background: '#0f172a', color: '#94a3b8', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', marginTop: 12, transition: 'all 0.2s',
  },
  error: { background: '#ef444422', border: '1px solid #ef4444', borderRadius: 10, padding: '10px 16px', color: '#ef4444', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', color: '#475569', fontSize: 12 },
  line: { flex: 1, height: 1, background: '#334155' },
};

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { organizationId, email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📍</span>
          <div style={styles.logoTitle}>IHSS Scheduling</div>
          <div style={styles.logoSub}>Governed Care Scheduling Platform</div>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Organization ID</label>
            <input style={styles.input} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} placeholder="Provisioned organization UUID" required />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required
              onFocus={(e) => e.target.style.borderColor = '#f59e0b'} onBlur={(e) => e.target.style.borderColor = '#334155'} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required
              onFocus={(e) => e.target.style.borderColor = '#f59e0b'} onBlur={(e) => e.target.style.borderColor = '#334155'} />
          </div>
          <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
