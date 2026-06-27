# Implementation Plan — API Playground

**Guiding principle (standing hackathon lesson): do not build all foundation first. Get to a clickable vertical slice as fast as possible, then layer.**

Milestones are sequenced so that the end-to-end flow works early, then is enriched. **One milestone at a time. One task at a time, human-approved.**

---

## Milestone 0 — Workflow & planning (this milestone)

Set up the AI workflow and planning docs. **No application code.**

- [x] CLAUDE.md, agents, rules.
- [x] requirements, implementation plan, handoff, demo script.
- **Done when:** docs exist and the human approves moving to M1.

---

## Milestone 1 — Walking skeleton (thinnest end-to-end slice)

Goal: a deployed-locally app where a user can register, log in, send one hard-coded-shape request through the backend executor, and see the response. Minimal polish; prove the wire.

See the detailed task breakdown below. Decisions applied: **email** auth, **dev-mode** executor (local/private allowed; http/https only, timeout, max size, dangerous schemes blocked), **Monaco** code-editor response viewer.

**Milestone 1 done when:** register (email) → login → build request → backend executes → formatted response appears in the Monaco viewer, end to end, with security controls in place and SECURITY_OFFICER-reviewed.

### M1 detailed task breakdown (awaiting human approval)

Each task is small, independently reviewable, and ordered to reach the clickable slice fast. Each goes through DEV → QA → (SECURITY where noted) → docs/handoff → human acceptance. **Do not start until the human approves this breakdown.**

| # | Task | Scope / deliverables | Tests | Reviews |
|---|------|----------------------|-------|---------|
| **M1.1** | **Backend skeleton** | Minimal API solution; `Features/*` + `Shared/*` folders scaffolded (empty stubs ok); SQLite connection wired via `Shared/Database`; `GET /health` returns ok; `IHttpClientFactory` registered; config for JWT key + executor limits (timeout, max size) read from settings. Runs with `dotnet run`. | Smoke test: app boots, `/health` 200. | QA |
| **M1.2** | **Auth — backend** | `Features/Auth`: `POST /auth/register` (email + password, hashed via `PasswordHasher`, duplicate-email rejected), `POST /auth/login` (returns signed JWT with expiry; bad creds → 401). JWT validation wired (algorithm pinned, issuer/audience/expiry validated). A protected `GET /auth/me` to prove the gate. | Register success/duplicate; login success/invalid; protected endpoint rejects missing/invalid/expired token. | QA, **SECURITY** |
| **M1.3** | **Frontend skeleton + auth UI** | Vite + React + TS app; `shared/api` single axios instance with Bearer interceptor reading `localStorage`; `features/auth` register + login forms (email); store JWT in `localStorage`; basic routing + authed/unauthed shell; logout clears token. | Component tests: login form submits + stores token; interceptor attaches header; unauthed redirect. | QA |
| **M1.4** | **Request executor — backend (core risk)** | `Features/RequestExecution`: `POST /requests/execute` accepts `{method, url, headers[], queryParams[], body}`; builds + sends via `IHttpClientFactory`; returns `{status, durationMs, headers[], body, contentType, truncated}`. **Always-on controls:** http/https only + block other schemes; request timeout; max response size (abort + flag `truncated`); reject CRLF/header injection; bound input sizes. **Dev mode:** local/private targets allowed (documented). Clean error envelope for DNS/refused/timeout/oversize. | Happy path; timeout fires; oversized response truncated; `file:`/`ftp:`/`gopher:` rejected; header-injection rejected; connection error → clean error. | QA, **SECURITY (mandatory, blocking)** |
| **M1.5** | **Request builder UI** | `features/requestBuilder`: method dropdown, URL field, headers editor (key/value rows), query-params editor, body editor; **Send** posts the request definition to `/requests/execute`. | Component tests: builds a valid payload; Send calls the API client. |  QA |
| **M1.6** | **Response viewer UI (Monaco)** | `features/responseViewer`: show status, duration, response headers; render body in a **read-only Monaco editor** with language auto-detect (json/html/xml/text), syntax highlighting, line numbers, copy. **No `innerHTML`/`dangerouslySetInnerHTML`; HTML shown as escaped source only.** Handle `truncated` flag. | Component test: HTML body is shown as text, not rendered; copy works; language switches by content-type. | QA, **SECURITY** (no-DOM-injection check) |

**Suggested order:** M1.1 → M1.2 → M1.3 → M1.4 → M1.5 → M1.6. (M1.4 is the highest-risk and gates the slice; M1.5/M1.6 light it up end to end.)

---

## Milestone 2 — Persistence: saved requests, collections, history

Goal: requests can be saved and revisited; executions are recorded.

1. **Saved requests + collections.** `Features/SavedRequests`, `Features/Collections`: CRUD scoped per user; group into collections; **mask/warn sensitive headers** on save. Tests for ownership scoping.
2. **History.** `Features/History`: record each execution per user; list endpoint. Tests for creation/ordering/scoping.
3. **Frontend.** `features/collections` + `features/history` UI: save current request, list saved requests, view history, load a request back into the builder.

**Milestone 2 done when:** save a request → see it in a collection → see the execution in history (steps 9–10 of the core slice).

---

## Milestone 3 — Optional enhancements (only after M1–M2 are accepted)

Pick up only after the core slice (M1–M2) is accepted. Priority order below.

1. **cURL parser (O1) — higher of the two.** `shared/utils` parser → request builder. Untrusted input; never throws on malformed input. Tests for parsing edge cases (quoting, multiple `-H`, `-d`/`--data`, methods, missing pieces). QA review for robustness. **Must not be built before the core vertical slice works.**
2. **Mock endpoints (O2) — lower priority.** `Features/MockEndpoints` + `features/mockEndpoints`: define simple in-app endpoints returning configured responses, usable as safe demo targets. Only if time remains after the core flow and cURL parsing.

---

## Milestone 4 — Hardening, docs, demo

1. **Security pass.** SECURITY_OFFICER full review; finalize SSRF documentation and the current-mode allowance statement.
2. **QA pass.** Coverage review across auth, executor, saved requests, history, parser.
3. **Docs.** DOCS_WRITER: README, finalize [demo-script.md](demo-script.md), milestone summary, lessons learned.

---

## Sequencing rules

- Within M1, the **executor (task 4) must pass SECURITY_OFFICER review** before the slice is considered complete.
- Do not begin M2 until M1 is accepted by the human.
- Optional features (M3) never precede the core slice.
- Every task: implement (DEV_LEAD) → QA → Security (if applicable) → docs/handoff update → human acceptance.
