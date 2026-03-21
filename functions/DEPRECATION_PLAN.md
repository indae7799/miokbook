# Functions Deprecation Plan

## Goal

Retire Firestore-based Cloud Functions safely after confirming production traffic has moved to `apps/web` Supabase routes.

## Decision

Current decision: keep all legacy functions deployed for now, observe actual usage from this point forward, and delete only after the observation record shows they are no longer needed.

Migration baseline:

- As of 2026-03-21, `apps/web` is running on Supabase for application data.
- As of 2026-03-21, Firestore data used by the web app has been migrated to Supabase.
- Legacy Functions are no longer part of the main web request path.

## Current Principle

- Do not remove exports from `functions/src/index.ts` until production callers are verified.
- `apps/web` is already migrated and no longer depends on Firebase callable URLs for the flows below.

## Mapping

| Legacy function | Previous role | Web replacement |
|---|---|---|
| `bulkCreateBooks` | Bulk create books + inventory | `apps/web/src/app/api/admin/books/bulk-create/route.ts` |
| `createOrder` | Create pending order | `apps/web/src/app/api/order/create/route.ts` |
| `confirmPayment` | Toss confirm + inventory update | `apps/web/src/app/api/payment/confirm/route.ts` |
| `cancelOrder` | Customer cancellation | `apps/web/src/app/api/order/cancel/route.ts` |
| `requestReturn` | Return request | `apps/web/src/app/api/order/return/route.ts` |
| `requestExchange` | Exchange request | `apps/web/src/app/api/order/exchange/route.ts` |
| `createReview` | Review creation | `apps/web/src/app/api/review/create/route.ts` |
| `registerEvent` | Event registration | `apps/web/src/app/api/events/register/route.ts` |
| `cancelRegistration` | Event cancellation | `apps/web/src/app/api/events/cancel/route.ts` |
| `syncToMeilisearch` | Firestore trigger sync | `apps/web/src/app/api/admin/books/sync-meilisearch/route.ts` |

## Still Potentially Operational

These need explicit production verification before retirement:

- `expirePendingOrders`
- `syncBookStatus`
- `reserveStock`

Notes:
- `reserveStock` was part of the old create-order/payment pipeline and is likely obsolete, but confirm no external caller remains.
- `expirePendingOrders` may still be the only active scheduled job handling stale pending orders if production depends on it.
- `syncBookStatus` may still be the only scheduled status reconciliation job.

## Safe Retirement Order

1. Confirm no production traffic for callable functions listed in the mapping table.
2. Remove unused callable exports from `functions/src/index.ts`.
3. Deploy functions and verify no missing-caller regressions.
4. Rebuild or retire scheduled jobs.
5. Remove Firestore-based trigger `syncToMeilisearch`.
6. Delete dead source files and update tests.

## Observation-First Process

1. Keep current exports unchanged.
2. From now on, collect production evidence for each function:
   - recent invocation logs
   - caller source if visible
   - whether the behavior is already replaced in `apps/web`
   - whether the function is scheduler/trigger based
3. Record each finding in `functions/OBSERVATION_LOG.md`.
4. Only mark a function as removable after at least one documented review cycle.
5. Remove functions in batches, not all at once.
6. After each removal batch:
   - deploy functions
   - watch logs
   - verify corresponding web flows

## Verification Checklist

- Firebase Functions logs show no recent invocation for deprecated callable names.
- Web flows succeed end-to-end through `apps/web` routes.
- Admin bulk-create and Meilisearch sync work without function triggers.
- Pending order expiration is either still intentionally handled by a scheduler or replaced elsewhere.
- Book status sync is either still intentionally handled by a scheduler or replaced elsewhere.

## Removal Gate

A function is eligible for deletion only when all of the following are true:

- Its replacement path in `apps/web` is already live.
- Production log review shows no meaningful invocation during the agreed observation window.
- No scheduler, trigger, admin console workflow, or external caller still depends on it.
- The decision and evidence are written in `functions/OBSERVATION_LOG.md`.
- The deletion batch has an owner and a rollback plan.

## After Retirement

- Remove Firestore-specific tests in `tests/functions/*` that cover deleted functions.
- Remove Firestore dependencies from the `functions/` package if the package is no longer needed.
- Decide whether to keep `functions/` only for scheduler tasks or delete the package entirely.
