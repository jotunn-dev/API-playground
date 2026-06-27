# API Playground

A small, browser-based developer tool inspired by Postman — but deliberately narrow. The product lets a developer build an HTTP request, have the **backend** execute it against a target URL, and inspect a formatted response. Requests can be saved into collections and reviewed in history.

This is **not** a Postman clone and **not** Swagger. It is one strong MVP vertical slice.

## What this app is

- Build an HTTP request: method, URL, headers, query params, body.
- The **API Playground backend executes the request** (never the browser directly).
- Inspect response: status, duration, headers, formatted body.
- Save requests into collections.
- View request history.
- Optional: paste a cURL command → parse into the request builder.
- Optional: create in-app mock endpoints as demo targets.

## Tech stack

- **Backend:** ASP.NET Core / .NET, Minimal API.
- **Frontend:** React + TypeScript + Vite, axios.
- **Backend HTTP client:** `IHttpClientFactory` / `HttpClient`.
- **Storage:** SQLite.
- **Auth:** JWT register/login. JWT stored in `localStorage` (MVP), attached via axios interceptor.
- **Architecture:** feature-based vertical slice / modular monolith.

## Repository layout (target)

Backend = feature → **use case** slices with **thin endpoints + DI-resolved handlers** (no business logic in endpoints; prefer simple MediatR-like handler classes without the MediatR package). See [.claude/rules/architecture.md](.claude/rules/architecture.md).

```
backend/
  Features/
    Auth/Register/        # RegisterEndpoint, RegisterHandler, RegisterRequest, RegisterResponse (+validator, tests)
    Auth/Login/
    RequestExecution/Execute/
    SavedRequests/...     # one folder per use case
    Collections/...
    History/...
    MockEndpoints/...
  Shared/                 # infra only: Database, Security, Http, Results, Validation
frontend/
  src/features/auth
  src/features/requestBuilder
  src/features/responseViewer
  src/features/collections
  src/features/history
  src/features/mockEndpoints
  src/shared/api
  src/shared/ui
  src/shared/utils
docs/
.claude/
```

## How we work (AI workflow)

This project is built by a team of role-based Claude subagents. Each milestone flows through:

1. **PM_LEAD** — planning, scope control, task breakdown.
2. **DEV_LEAD** — implementation.
3. **QA_EXPERT** — critical-logic review.
4. **SECURITY_OFFICER** — security review (mandatory for the request executor).
5. **DOCS_WRITER** — README, demo script, summary, lessons learned.

Rules of engagement:

- The human approves / rejects / redirects **task by task**.
- **Do not implement multiple milestones at once.**
- **Do not build all foundation first** — prioritize an early clickable vertical slice.
- Wait for explicit human approval before writing application code.

See [.claude/rules/workflow.md](.claude/rules/workflow.md) for the full process.

## Non-negotiable security rules

The backend request executor is a product feature **and** a liability (SSRF, etc.). Always apply:

- Request timeout.
- Max response size.
- Only `http` and `https` protocols; block `file:`, `ftp:`, `gopher:`, `data:`, etc.
- **Never render HTML responses as real HTML / live DOM** — show all bodies as escaped source in a read-only code-editor viewer (Monaco preferred).
- Treat URL, headers, body, and cURL input as **untrusted**.
- Mask / warn on sensitive headers (`Authorization`, `Cookie`, `X-Api-Key`) in saved requests and history.
- SSRF risk is documented and reviewed by SECURITY_OFFICER.

**Current SSRF mode: DEV MODE** — local/private API testing is intentionally allowed (this is a local dev tool). This is a deliberate dev/demo trade-off, **not** production-hardened. The backend must not be exposed to untrusted users in this configuration. See [.claude/rules/security.md](.claude/rules/security.md).

**Auth identity:** register/login by **email**.

Full detail: [.claude/rules/security.md](.claude/rules/security.md).

## Key docs

- [docs/requirements.md](docs/requirements.md) — scope, user stories, acceptance criteria.
- [docs/implementation-plan.md](docs/implementation-plan.md) — milestones, vertical-slice-first.
- [docs/handoff.md](docs/handoff.md) — live state passed between agents.
- [docs/demo-script.md](docs/demo-script.md) — the clickable end-to-end demo.
- [.claude/rules/architecture.md](.claude/rules/architecture.md) — structural conventions.
