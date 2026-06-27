# Requirements — API Playground

## Positioning

A small, browser-based API playground with a **backend request executor**, saved requests, a formatted response viewer, history, and optional mock endpoints.

It is **not** a full Postman clone and **not** Swagger. The goal is one strong MVP vertical slice, built clickable-first.

## Personas

- **Developer (primary user):** registers, logs in, builds and sends HTTP requests, inspects responses, saves and revisits requests.

## Core user stories (MVP)

| # | As a user I want to… | Acceptance criteria |
|---|----------------------|---------------------|
| U1 | Register an account | **Email** + password; duplicate emails rejected; password stored hashed; success enables login. |
| U2 | Log in and get a JWT | Valid credentials return a signed JWT; invalid credentials rejected; token has expiry. |
| U3 | Stay authenticated | Frontend stores JWT in `localStorage`; axios interceptor adds `Authorization: Bearer <token>` to backend calls; protected endpoints reject missing/invalid tokens. |
| U4 | Build a request | Choose method (GET/POST/PUT/PATCH/DELETE…), URL, headers, query params, body. |
| U5 | Execute via the backend | Frontend sends the request **definition** to the API Playground backend; the **backend** performs the outbound HTTP call to the target URL. The browser never calls the target directly. |
| U6 | Inspect the response | See status code, duration (ms), response headers, and a formatted body. Body shown in a read-only code-editor viewer (Monaco preferred) with syntax highlighting, line numbers, and copy support, for HTML/XML/JSON/text. **HTML is shown as escaped source code, never rendered as live DOM.** |
| U7 | Save a request | Persist a request definition into a collection; sensitive headers masked/warned. |
| U8 | See history | Each executed request creates a history entry scoped to the user; list shows recent requests in order. |

## Optional / stretch stories

| # | Story | Notes |
|---|-------|-------|
| O1 | Paste a cURL command and parse it into the builder | **In scope**, but only after the core vertical slice works. Untrusted input; must not throw on malformed input. |
| O2 | Create in-app mock endpoints as demo targets | **Lower priority** than the core flow. Optional safe targets for the demo. |

## Functional requirements

- **Auth:** register, login, JWT issuance & verification, password hashing, per-user data ownership.
- **Request execution:** accept a request definition; execute server-side via `IHttpClientFactory`; capture status, duration, headers, body; enforce security controls.
- **Saved requests & collections:** CRUD scoped to the user; group requests into collections.
- **History:** record each execution; list per user.
- **Mock endpoints (optional):** define simple in-app endpoints returning configured responses.

## Non-functional requirements

- **Security:** all controls in [.claude/rules/security.md](../.claude/rules/security.md) — timeout, max response size, http/https only, untrusted-input handling, no HTML rendering, sensitive-header masking, documented SSRF risk.
- **Architecture:** feature-based vertical slice / modular monolith — see [.claude/rules/architecture.md](../.claude/rules/architecture.md).
- **Storage:** SQLite.
- **Tests:** backend tests for request execution, auth, saved requests, history, and cURL parser (if built); frontend tests for critical UI behavior.
- **Tech stack:** ASP.NET Core Minimal API; React + TypeScript + Vite; axios; SQLite; JWT.

## Explicitly out of scope (MVP)

- Team/workspace sharing, collaboration, real-time sync.
- OAuth flows, refresh-token rotation, full RBAC.
- Environments/variables, scripting/pre-request scripts, test assertions.
- WebSocket/gRPC/GraphQL clients.
- Import/export of Postman collections.
- Production-hardened SSRF allow-listing — **dev mode intentionally allows local/private targets** (see decisions below).

## Confirmed decisions (2026-06-27)

1. **SSRF / request execution mode: DEV MODE.** Local/private API testing is intentionally allowed (this is a local dev tool for testing the user's own local ASP.NET APIs). Always-on controls remain: http/https only, request timeout, max response size, block `file:`/`ftp:`/`gopher:`/other schemes. Documented as dev/demo, not production-hardened. Full detail in [.claude/rules/security.md](../.claude/rules/security.md).
2. **Auth identity: email** for register/login.
3. **Response viewer:** no live HTML/DOM rendering. HTML/XML/JSON/text shown as escaped source in a code-editor-style viewer with syntax highlighting, line numbers, and copy support — **Monaco Editor preferred** for the MVP.
4. **Optional features:** cURL parsing is in scope but **only after** the core slice works; mock endpoints are **lower priority** than the core flow.

## Acceptance for "MVP complete"

The vertical slice runs end to end: **register → login → build request → backend executes → formatted response appears → save request → history entry appears**, with the mandatory security controls enforced and reviewed.
