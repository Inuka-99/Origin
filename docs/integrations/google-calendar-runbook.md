# Google Calendar — Verification Runbook

This runbook walks a human operator through the four verification steps
described in the pickup brief. Each step states exactly what to do and how to
prove it worked.

> Preflight blockers discovered during verification — must be cleared before
> step 1 can succeed. See "Blockers" at the bottom.

## 0. Apply the Supabase migration (blocker)

The two tables `google_calendar_connections` and `google_calendar_task_events`
do not exist yet in the target Supabase project. Verified by reading the
PostgREST OpenAPI spec at `${SUPABASE_URL}/rest/v1/` — only these tables are
exposed: `activity_log, activity_logs, attachments, comments, notifications,
profiles, project_members, projects, task_assignments, tasks, time_entries`.

Apply `supabase/migrations/create_google_calendar_integration.sql` against
the linked project, e.g.:

```
supabase link --project-ref tjbvqxwkcjekodagkzwl
supabase db push
```

or paste the file's contents into the SQL editor in the Supabase dashboard.
Then re-run the probe:

```
node supabase-check-3.mjs
# expect: has google_calendar_connections: true
#         has google_calendar_task_events: true
```

## 1. Browser OAuth round-trip

**Prerequisites:** step 0 applied, plus the callback redirect bug below
resolved (controller redirects to `/settings/integrations`, but the frontend
router only registers `/settings` — so the user currently lands on an
unmatched route and never sees the success toast).

1. Start the stack:
   - Backend: `cd server && node dist/main.js` (3000).
   - Frontend: `npm run dev` (5173).
2. Log into the app at http://localhost:5173.
3. Go to **Settings → Integrations → Google Calendar** and click
   **Connect Google Calendar**.
4. Complete Google consent (select the `calendar.events` scope).
5. Expect a redirect to `http://localhost:5173/settings?google=connected`
   (after the redirect fix) and the "Connected" state to appear.

### Verification queries

Use `supabase-check.mjs` (already written at
`/sessions/gifted-quirky-ptolemy/supabase-check.mjs`). It reads
`server/.env`, never echoes the service role key or token values, and
reports refresh tokens only by presence.

Expected results after a successful connect:

```
— google_calendar_connections —
HTTP 200 rows: 1
{"id":"…","user_id":"auth0|…","google_email":"…","refresh_token":"[PRESENT len=…]",
 "access_token":"[PRESENT len=…]","calendar_id":"primary","scopes":["…"],
 "source":"standalone_oauth","needs_reconnect":false,"created_at":"…","updated_at":"…"}
```

After creating a task with a `due_date`:

```
— google_calendar_task_events —
HTTP 200 rows: 1
{"task_id":"…","user_id":"auth0|…","google_event_id":"…","calendar_id":"primary",…}
```

Also confirm the event appears in the user's Google Calendar UI at the
chosen due date/time.

## 2. Auth0 M2M (zero-click federated path)

Currently `AUTH0_MGMT_CLIENT_ID`, `AUTH0_MGMT_CLIENT_SECRET`, and
`AUTH0_MGMT_AUDIENCE` are all empty in `server/.env`. The three keys already
exist in `server/.env.example`, so no new variables are needed.

1. Auth0 Dashboard → **APIs → Auth0 Management API → Machine-to-Machine
   Applications** → **Authorize** an M2M app for this tenant.
2. Grant scopes: `read:users`, `read:user_idp_tokens`.
3. Copy the M2M app's **Client ID** and **Client Secret**.
4. Paste into `server/.env`:
   - `AUTH0_MGMT_CLIENT_ID=…`
   - `AUTH0_MGMT_CLIENT_SECRET=…`
   - Leave `AUTH0_MGMT_AUDIENCE` empty — the service derives
     `https://${AUTH0_DOMAIN}/api/v2/` from `AUTH0_DOMAIN`.
5. Rebuild and restart backend:
   ```
   cd server && npx nest build && node dist/main.js
   ```
6. Sign in as a user who originally logged in via "Continue with Google"
   (i.e. Auth0 sub starts with `google-oauth2|…`).
7. Call `GET /api/integrations/google/status` with the user's JWT. Expect:
   ```
   { "connected": true, "source": "auth0_federated", ... }
   ```

## 3. Auth0 Google connection scope

1. Auth0 Dashboard → **Authentication → Social → Google**.
2. Add scope `https://www.googleapis.com/auth/calendar.events` to the
   connection.
3. Toggle **Sync user profile attributes at each login** ON.
4. Any existing Google-login user must **log out and log back in** and
   accept the new consent prompt. Without this, Auth0 won't have a fresh
   Google access token for them and the federated path will still return
   `needs_reconnect`.

## 4. Security — rotate leaked SA key

A GCP service-account key with id `afd6b321e776cec5f2f7b4399aaaea7d68e53d69`
on `origin@electric-rhino-493918-t6.iam.gserviceaccount.com` was pasted in a
previous chat. That key is unrelated to this feature (this integration uses
per-user OAuth, not service-account auth), but it should still be rotated.

1. GCP Console → **IAM & Admin → Service Accounts** →
   `origin@electric-rhino-493918-t6.iam.gserviceaccount.com`.
2. **Keys** tab → delete the key with id prefix `afd6b321…`.
3. If the key was in use elsewhere, create a new one and distribute through
   a secret manager. Do not paste the new key into chat.

---

## Blockers (must fix before step 1 can pass)

### B1. Supabase migration not applied

- Evidence: PostgREST OpenAPI spec does not list either
  `google_calendar_connections` or `google_calendar_task_events`; direct
  `SELECT` returns `PGRST205 Could not find the table 'public.…' in the
  schema cache`.
- Fix: apply `supabase/migrations/create_google_calendar_integration.sql`.

### B2. OAuth callback redirect URL doesn't match the React router

- `server/src/integrations/google-calendar/google-calendar.controller.ts`
  line 78 and line 87 redirect to
  `${FRONTEND_URL}/settings/integrations?google=…`.
- `src/app/routes.ts` line 128 only registers `/settings` — there is no
  `/settings/integrations` route.
- `src/app/components/GoogleCalendarCard.tsx` lines 70–82 read
  `?google=connected` / `?google=error` from the current URL on mount, so
  the card *does* pick up the param, but only if the user ends up on the
  Settings page. Today they land on an unmatched route.
- `docs/integrations/google-calendar.md` line 74 mirrors the broken
  `/settings/integrations` URL and should be updated when the controller
  is fixed.
- Fix options (pick one):
  - Change the two redirects to `${FRONTEND_URL}/settings?google=…` to
    match the existing router and the brief's stated expected URL; update
    the doc table on line 74 to match.
  - OR add a `/settings/integrations` route in `src/app/routes.ts` that
    renders the Settings page.
