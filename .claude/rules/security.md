# Security Rules

The API Playground backend executes HTTP requests to user-supplied URLs on behalf of the user. This is a core feature **and** the project's largest attack surface. These rules are non-negotiable. SECURITY_OFFICER may block any change that violates them.

## Threat model summary

The request executor is a **Server-Side Request Forgery (SSRF) engine by design**. A user controls the target URL, method, headers, and body, and the *server* makes the request. Without controls this can:

- Reach internal-only services (databases, admin panels) not exposed to the internet.
- Hit cloud metadata endpoints (e.g. `http://169.254.169.254/`) to steal credentials.
- Reach `localhost` / loopback and private IP ranges.
- Be used for port scanning or as a request relay.

This risk must be **documented in the security docs and reviewed by SECURITY_OFFICER** before the executor ships.

## Mandatory controls (request executor)

1. **Request timeout.** Every outbound request has a hard timeout. It must actually fire and return a clean error.
2. **Max response size.** Cap the response body read; abort and return a clean error if exceeded. Do not buffer unbounded content.
3. **Protocol allow-list.** Only `http` and `https`. Reject `file:`, `ftp:`, `gopher:`, `data:`, etc.
4. **Untrusted input.** Treat URL, headers, body, and cURL input as hostile. Validate/normalize. Prevent header injection (CRLF). Bound input sizes.
5. **No HTML execution.** Response bodies are untrusted. **Never render HTML responses as real HTML / live DOM.** All bodies (HTML, XML, JSON, text) are displayed as **escaped source code** in a read-only code-editor-style viewer (Monaco preferred) — never injected via `innerHTML`/`dangerouslySetInnerHTML`. The frontend must not be coercible into executing response content.
6. **Sensitive header handling.** When saving requests or displaying history, mask or warn about sensitive headers — at minimum `Authorization`, `Cookie`, `X-Api-Key`. Never log secret header values.
7. **No secret leakage.** JWT signing keys, DB paths, and secret headers must not appear in logs or error responses.

## SSRF protection posture

### Current mode: DEV MODE (decided 2026-06-27)

This is a local homework/developer tool. **Local and private API testing is intentionally ALLOWED** so the user can test their own local ASP.NET APIs (e.g. `http://localhost:5000`) through API Playground.

**This is dev/demo behavior, NOT production-hardened behavior.** It is an accepted, deliberate trade-off for this project.

Even in dev mode, these controls remain **mandatory and always on**:

- Only `http` and `https` protocols allowed.
- Request timeout enforced.
- Max response size enforced.
- Dangerous schemes blocked: `file:`, `ftp:`, `gopher:`, `data:`, and anything that is not `http`/`https`.

What dev mode does **NOT** do (and a production deployment **would**):

- It does **not** block loopback / link-local (`169.254.0.0/16`, incl. cloud metadata) / private ranges (`10/8`, `172.16/12`, `192.168/16`).
- It does **not** resolve+validate destination IPs to defeat DNS rebinding.
- It does **not** apply an egress allow-list.

### Residual risk (dev mode)

Because internal/private/metadata addresses are reachable, the executor is a full SSRF primitive against the host's network. This is acceptable **only** because the app runs locally for one developer testing their own services. **Do not expose this backend to untrusted users or the public internet in this configuration.**

### Hardening path (for production-style deployment)

Block loopback, link-local, and private ranges; resolve and validate the destination IP (defeat DNS rebinding); consider an allow-list model. Switching to hardened mode must flip these on and update this section.

The current mode and its allowances must remain explicit in the docs at all times.

## Auth

- JWT register/login. Hash passwords with a strong algorithm (e.g. ASP.NET Core `PasswordHasher` / bcrypt-class). Never store plaintext.
- Pin the JWT algorithm; validate issuer/audience/expiry on every protected request.
- Signing key from configuration / user-secrets — never committed to source.
- MVP stores the JWT in `localStorage` and attaches it via an axios interceptor. This is an accepted MVP trade-off (XSS exposure); note it in docs. The frontend's no-HTML-execution rule helps reduce XSS surface.
- Enforce per-user ownership: a user can only read/modify their own saved requests, collections, and history.

## Review gate

Any change to the request executor, auth, or handling of untrusted input requires SECURITY_OFFICER review before it is accepted. The verdict (approved / approved-with-conditions / blocked) and residual-risk statement are recorded in [docs/handoff.md](../../docs/handoff.md).
