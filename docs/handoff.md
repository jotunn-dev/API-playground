# Handoff — Live Project State

This is the shared state of record between agents. Whoever finishes a step updates it.

---

## Current milestone

**Milestone 1 — Walking skeleton (complete, M1 refactor/hardening pass complete).**

## Current task

M1 UI polish pass is complete. Hand off to **QA_EXPERT** for review, then **SECURITY_OFFICER** for security review of the request executor and auth.

## Status

- [x] M1.1 — Backend skeleton (ASP.NET Core Minimal API, MSSQL via EF, health endpoint, JWT config, executor limits config)
- [x] M1.2 — Auth backend (register, login, /auth/me, JWT HS256 with pinned algorithm, PasswordHasher)
- [x] M1.3 — Frontend skeleton + auth UI (Vite+React+TS, axios instance + Bearer interceptor, login/register forms, localStorage JWT, routing)
- [x] M1.4 — Request executor backend (POST /requests/execute, all security controls implemented)
- [x] M1.5 — Request builder UI (method dropdown, URL, headers, query params, body tab, Send button)
- [x] M1.6 — Response viewer UI (Monaco read-only editor, status badge, duration, headers, truncated banner, copy button)
- [x] M1 hardening — 5-area refactor/hardening pass (IRequestHandler, Result<T> with message, correct HTTP codes, EF migrations, error handling, [FromBody])

## Test results

**Backend (xUnit):** 28/28 passed
- Health: 1 test
- Auth (register, login, /auth/me): 9 tests
- ExecuteRequestHandler unit tests (scheme validation, CRLF, URL length, headers count, happy path, truncation, timeout, connection refused): 10 tests
- ExecuteRequestEndpoint integration tests (no auth, forbidden scheme, invalid URL, invalid header, error body shape): 5 tests
- Misc: 3

**Frontend (Vitest + RTL):** 26/26 passed
- AuthPage: 5 tests
- axiosInstance interceptor: 2 tests
- RequestBuilder: 7 tests (including 3 new: backend unavailable error, 401 error, unexpected throw → unknown_error)
- ResponseViewer: 12 tests (HTML-as-text, truncated banner, copy, language detection)

## What changed in the M1 UI polish pass

### Frontend-only changes (backend untouched)

