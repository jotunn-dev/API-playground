# Demo Script — API Playground

A click-by-click walkthrough of the core vertical slice. This is the target experience; steps marked _(pending)_ become live as milestones land. Keep this runnable by someone who has never seen the app.

## Prerequisites _(pending M1)_

- Backend running locally (ASP.NET Core Minimal API + SQLite).
- Frontend running locally (Vite dev server).
- A target URL to call. In **dev mode**, a local API is the intended target (e.g. your own `http://localhost:5000/...` ASP.NET API). A public test API (httpbin-style echo) also works.

```
# Terminal 1 — backend
cd backend
dotnet run

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open the frontend URL printed by Vite (e.g. http://localhost:5173).

## The demo (core slice)

1. **Register.** Open the app → Register → enter credentials → submit. Account is created (password stored hashed).
2. **Log in.** Log in with the same credentials → backend returns a **JWT** → frontend stores it in `localStorage`. From here, the axios interceptor adds `Authorization: Bearer <token>` to every backend call.
3. **Build a request.** In the request builder:
   - Method: `GET` (or `POST`).
   - URL: the safe target URL.
   - Add a header and a query param.
   - For `POST`, add a JSON body.
4. **Send.** Click **Send**. The frontend posts the request **definition** to the API Playground backend; the **backend** executes the outbound call (the browser never calls the target directly).
5. **Inspect the response.** The response viewer shows:
   - **Status code** (e.g. `200 OK`).
   - **Duration** in ms.
   - **Response headers.**
   - **Formatted body** in a code-editor viewer (Monaco) with syntax highlighting, line numbers, and copy support; **HTML/XML/JSON/text shown as escaped source, never rendered as live DOM.**
6. **Save the request.** Click **Save** → choose/create a **collection**. Sensitive headers (`Authorization`, `Cookie`, `X-Api-Key`) are **masked or flagged** on save.
7. **See it in history.** Open **History** → the execution appears as an entry (method, URL, status, time), scoped to your user.
8. **Reload a saved request.** Open the collection → select the saved request → it loads back into the builder → send again.

## Security talking points (call these out live)

- The backend is the request executor — this is intentional and is the project's main risk (**SSRF**). Controls: request **timeout**, **max response size**, **http/https only** (dangerous schemes blocked), untrusted input handling.
- Running in **DEV MODE**: local/private targets are intentionally allowed so you can test your own local APIs. This is a deliberate dev/demo trade-off, not production-hardened — the backend must not be exposed publicly in this mode.
- **HTML responses are never rendered as live DOM** — always escaped source in the code viewer.
- Sensitive headers are masked/warned in saved requests and history.
- Current SSRF mode (dev vs. hardened) is documented in [.claude/rules/security.md](../.claude/rules/security.md) and the security review log in [handoff.md](handoff.md).

## Optional extras _(M3)_

- **Paste a cURL command** → it parses into the request builder.
- **Create a mock endpoint** in-app → use it as the safe target for steps 3–7.
