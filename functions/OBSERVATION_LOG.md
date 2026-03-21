# Functions Observation Log

Use this file to record real production usage evidence before deleting legacy Firebase Functions.

## Policy

- Do not delete a legacy function based on code inspection alone.
- Record observations from this point forward.
- Update this log whenever logs, dashboards, or operational checks provide new evidence.

## Recommended Observation Window

- Callable functions: at least 7 to 14 days
- Scheduled jobs: at least 14 days
- Trigger-based jobs: at least one full admin/content update cycle

## Status Legend

- `unknown`: no verified production evidence yet
- `active`: confirmed production usage exists
- `candidate_remove`: no meaningful usage observed and replacement confirmed
- `keep`: still intentionally needed
- `retired`: removed from deployment

## Log Template

| Function | Type | Web Replacement | Status | Last Checked | Evidence | Decision |
|---|---|---|---|---|---|---|
| `bulkCreateBooks` | callable | `apps/web/src/app/api/admin/books/bulk-create/route.ts` | `unknown` | - | Web path replaced; production logs not yet reviewed | keep until verified |
| `createOrder` | callable | `apps/web/src/app/api/order/create/route.ts` | `unknown` | - | Web path replaced; production logs not yet reviewed | keep until verified |
| `confirmPayment` | callable | `apps/web/src/app/api/payment/confirm/route.ts` | `unknown` | - | Web path replaced; production logs not yet reviewed | keep until verified |
| `cancelOrder` | callable | `apps/web/src/app/api/order/cancel/route.ts` | `unknown` | - | Web path replaced; production logs not yet reviewed | keep until verified |
| `requestReturn` | callable | `apps/web/src/app/api/order/return/route.ts` | `unknown` | - | Web path replaced; production logs not yet reviewed | keep until verified |
| `requestExchange` | callable | `apps/web/src/app/api/order/exchange/route.ts` | `unknown` | - | Web path replaced; production logs not yet reviewed | keep until verified |
| `createReview` | callable | `apps/web/src/app/api/review/create/route.ts` | `unknown` | - | Web path replaced; production logs not yet reviewed | keep until verified |
| `registerEvent` | callable | `apps/web/src/app/api/events/register/route.ts` | `unknown` | - | Web path replaced; production logs not yet reviewed | keep until verified |
| `cancelRegistration` | callable | `apps/web/src/app/api/events/cancel/route.ts` | `unknown` | - | Web path replaced; production logs not yet reviewed | keep until verified |
| `reserveStock` | callable | none | `unknown` | - | Legacy pipeline helper; may already be unused | verify before delete |
| `expirePendingOrders` | scheduler | none | `unknown` | - | May still be the only pending-order expiry job | verify before delete |
| `syncBookStatus` | scheduler | none | `unknown` | - | May still be the only scheduled status sync | verify before delete |
| `syncToMeilisearch` | trigger | `apps/web/src/app/api/admin/books/sync-meilisearch/route.ts` | `unknown` | - | Web sync path exists; trigger may still run for old Firestore writes | verify before delete |

## Per-Check Notes

Add dated notes below when reviewing logs.

### YYYY-MM-DD

- Reviewer:
- Source checked:
- Functions reviewed:
- Findings:
- Next action:

### 2026-03-21

- Reviewer: Codex + operator
- Source checked: repository migration state, local web verification, Firestore to Supabase migration run
- Functions reviewed: all currently exported legacy functions
- Findings: `apps/web` no longer depends on Firebase callable functions for primary user and admin flows. Local verification confirmed the Supabase-backed site renders correctly after data migration. Legacy Functions remain deployed only as a safety net pending production log observation.
- Next action: observe Firebase Functions logs for 7 to 14 days before removing callable functions, then review schedulers and trigger-based jobs separately.
