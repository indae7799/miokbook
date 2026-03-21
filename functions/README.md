# Functions Status

This package is now legacy relative to `apps/web`.

Current state:
- `apps/web` no longer depends on Firebase callable functions for orders, payments, reviews, events, or bulk book creation.
- `apps/web` uses Supabase directly for data access and mutations.
- Firestore data needed by `apps/web` has already been migrated to Supabase.
- Firebase is still used in the web app for Auth token verification and Storage upload flows.

What remains here:
- Old callable functions implemented on top of Firestore
- Old scheduled jobs implemented on top of Firestore
- Old Firestore-triggered Meilisearch sync

Operational guidance:
- Do not delete exported functions blindly. A deploy after removing exports will delete deployed functions.
- Before retiring any function here, confirm there are no remaining external callers, cron dependencies, or console triggers in production.
- Current policy: keep legacy functions in place, observe real production usage, and retire only after usage evidence is recorded.
- If this package is migrated later, prefer one of these paths:
  1. Remove unused callable functions first, after production traffic verification.
  2. Rebuild scheduled jobs against Supabase if they are still operationally needed.
  3. Retire the Firestore trigger-based Meilisearch sync because `apps/web` now writes to Supabase, not Firestore.

Suggested migration order:
1. `search/syncToMeilisearch.ts`
2. `cleanup/expirePendingOrders.ts`
3. `cleanup/syncBookStatus.ts`
4. Remaining callable functions in `order/`, `review/`, `events/`, `inventory/`

Related docs:
- `functions/DEPRECATION_PLAN.md`
- `functions/OBSERVATION_LOG.md`
- `../OPERATIONS_RUNBOOK.md`
