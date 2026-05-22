import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FeaturePage from './pages/FeaturePage';
import AIDashboardPage from './pages/AIDashboardPage';
import CustomViewsPage from './pages/CustomViewsPage';
import Navbar from './components/Navbar';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

const globalStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #0f172a;
    color: #e2e8f0;
    min-height: 100vh;
  }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: #1e293b; }
  ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #64748b; }
`;

const features = [
  { key: 'regions', label: 'Regions', icon: '🌎', color: '#ef4444', api: '/regions',
    columns: ['name','code','description','regional_manager','headquarters_city','states_covered','total_stores','total_employees','status'],
    tableColumns: ['name','code','regional_manager','headquarters_city','states_covered','total_stores','status'] },
  { key: 'districts', label: 'Districts', icon: '📍', color: '#8b5cf6', api: '/districts',
    columns: ['name','code','region_name','district_manager','city','state','total_stores','total_employees','status'],
    tableColumns: ['name','code','region_name','district_manager','city','state','status'] },
  { key: 'stores', label: 'Stores', icon: '🏪', color: '#3b82f6', api: '/stores',
    columns: ['store_number','name','district_name','region_name','address','city','state','zip','phone','store_manager','square_footage','open_date','status'],
    tableColumns: ['store_number','name','district_name','city','state','store_manager','status'] },
  { key: 'employees', label: 'Employees', icon: '👥', color: '#10b981', api: '/employees',
    columns: ['employee_id','first_name','last_name','email','phone','role','department','store_name','district_name','hire_date','hourly_rate','employment_type','status'],
    tableColumns: ['employee_id','first_name','last_name','role','department','store_name','status'],
    ai: { endpoint: '/employees/ai-turnover-risk', fields: ['employee_id','tenure_months','recent_signals','context'], title: 'AI Staff Turnover Risk' } },
  { key: 'shifts', label: 'AI Shift Scheduling', icon: '📅', color: '#f59e0b', api: '/shifts',
    columns: ['store_name','employee_name','role','shift_date','start_time','end_time','hours','break_minutes','department','status','notes'],
    tableColumns: ['store_name','employee_name','shift_date','start_time','end_time','hours','status'],
    ai: { endpoint: '/shifts/ai-optimize', fields: ['store_name','week_start','constraints','employee_count','departments'], title: 'AI Shift Optimizer' } },
  { key: 'shift-templates', label: 'Shift Templates', icon: '📋', color: '#6366f1', api: '/shift-templates',
    columns: ['name','store_name','department','start_time','end_time','hours','break_minutes','min_staff','max_staff','days_applicable','status','notes'],
    tableColumns: ['name','store_name','department','start_time','end_time','hours','days_applicable'] },
  { key: 'time-off', label: 'Time Off Requests', icon: '🏖️', color: '#06b6d4', api: '/time-off',
    columns: ['employee_name','store_name','request_type','start_date','end_date','total_days','reason','submitted_date','approved_by','status','notes'],
    tableColumns: ['employee_name','store_name','request_type','start_date','end_date','total_days','status'] },
  { key: 'availability', label: 'Availability', icon: '🕐', color: '#14b8a6', api: '/availability',
    columns: ['employee_name','store_name','day_of_week','available_from','available_to','max_hours','preferred_shift','effective_date','expiry_date','status','notes'],
    tableColumns: ['employee_name','store_name','day_of_week','available_from','available_to','preferred_shift','status'] },
  { key: 'coverage', label: 'AI Coverage Plans', icon: '📊', color: '#ec4899', api: '/coverage',
    columns: ['store_name','department','day_of_week','time_slot','min_staff','optimal_staff','max_staff','current_staff','coverage_pct','status','notes'],
    tableColumns: ['store_name','department','day_of_week','time_slot','optimal_staff','current_staff','coverage_pct'],
    ai: { endpoint: '/coverage/ai-analyze', fields: ['store_name','department','current_staffing','sales_data','season'], title: 'AI Coverage Analysis' } },
  { key: 'demand-forecast', label: 'AI Demand Forecast', icon: '📈', color: '#a855f7', api: '/demand-forecast',
    columns: ['store_name','forecast_date','department','predicted_traffic','predicted_sales','recommended_staff','confidence_level','factors','season','status','notes'],
    tableColumns: ['store_name','forecast_date','department','predicted_traffic','predicted_sales','recommended_staff','confidence_level'],
    ai: { endpoint: '/demand-forecast/ai-forecast', fields: ['store_name','forecast_period','historical_data','events','season'], title: 'AI Demand Forecast' } },
  { key: 'payroll', label: 'Payroll', icon: '💰', color: '#22c55e', api: '/payroll',
    columns: ['employee_name','store_name','pay_period','regular_hours','overtime_hours','hourly_rate','regular_pay','overtime_pay','total_pay','deductions','net_pay','status'],
    tableColumns: ['employee_name','store_name','pay_period','regular_hours','overtime_hours','total_pay','status'] },
  { key: 'announcements', label: 'Announcements', icon: '📢', color: '#f97316', api: '/announcements',
    columns: ['title','message','target_scope','target_name','priority','author','publish_date','expiry_date','category','status','notes'],
    tableColumns: ['title','target_scope','target_name','priority','publish_date','category','status'] },
  { key: 'training', label: 'Training', icon: '🎓', color: '#0ea5e9', api: '/training',
    columns: ['employee_name','store_name','training_name','category','required_by','completed_date','expiry_date','score','instructor','certification_id','status','notes'],
    tableColumns: ['employee_name','training_name','category','required_by','score','status'] },
  { key: 'performance', label: 'Performance', icon: '⭐', color: '#eab308', api: '/performance',
    columns: ['employee_name','store_name','review_period','reviewer','overall_rating','attendance_score','productivity_score','teamwork_score','goals','strengths','improvements','status'],
    tableColumns: ['employee_name','store_name','review_period','overall_rating','attendance_score','productivity_score','status'],
    ai: { endpoint: '/performance/ai-predict', fields: ['employee_id','review_period','recent_metrics','context'], title: 'AI Worker Performance Prediction' } },
  { key: 'incidents', label: 'Incidents', icon: '🚨', color: '#dc2626', api: '/incidents',
    columns: ['store_name','incident_type','description','severity','location','reported_by','date_reported','date_resolved','corrective_action','status','notes'],
    tableColumns: ['store_name','incident_type','severity','date_reported','status'] },
  { key: 'swap-requests', label: 'Shift Swaps', icon: '🔄', color: '#7c3aed', api: '/swap-requests',
    columns: ['requester_name','swap_with_name','store_name','original_date','original_shift','swap_date','swap_shift','reason','approved_by','status','notes'],
    tableColumns: ['requester_name','swap_with_name','store_name','original_date','swap_date','status'] },
  { key: 'labor-compliance', label: 'AI Labor Compliance', icon: '⚖️', color: '#059669', api: '/labor-compliance',
    columns: ['store_name','compliance_type','regulation','description','audit_date','auditor','result','corrective_action','deadline','status','notes'],
    tableColumns: ['store_name','compliance_type','regulation','result','deadline','status'],
    ai: { endpoint: '/labor-compliance/ai-audit', fields: ['store_name','state','employee_count','issues'], title: 'AI Labor Compliance Audit' } },
  { key: 'continuity-of-care', label: 'Continuity of Care', icon: '🤝', color: '#0d9488', api: '/continuity-of-care',
    columns: ['client_name','caregiver_name','continuity_score','weekly_hours','backup_gap','status'],
    tableColumns: ['client_name','caregiver_name','continuity_score','weekly_hours','backup_gap','status'] },
  { key: 'compliance-early-warning', label: 'AI Compliance Early Warning', icon: '⚠️', color: '#d97706', api: '/labor-compliance',
    columns: ['store_name','compliance_type','regulation','description','audit_date','auditor','result','corrective_action','deadline','status','notes'],
    tableColumns: ['store_name','compliance_type','regulation','result','deadline','status'],
    ai: { endpoint: '/labor-compliance/ai-early-warning', fields: ['store_name','employee_id','signals','lookback_days'], title: 'AI Compliance Violation Early Warning' } },
];

function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    const check = () => setIsAuth(!!localStorage.getItem('token'));
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, []);

  const handleLogin = () => setIsAuth(true);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuth(false);
  };

  return (
    <>
      <style>{globalStyles}</style>
      <Router>
        {isAuth && <Navbar onLogout={handleLogout} features={features} />}
        <Routes>
        <Route path="/insights/timeline" element={<TimelineView />} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

          <Route path="/login" element={isAuth ? <Navigate to="/" /> : <Login onLogin={handleLogin} />} />
          <Route path="/" element={isAuth ? <Dashboard features={features} /> : <Navigate to="/login" />} />
          <Route path="/ai-dashboard" element={isAuth ? <AIDashboardPage /> : <Navigate to="/login" />} />
          <Route path="/custom-views" element={isAuth ? <CustomViewsPage /> : <Navigate to="/login" />} />
          {features.map((f) => (
            <Route key={f.key} path={`/${f.key}`} element={isAuth ? <FeaturePage feature={f} /> : <Navigate to="/login" />} />
          ))}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
