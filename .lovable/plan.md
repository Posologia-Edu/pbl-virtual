
Plan: Build a documented public REST API for external university integrations.

## Approach

Create a Supabase edge function `public-api` that exposes a versioned REST API (`/v1/...`) authenticated via API keys (not Supabase JWTs), so external university systems (SIS, LMS) can integrate. Add a management UI in the admin panel for institution admins to issue/revoke API keys. Add a documentation page explaining endpoints.

## Database changes

New table `api_keys`:
- `id`, `institution_id`, `name`, `key_prefix` (visible, e.g. `pbl_live_abc123`), `key_hash` (sha256 of full key), `scopes` (text[]), `created_by`, `created_at`, `last_used_at`, `revoked_at`, `expires_at`
- RLS: institution admins manage only their institution's keys; superadmin manages all

New table `api_request_log` (audit/observability):
- `id`, `api_key_id`, `institution_id`, `endpoint`, `method`, `status_code`, `created_at`
- RLS: institution admin reads own; insert via service role only

Helper SQL function `hash_api_key(text)` using `digest()` from pgcrypto.

## Edge function: `public-api` (verify_jwt = false)

Routes (all scoped to authenticated key's institution):

- `GET  /v1/health` — ping
- `GET  /v1/institution` — institution info
- `GET  /v1/courses` — list courses (paginated)
- `GET  /v1/courses/:id` — course detail
- `GET  /v1/groups` — list groups
- `GET  /v1/rooms` — list rooms
- `GET  /v1/users` — list members (students/professors) in institution
- `GET  /v1/sessions` — list tutorial sessions
- `GET  /v1/evaluations` — aggregated grades (filter by `course_id`, `student_id`, date range)
- `GET  /v1/attendance` — attendance records
- `POST /v1/users` — provision a student/professor (creates auth user + course membership)
- `POST /v1/courses` — create a course

Auth: header `Authorization: Bearer pbl_live_xxx`. Function hashes the key, looks it up, validates `revoked_at`/`expires_at`, scopes all queries to `institution_id`, logs the request. Returns standard JSON `{ data, meta: { page, total } }` and proper HTTP status codes (401, 403, 404, 422, 429-style messaging without enforcement).

Input validation with `zod`. CORS enabled. Use service role internally but always filter by the key's `institution_id`.

## Frontend

**New tab in `AdminPanel.tsx`: "API & Integrações"** (component `src/components/admin/ApiKeysTab.tsx`):
- List existing keys (name, prefix, last used, status)
- "Create key" dialog → choose name, scopes (read/write), optional expiry → shows full key ONCE with copy button + warning
- Revoke action

**Documentation update in `src/pages/Documentation.tsx`**: add a new "API Pública" section (logged-in only, already gated) with:
- Base URL: `https://vpoqqgnbhqgxikumjitu.supabase.co/functions/v1/public-api`
- Authentication instructions
- Endpoint reference table with example `curl` requests and JSON responses
- Rate-limit note (best-effort, no enforcement) and versioning policy

## Files to create / edit

Create:
- `supabase/functions/public-api/index.ts`
- `src/components/admin/ApiKeysTab.tsx`
- Migration: `api_keys`, `api_request_log`, `hash_api_key()` function, RLS policies

Edit:
- `supabase/config.toml` (register `public-api` with `verify_jwt = false`)
- `src/pages/AdminPanel.tsx` (add new tab)
- `src/pages/Documentation.tsx` (add API reference section)
- `src/i18n/locales/{en,es,pt}.json` (labels)

## Technical notes

- Keys are stored hashed (SHA-256 via pgcrypto); only the prefix is shown after creation
- All queries inside the function are scoped by `institution_id` derived from the key — never trust client-supplied institution IDs
- Write endpoints (`POST /v1/users`, `POST /v1/courses`) require a `write` scope on the key
- Per project rules: no backend rate limiting will be added
- Existing AI provider key pattern (`ai_provider_keys`) is the model for the management UI

## Diagram

```text
External System ──Bearer key──▶ public-api edge fn ──▶ hash+lookup api_keys
                                       │
                                       ├── scope to institution_id
                                       ├── route → courses/groups/users/...
                                       └── log to api_request_log
```
