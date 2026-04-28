# Scalability — Sprint 8

Owner: Inuka
Status: First pass landed. See *Next steps* for follow-up work.

## What this work covers

The story was: *"System must support increasing numbers of users
and projects without performance degradation."* That's broad, so
the scope was bounded to the hot paths surfaced by the current
codebase — list endpoints, role lookups on every request, the
member candidate search, and the frontend's polling habits.

### Assumed targets

We sized the changes for these working assumptions. Update them
once we have real telemetry.

| Dimension       | Target              |
|-----------------|---------------------|
| Total users     | up to ~10,000       |
| Active users    | up to ~500 concurrent |
| Projects        | up to ~5,000        |
| Tasks/project   | up to a few thousand |
| Activity log    | bounded by retention; hundreds of writes/min peak |

These are headroom targets, not guarantees. Anything beyond the
ranges above probably needs the *Next steps* work.

## What changed

### Database

- `supabase/migrations/add_scalability_indexes.sql` adds the
  indexes the application code actually needs:
  - `tasks(project_id, created_at DESC)` — backs every `listByProject`
    and the membership-filtered `listForUser`.
  - `tasks(assigned_to)` partial index — supports future
    "assigned to me" views without bloating the index for unassigned
    rows.
  - `task_assignments(task_id)` and `(user_id)` — `attachTaskAssignees`
    does an `IN (taskIds)` lookup that was previously a sequential
    scan.
  - `project_members(user_id, project_id)` and the reverse — every
    permission check (`assertProjectMember` / `assertProjectAdmin`)
    needs this composite key.
  - `projects(created_at DESC)` — list ordering.
  - `profiles(lower(email))` plus `pg_trgm` GIN indexes on
    `full_name` and `email` — backs case-insensitive lookups and
    the new server-side fuzzy search (see member candidates below).

### Server (NestJS)

- **Pagination on list endpoints.** `/tasks`, `/tasks/project/:id`,
  and `/projects` now accept `?page=` and `?limit=` query params
  and return `{ data, total, page, limit }`. Default page size 50,
  hard cap 200 (`server/src/common/pagination.ts`). The previous
  behaviour returned every row, which fell over for admins on a
  large table.

- **Role lookup cache.** `UserRoleCache` (60s TTL, 10k entry cap)
  removes the per-request Postgres round-trip that `getUserRole`
  used to perform on every authenticated route. Cache is
  invalidated by `UsersService.updateRole`.

- **Rate limiting.** `RateLimitMiddleware` is wired in
  `AppModule` for every authenticated route. 120 req/min/identity
  by default, with `X-RateLimit-*` headers and `Retry-After` on
  429s. Identity is the authenticated user id when present, else
  the client IP.

- **Member candidate search.** Previously fetched all profiles into
  memory and filtered with `String.includes` — that was the
  worst-case query at scale. Now uses Supabase `or(ilike, ilike)`
  with a `LIMIT 50`, backed by the trigram indexes above.

- **Activity log module wired.** `ActivityLogModule` was defined
  but never imported in `AppModule`. It is now, so the
  `/activity-logs` routes work.

### Frontend (React)

- **Both hooks tolerate the new envelope.** `useTasks` and
  `useProjects` accept either `Task[]` / `Project[]` or
  `{ data, total, page, limit }` so the client and server can
  deploy independently.
- **Aggressive polling reduced.** The 30-second poll in `useTasks`
  is gone — we already have a real-time channel for tasks.
  `useProjects` was reduced to a 60-second background refresh,
  since projects change far less often than tasks.
- **Request abort on unmount/refetch.** Both hooks now use
  `AbortController` so a slow response can't overwrite fresher
  state and unmounted components don't trigger React warnings.

## How to verify

```bash
# Server
cd server && ./node_modules/.bin/tsc --noEmit -p tsconfig.json

# DB migration
# Apply via Supabase CLI or paste into the SQL editor:
#   supabase/migrations/add_scalability_indexes.sql

# Manual smoke test
curl -H "Authorization: Bearer <token>" \
     "$API/tasks?page=1&limit=20"
# -> { data: [...], total, page, limit }
```

## Next steps (post-Sprint 8)

These are the changes that need real load data before we commit to
them.

1. **Shared cache.** `TtlCache` and `RateLimitMiddleware` are
   per-process. Once we run more than one server replica, swap
   both for a Redis-backed implementation (e.g. `@nestjs/throttler`
   with redis-storage, and a Redis-backed user role cache). The
   API surface of `UserRoleCache` is intentionally narrow so this
   is a one-file swap.
2. **Cursor pagination for the activity feed.** Offset pagination
   is fine up to a few thousand rows; the activity log will outgrow
   that fast. Switch to `?after=<created_at>&id=<uuid>` once the
   feed becomes a perf concern.
3. **Read replica for hot reads.** Project lists and task lists
   are read-heavy. Once Postgres CPU climbs, point the read paths
   at a Supabase read replica and keep writes on the primary.
4. **Realtime channel sharding.** `tasks.service.ts` broadcasts
   every event on a single global `tasks` channel. With many
   concurrent users this becomes a fan-out problem. Per-project
   channels are the obvious fix.
5. **Load testing.** None of the assumptions in this doc are
   measured. Run k6 / Artillery against staging at the assumed
   targets before declaring this story done at scale.
