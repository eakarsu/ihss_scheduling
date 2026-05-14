# Audit Apply Notes — ihss_scheduling

Source: `_AUDIT/reports/batch_10.md` § Template-clones #15 ihss_scheduling

## Original audit recommendations

> 19 routes, 0 AI endpoints. Rich domain routing (scheduling, payroll, compliance, training, incidents) but zero AI endpoints.

The audit reports **0 AI endpoints**, but several `/ai-*` endpoints already exist (e.g. `shifts.js /ai-optimize`, `demandForecast.js /ai-forecast`, `coverage.js /ai-*`, `laborCompliance.js /ai-audit`). The `openrouter.aiQuery(systemPrompt, userPrompt)` helper is already in place.

### Missing AI endpoints (per audit)
- Demand forecasting — already exists (`/api/demand-forecast/ai-forecast`)
- Schedule optimization — already exists (`/api/shifts/ai-optimize`)
- Worker performance prediction — added this pass
- Compliance violation early warning — added this pass
- Staff turnover prediction — added this pass

## Implemented this pass

- `POST /api/employees/ai-turnover-risk` — added in `routes/employees.js`. Returns strict JSON `{turnover_risk_pct, trend, key_signals, retention_actions, confidence}`. Mechanical implementation of "Staff turnover prediction".
- `POST /api/performance/ai-predict` — added in `routes/performance.js`. Returns strict JSON predicted-rating + per-axis scores + trajectory + drivers + coaching actions. Mechanical implementation of "Worker performance prediction".
- `POST /api/labor-compliance/ai-early-warning` — added in `routes/laborCompliance.js`. Returns strict JSON `{warnings[…], summary, high_risk_employees}`. Mechanical implementation of "Compliance violation early warning".

All three reuse the existing `aiQuery` helper, `auth` middleware, and the `createCrudRouter` pattern (the router from the factory is used to attach the new POST handlers, matching `shifts.js` / `demandForecast.js` style). `node --check` passes for all three files.

## Backlog (not implemented)

### Documentation reconciliation
- The audit's "0 AI endpoints" count is wrong; an inventory pass on `/ai-*` endpoints across the 19 routes would correct the audit.

### Mechanical (next pass)
- Aggregate AI dashboard endpoint (combine forecast + risk + compliance signals).
- Per-store turnover-risk roll-up.

### Needs schema/data model work
- Persistent `ai_results` log so dashboards can render past predictions and audit-trail them.
- Outcome capture: did the early-warning prediction prevent a violation?

## Categorisation

- MECHANICAL: turnover risk, performance prediction, compliance early warning (all done).
- NEEDS-AUDIT-RECONCILIATION: re-count `/ai-*` endpoints.
- NEEDS-SCHEMA: persistent prediction log, outcome capture.

## Apply pass 3 (frontend)

LEFT-AS-IS. `frontend/src/App.js` `featureConfig` already wires all three apply-pass-2 endpoints declaratively:

- `employees → /employees/ai-turnover-risk`
- `performance → /performance/ai-predict`
- `laborCompliance → /labor-compliance/ai-early-warning` (alongside `/labor-compliance/ai-audit`)

`FeaturePage.js` consumes the config; `AIResponseDisplay` renders the response. JWT (`Bearer ${localStorage.token}`) is attached centrally by the axios interceptor in `frontend/src/api.js`. Idempotent; no changes made.
