import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const styles = {
  nav: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderBottom: '1px solid #334155',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    height: 64,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    marginRight: 32,
    flexShrink: 0,
  },
  brandIcon: { fontSize: 28 },
  brandText: {
    fontSize: 18,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    whiteSpace: 'nowrap',
  },
  menuContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    overflow: 'auto',
    flex: 1,
    padding: '4px 0',
  },
  menuItem: (active, color) => ({
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: active ? `${color}22` : 'transparent',
    color: active ? color : '#94a3b8',
    border: active ? `1px solid ${color}44` : '1px solid transparent',
    transition: 'all 0.2s',
  }),
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginLeft: 16,
    flexShrink: 0,
  },
  userName: { fontSize: 13, color: '#94a3b8' },
  logoutBtn: {
    padding: '6px 16px',
    borderRadius: 8,
    border: '1px solid #ef444466',
    background: 'transparent',
    color: '#ef4444',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default function Navbar({ onLogout, features }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <nav style={styles.nav}>
      <div style={styles.brand} onClick={() => navigate('/')}>
        <span style={styles.brandIcon}>📍</span>
        <span style={styles.brandText}>IHSS Scheduling</span>
      </div>
      <div style={styles.menuContainer}>
        <div
          key="ai-dashboard"
          style={styles.menuItem(location.pathname === '/ai-dashboard', '#8b5cf6')}
          onClick={() => navigate('/ai-dashboard')}
          onMouseEnter={(e) => { e.target.style.background = '#8b5cf615'; e.target.style.color = '#8b5cf6'; }}
          onMouseLeave={(e) => {
            const active = location.pathname === '/ai-dashboard';
            e.target.style.background = active ? '#8b5cf622' : 'transparent';
            e.target.style.color = active ? '#8b5cf6' : '#94a3b8';
          }}
        >
          🧠 AI Dashboard
        </div>
        <div
          key="custom-views"
          data-testid="nav-ihss-views"
          style={styles.menuItem(location.pathname === '/custom-views', '#10b981')}
          onClick={() => navigate('/custom-views')}
          onMouseEnter={(e) => { e.target.style.background = '#10b98115'; e.target.style.color = '#10b981'; }}
          onMouseLeave={(e) => {
            const active = location.pathname === '/custom-views';
            e.target.style.background = active ? '#10b98122' : 'transparent';
            e.target.style.color = active ? '#10b981' : '#94a3b8';
          }}
        >
          🏠 IHSS Views
        </div>
        {features.map((f) => (
          <div
            key={f.key}
            style={styles.menuItem(location.pathname === `/${f.key}`, f.color)}
            onClick={() => navigate(`/${f.key}`)}
            onMouseEnter={(e) => { e.target.style.background = `${f.color}15`; e.target.style.color = f.color; }}
            onMouseLeave={(e) => {
              const active = location.pathname === `/${f.key}`;
              e.target.style.background = active ? `${f.color}22` : 'transparent';
              e.target.style.color = active ? f.color : '#94a3b8';
            }}
          >
            {f.icon} {f.label}
          </div>
        ))}
      </div>
      <div style={styles.right}>
        <span style={styles.userName}>{user.name || 'User'}</span>
        <button style={styles.logoutBtn} onClick={onLogout}
          onMouseEnter={(e) => { e.target.style.background = '#ef444422'; }}
          onMouseLeave={(e) => { e.target.style.background = 'transparent'; }}
        >Logout</button>
      </div>
    </nav>
  );
}
