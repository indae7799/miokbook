# Operations Runbook

## Current Production Shape

- `apps/web` data layer runs on Supabase.
- Firebase remains in active use for Auth and Storage only.
- Firestore is now legacy for the web app.
- `functions/` remains deployed as a legacy safety net and observation target.

## Migration State

- Web route migration: complete
- Firestore to Supabase data migration: complete for current meaningful data
- Explicitly discarded: orphan `eventRegistrations` record referencing missing parent event

## Active Systems

### Supabase

- Primary database for:
  - books
  - inventory
  - cms
  - settings
  - orders
  - reviews
  - events
  - event registrations
  - concerts
  - articles
  - youtube contents
  - bulk orders
  - user profiles

### Firebase

- Auth:
  - login
  - signup
  - token verification
  - admin role claims
- Storage:
  - file upload
  - content image hosting

### Legacy Functions

- Keep deployed for now.
- Do not delete exports without production evidence.
- Track usage in [functions/OBSERVATION_LOG.md](/C:/Users/jungindae/Desktop/온라인미옥/functions/OBSERVATION_LOG.md).

## Startup Checklist

When starting local or verifying deployment:

1. Confirm `apps/web/.env.local` has Supabase keys.
2. Confirm Supabase schema is applied.
3. Start web:
   ```bash
   cd C:\Users\jungindae\Desktop\온라인미옥\apps\web
   npm run dev
   ```
4. Verify key pages:
   - `/`
   - `/books`
   - `/concerts`
   - `/content`
   - `/admin`
5. Verify key APIs:
   - `/api/store/cms-live`
   - `/api/search?q=책`
   - `/api/admin/dashboard`

## Daily Operational Checks

### Web App

- Home page loads without 500
- Book list/search returns data
- Admin dashboard opens
- Order creation path responds normally
- Payment confirm/webhook logs show no unexpected failures

### Supabase

- Table reads/writes succeed in normal flows
- No schema mismatch errors in server logs
- No unexpected RLS failures
- Books and inventory counts remain consistent after admin updates

### Firebase

- Auth login/signup succeeds
- Storage uploads succeed
- No new Firestore-dependent code paths appear in logs

## Incident Triage Order

When something breaks, check in this order:

1. `apps/web` server log
2. Route-specific API response
3. Supabase schema mismatch or missing column
4. Supabase data presence
5. Firebase Auth token verification
6. Firebase Storage upload path
7. Legacy Functions logs only if issue appears tied to old scheduler/trigger behavior

## Common Failure Patterns

### Page opens but content is empty

- Check whether Supabase tables actually contain data.
- Check `cms.home` and `settings.store` first.

### 500 error after route deploy

- Check for missing Supabase columns.
- Check `.env.local` values.
- Check route-specific table names and snake_case fields.

### Admin YouTube (`/api/admin/youtube-content`) 500

- `youtube_contents` had a column named `order`, which conflicts with PostgREST’s `order=` query parameter. Rename it once in Supabase SQL Editor (see `supabase/migrations/20260322_youtube_contents_sort_order.sql`).

### Order or payment state looks wrong

- Check `orders`
- Check `inventory`
- Check `books.sales_count`
- Check whether old scheduler logic in `functions/` is still affecting records

### Admin screen loads but save fails

- Check service role key configuration
- Check Supabase schema for the target table
- Check payload field mapping between camelCase and snake_case

## Legacy Functions Observation Process

1. Leave legacy functions deployed.
2. Review Firebase Functions logs on a fixed cadence.
3. Record evidence in [functions/OBSERVATION_LOG.md](/C:/Users/jungindae/Desktop/온라인미옥/functions/OBSERVATION_LOG.md).
4. Mark each function as:
   - `unknown`
   - `active`
   - `candidate_remove`
   - `keep`
   - `retired`
5. Delete only after:
   - replacement is confirmed live
   - no meaningful usage is observed during the agreed window
   - rollback plan exists

## Recommended Review Cadence

- First 7 days after migration:
  - daily quick check on homepage, search, admin dashboard, order flow
- Days 8 to 14:
  - every 2 to 3 days
- Legacy function review:
  - callable functions: after 7 to 14 days
  - schedulers/triggers: after at least 14 days

## Safe Next Steps

1. Keep operating on Supabase.
2. Update `functions/OBSERVATION_LOG.md` as evidence comes in.
3. Retire callable functions first.
4. Rebuild or retire schedulers after observation confirms they are unnecessary.
