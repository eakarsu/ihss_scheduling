import { useState } from 'react';
import Login from './pages/Login.jsx';
import CareOperations from './pages/CareOperations.jsx';

const styles = `
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#f5f8fb;color:#162433}
button,input,select{font:inherit}button{cursor:pointer}.shell{max-width:1180px;margin:0 auto;padding:24px}
`;

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); setSession(null); }
  return <><style>{styles}</style>{session ? <CareOperations user={session} onLogout={logout}/> : <Login onLogin={() => setSession(JSON.parse(localStorage.getItem('user')))}/>}</>;
}