**Files changed:**
- `src/frontend/src/index.css` — replaced entire Vite boilerplate file with clean minimal reset + design tokens (CSS custom properties). Key fixes: `#root` now has `width: 100%` and no `border-inline` (was `width: 1126px` + `border-inline` causing black sidebars); `body` has explicit `background: var(--color-bg)` (#f5f6fa) so no dark OS body color bleeds through.
- `src/frontend/src/App.css` — replaced entire Vite boilerplate with an empty comment. All boilerplate classes (`.hero`, `.counter`, `#center`, `#next-steps`, etc.) were unused by the app.
- `src/frontend/src/features/auth/AuthPage.tsx` — (1) Fixed React border-shorthand conflict: replaced `border: 'none'` in `tab` style with explicit `borderTop/Right/Left: 'none'` + `borderBottom: '2px solid transparent'`; both `tab` and `activeTab` now only set `borderBottom` — no shorthand/longhand mix. (2) Redesigned card: `borderRadius: 12`, refined shadow, `#111827` heading, `letter-spacing: -0.02em` title. (3) Added focus state for inputs via `focusedField` state + `onFocus`/`onBlur`. (4) Added `success` state — after successful register, shows "Account created — please log in." green banner instead of silently switching tabs.
- `src/frontend/src/features/requestBuilder/RequestBuilder.tsx` — (1) Fixed React border-shorthand conflict: replaced `border: 'none'` in `tab` style with `borderTop/Right/Left: 'none'`; `tab` already had `borderBottom: '2px solid transparent'`, now no shorthand present. (2) Added explicit `sendBtnDisabled` style (`opacity: 0.5, cursor: not-allowed`) composited at render time. (3) Refined colors to design tokens (`#e5e7eb` borders, `#f5f6fa` method select bg, `#111827` text).
- `src/frontend/src/features/requestBuilder/AppPage.tsx` — Redesigned header: `background: '#18181b'` (near-black zinc) instead of `#1a1a2e`; layout now has explicit `display: 'flex', flexDirection: 'column', width: '100%'` to ensure full-viewport fill. `maxWidth` on `main` increased to 1200px.
- `src/frontend/src/features/responseViewer/ResponseViewer.tsx` — (1) `sectionLabel` updated to uppercase, smaller font, letter-spacing developer-tool style. (2) Status badge font-size reduced to `0.85rem`. (3) Alternating header row backgrounds. (4) Idle state uses dashed `#e5e7eb` border. (5) Idle text extracted to `idleText` style for explicit color.

**Build result:** PASS — 0 TypeScript errors, vite build succeeded.
**Test result:** PASS — 26/26 tests passed (4 test files).

**Border warning fix explanation:** React warns when you spread `{ border: 'none' }` (shorthand) with `{ borderBottom: '...' }` (longhand) because they semantically conflict. The fix removes the `border` shorthand from `tab` styles in both `AuthPage.tsx` and `RequestBuilder.tsx`, replacing it with four explicit directional properties (`borderTop`, `borderRight`, `borderLeft`, `borderBottom`). Now both `tab` and `activeTab` only touch `borderBottom` — spreading them together is conflict-free.

**Black sidebar fix explanation:** `index.css` had `#root { width: 1126px; border-inline: 1px solid var(--border); text-align: center; }`. This constrained the root to 1126px, drew visible side borders, and centered text globally. The body background was also not set, so the OS/browser default (dark on some systems) bled through as black bars. The new `index.css` sets `#root { width: 100%; }` (no border-inline) and `body { background: var(--color-bg); }` (explicit #f5f6fa light gray), eliminating the sidebars entirely.

---

## What changed in the M1 hardening pass

### Change 1 — Frontend error handling (requestApi.ts + RequestBuilder.tsx)
- `src/frontend/src/shared/api/requestApi.ts` — `executeRequest` now wraps the axios call in try/catch and always resolves. Maps error cases to typed `ExecuteError`:
  - No response (ECONNREFUSED/backend down): `backend_unavailable`
  - HTTP 401: `unauthorized`
  - HTTP 403: `forbidden`
  - HTTP 4xx/5xx with `{ error, message }` body: propagates backend error fields
  - HTTP 502: `request_failed` / "target server unreachable"
  - HTTP 504: `request_failed` / "request timed out"
  - Other HTTP errors: `request_failed` with status code
  - Non-axios: `unknown_error`
- `src/frontend/src/features/requestBuilder/RequestBuilder.tsx` — `handleSend()` now has `try/catch/finally` instead of bare `finally`.
- `src/frontend/src/features/requestBuilder/RequestBuilder.test.tsx` — 3 new tests: backend unavailable, 401, unexpected throw.

### Change 2 — EF Core migrations (replacing EnsureCreated)
- `src/backend/ApiPlayground.Api/Program.cs` — Replaced `db.Database.EnsureCreated()` with `db.Database.Migrate()` (with `IsRelational()` guard so in-memory test DB falls back to `EnsureCreated()`).
- `src/backend/ApiPlayground.Api/Migrations/` — Initial migration `InitialCreate` created, captures Users table schema.

### Change 3 — Correct HTTP status codes for executor errors
- `src/backend/ApiPlayground.Api/Features/RequestExecution/Execute/ExecuteRequestEndpoint.cs` — Thin endpoint using `IRequestHandler` + `Result.ToHttpResult()`.
- `src/backend/ApiPlayground.Api/Shared/Results/ResultExtensions.cs` — Added 502 and 504 status code mappings; error body now includes `{ error, message }`.
- `src/backend/ApiPlayground.Api/Shared/Results/Result.cs` — Added `Message` property to `Result<T>` to separate error code from human-readable message.
- Error → HTTP mapping:
  - `forbidden_scheme`, `invalid_url`, `invalid_header` → 400 Bad Request
  - `timeout` → 504 Gateway Timeout
  - `connection_refused`, `dns_failure` → 502 Bad Gateway
  - Other → 500 Problem

### Change 4 — IRequestHandler abstraction
- `src/backend/ApiPlayground.Api/Shared/Results/IRequestHandler.cs` — New interface `IRequestHandler<TRequest, TResponse>`.
- `RegisterHandler`, `LoginHandler` — Implement `IRequestHandler<...>`.
- `ExecuteRequestHandler` — Refactored from returning `(ExecuteRequestResponse?, ExecuteRequestError?)` tuple to `Result<ExecuteRequestResponse>`. Implements `IRequestHandler<ExecuteRequestRequest, ExecuteRequestResponse>`.
- `Program.cs` — DI now registers `IRequestHandler<TReq, TRes>` → concrete handlers.
- All three endpoints depend on the interface, not the concrete class.

### Change 5 — Explicit [FromBody] binding attributes
- `RegisterEndpoint.cs`, `LoginEndpoint.cs`, `ExecuteRequestEndpoint.cs` — All POST endpoints have explicit `[FromBody]` on the request DTO parameter.

### Bonus fixes (pre-existing build errors)
- `src/frontend/src/features/auth/AuthPage.tsx` — `FormEvent` now imported as `type FormEvent` (verbatimModuleSyntax compliance).
- `src/frontend/src/shared/api/axiosInstance.test.ts` — Removed unused `vi` and `axios` imports.
- `src/frontend/vite.config.ts` — Changed `import { defineConfig } from 'vite'` to `import { defineConfig } from 'vitest/config'` so the `test` key is recognized.

## Migration workflow

```bash
# Apply migrations (dev — done automatically at startup via db.Database.Migrate())
cd src/backend
dotnet ef database update --project ApiPlayground.Api --startup-project ApiPlayground.Api

# Create a new migration after schema changes
dotnet ef migrations add <MigrationName> --project ApiPlayground.Api --startup-project ApiPlayground.Api

# Remove last migration (if not yet applied)
dotnet ef migrations remove --project ApiPlayground.Api --startup-project ApiPlayground.Api
```

## How to run

### Backend prerequisites
- .NET 8 SDK
- SQL Server or LocalDB (for dev, `(localdb)\mssqllocaldb` is configured)

### Run backend
```bash
cd src/backend/ApiPlayground.Api
dotnet run
# API listens on http://localhost:5000 (or https://localhost:5001)
```

On first run, `db.Database.Migrate()` applies the `InitialCreate` migration automatically (dev mode).

To use a different SQL Server instance, update the connection string in `appsettings.Development.json`.

### Run frontend
```bash
cd src/frontend
cp .env.example .env.development   # already exists with VITE_API_URL=http://localhost:5000
npm install
npm run dev
# Opens at http://localhost:5173
```

### Run tests
```bash
# Backend
cd src/backend
dotnet test

# Frontend
cd src/frontend
npm test
```

## Manual demo flow

1. Open `http://localhost:5173`
2. On the Register tab, enter email + password (min 8 chars) → Create Account
3. Switch to Login tab → Login → redirected to `/app`
4. In the request builder, set method to GET, URL to `https://httpbin.org/get`
5. Add a header: `Accept` / `application/json`
6. Click Send
7. See the response: status 200, duration, headers (expandable), body in Monaco with JSON highlighting
8. Try `file://etc/passwd` → see `forbidden_scheme` error (400 in the network, displayed as error banner)
9. Logout → redirected to `/auth`

## What QA should check

- Register: duplicate email returns 409, invalid email returns 400, short password returns 400
- Login: wrong password → 401, unknown email → 401; success returns a valid JWT
- /auth/me: no token → 401, expired token → 401, valid token → returns email claim
- Executor: `file://`, `ftp://`, `gopher://` → `forbidden_scheme` error → HTTP 400 (not 200)
- Executor: timeout → HTTP 504 (not 200)
- Executor: connection refused → HTTP 502 (not 200)
- Executor: CRLF in headers → 400
- Executor: error body always has both `error` and `message` fields
- Frontend: backend unavailable → `backend_unavailable` error shown in ResponseViewer
- Frontend: 401 → `unauthorized` error shown in ResponseViewer
- Frontend: HTML response shown as escaped text in Monaco — no live DOM rendering
- Frontend: copy button writes to clipboard
- Frontend: token cleared from localStorage on logout

## What SECURITY_OFFICER should check

### Auth (M1.2)
- Passwords hashed with `PasswordHasher<User>` (PBKDF2-SHA256 under the hood)
- JWT: HS256 algorithm pinned via `ValidAlgorithms`, issuer/audience/expiry validated, `ClockSkew = TimeSpan.Zero`
- JWT signing key read from config — dev key is clearly labeled placeholder
- No password leakage in error responses (we return generic "Invalid credentials." for all auth failures)

### Request Executor (M1.4) — MANDATORY security review
- **Protocol allow-list**: `ExecuteRequestHandler` — rejects anything not `http`/`https` with `forbidden_scheme` error → HTTP 400 ✓
- **Request timeout**: `CancellationTokenSource` with configurable `Executor:TimeoutSeconds` (default 30s) → HTTP 504 ✓
- **Max response size**: streaming read with byte counter; sets `truncated = true` and stops reading at limit ✓
- **CRLF injection guard**: checks each header key/value for `\r` or `\n` → HTTP 400 ✓
- **Input size bounds**: URL max 2048, headers max 50, body max 10MB ✓
- **Host header not forwarded**: `Host` header skipped in forwarding loop ✓
- **DEV MODE comment**: `// DEV MODE: private/loopback targets are intentionally allowed. Do not expose to untrusted users.` ✓
- **Named HTTP client**: `IHttpClientFactory.CreateClient("executor")` used — never `new HttpClient()` ✓
- **No HTML rendering**: Frontend uses Monaco `readOnly: true` with language hint only — never `innerHTML` or `dangerouslySetInnerHTML` ✓
- **Global exception handler**: 500 errors return `{ error: "internal_error", message: "An unexpected error occurred." }` — no stack traces ✓

### Residual risk (same as planned)
- Private/loopback targets are reachable (DEV MODE — intentional, documented)
- JWT in localStorage (accepted MVP trade-off — no XSS via innerHTML because of Monaco viewer)

## Security review log

| Date | Reviewer | Subject | Verdict | Residual risk |
|------|----------|---------|---------|---------------|
| — | SECURITY_OFFICER | Request executor + auth | Pending | DEV MODE SSRF as planned |

## Decisions log

| Date | Decision |
|------|----------|
| 2026-06-27 | Adopted role-based AI workflow, vertical-slice-first, one milestone at a time. |
| 2026-06-27 | SSRF mode = DEV MODE. Local/private targets allowed. Always-on: http/https, timeout, max size, dangerous schemes blocked. |
| 2026-06-27 | Auth identity = email. |
| 2026-06-27 | Response viewer = Monaco (read-only, no live HTML). |
| 2026-06-27 | Optional features: cURL parsing in scope after core; mock endpoints lower priority. |
| 2026-06-27 | Architecture: feature → use-case vertical slices, thin endpoints, DI-resolved handlers, no MediatR. |
| 2026-06-28 | Storage: MSSQL (not SQLite) — using EF Core SqlServer provider, Migrate() for dev, InitialCreate migration checked in. |
| 2026-06-28 | M1 hardening: IRequestHandler abstraction, Result<T> with Message, correct HTTP codes (400/502/504), EF migrations, [FromBody], frontend error handling. |
