const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: __dirname + '/../.env' });

const app = express();
const PORT = process.env.BACKEND_PORT || 4001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/regions', require('./routes/regions'));
app.use('/api/districts', require('./routes/districts'));
app.use('/api/stores', require('./routes/stores'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/shift-templates', require('./routes/shiftTemplates'));
app.use('/api/time-off', require('./routes/timeOff'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/coverage', require('./routes/coverage'));
app.use('/api/demand-forecast', require('./routes/demandForecast'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/training', require('./routes/training'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/swap-requests', require('./routes/swapRequests'));
app.use('/api/labor-compliance', require('./routes/laborCompliance'));
app.use('/api/continuity-of-care', require('./routes/continuityOfCare'));
// Apply pass 4 — aggregate AI dashboard + per-store turnover roll-up
app.use('/api/ai-dashboard', require('./routes/aiDashboard'));
app.use('/api/schedule-optimizer', require('./routes/scheduleOptimizer')); app.use('/api/turnover-risk', require('./routes/turnoverRisk')); app.use('/api/mobile', require('./routes/mobileSelfService')); app.use('/api/hris', require('./routes/hrisSync')); app.use('/api/labor-cost', require('./routes/laborCostDashboard')); app.use('/api/voice-checkin', require('./routes/voiceCheckIn'));

// Custom Views — IHSS-specific 4 features (mounted BEFORE 404/health)
app.use('/api/custom-views', require('./routes/customViews'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.listen(PORT, () => {
  console.log(`IHSS Scheduling Backend running on port ${PORT}`);
});

// === Batch 10 Gaps & Frontend Mounts === (mounts)
app.use('/api/gap-only-one-ai-surface-most-domain', require('./routes/gap_only_one_ai_surface_most_domain'));
app.use('/api/gap-no-ai-schedule-optimizer', require('./routes/gap_no_ai_schedule_optimizer'));
app.use('/api/gap-no-ai-turnover-churn-prediction', require('./routes/gap_no_ai_turnover_churn_prediction'));
app.use('/api/gap-no-ai-compliance-violation-early-warning', require('./routes/gap_no_ai_compliance_violation_early_warning'));
app.use('/api/gap-no-demand-forecast-model-route-name', require('./routes/gap_no_demand_forecast_model_route_name'));
app.use('/api/gap-no-employee-sentiment-fatigue-scoring', require('./routes/gap_no_employee_sentiment_fatigue_scoring'));
app.use('/api/gap-no-incident-root-cause-analyzer', require('./routes/gap_no_incident_root_cause_analyzer'));
app.use('/api/gap-frontend-is-minimal-3-pages-vs', require('./routes/gap_frontend_is_minimal_3_pages_vs'));
app.use('/api/gap-no-webhooks-external-hris-integrations', require('./routes/gap_no_webhooks_external_hris_integrations'));
app.use('/api/gap-no-notifications-push-sms-for-shift', require('./routes/gap_no_notifications_push_sms_for_shift'));
app.use('/api/gap-no-mobile-self-service-app', require('./routes/gap_no_mobile_self_service_app'));
app.use('/api/gap-no-multi-tenant-tenant-isolation', require('./routes/gap_no_multi_tenant_tenant_isolation'));
app.use('/api/gap-no-audit-log-ui', require('./routes/gap_no_audit_log_ui'));
app.use('/api/gap-no-reporting-payroll-export-to-adp', require('./routes/gap_no_reporting_payroll_export_to_adp'));
