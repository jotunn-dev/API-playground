# Architecture Rules

API Playground uses **feature-based vertical slice architecture** (a modular monolith). Code is organized by feature, not by technical layer. Each feature owns its full slice.

## Backend (ASP.NET Core, Minimal API)

Use **feature-based vertical slice architecture with thin Minimal API endpoints and DI-resolved use-case handlers.** Organize by feature, then by **use case**. Each use case keeps its endpoint, handler, request/response DTOs, validation, and tests close together.

```
backend/
  Features/
    Auth/
      Register/
        RegisterEndpoint.cs    # route registration + DTO binding + call handler + map result
        RegisterHandler.cs     # the use-case business logic (resolved from DI)
        RegisterRequest.cs     # request DTO
        RegisterResponse.cs    # response DTO
        RegisterValidator.cs   # validation for this use case (when needed)
        RegisterHandlerTests.cs# tests live next to the slice
      Login/
        LoginEndpoint.cs ...
    RequestExecution/
      Execute/
        ExecuteRequestEndpoint.cs
        ExecuteRequestHandler.cs
        ExecuteRequestRequest.cs
        ExecuteRequestResponse.cs
    SavedRequests/   # Create/, List/, Get/, ... per use case
    Collections/     # per use case
    History/         # per use case
    MockEndpoints/   # optional, per use case
  Shared/
    Database/        # SQLite context, migrations, persistence helpers
    Security/        # JWT, password hashing, SSRF guards
    Http/            # outbound HTTP execution helpers (IHttpClientFactory wiring)
    Results/         # common result/error handling (Result<T>, error → HTTP mapping)
    Validation/      # validation helpers
```

### Backend rules (binding)

- **Endpoints must be thin.** An endpoint class only: (1) registers HTTP route(s), (2) binds the request DTO, (3) resolves and calls a handler from DI, (4) converts the handler result to an HTTP response. Nothing else.
- **No business logic in endpoint mapping methods.** No DB queries, no HTTP execution, no hashing, no branching on domain rules inside the endpoint. If logic is creeping into the endpoint, it belongs in the handler.
- **Business logic lives in feature handlers / use cases.** One handler per use case (e.g. `RegisterHandler`), resolved via DI.
- **Prefer simple MediatR-like handler classes** (a plain handler class with a single method, injected via DI). **Do not add the MediatR package** unless there is a strong, explicitly-justified reason.
- **Co-locate the slice.** Request DTO, response DTO, endpoint registration, handler, validation, and tests for a use case live together in that use case's folder. Don't scatter a feature across global `Controllers`/`Models`/`Services` folders.
- **Endpoint registration** is per use case (e.g. `RegisterEndpoint.Map(app)`), aggregated per feature and called from `Program.cs`.
- **DTOs at the boundary.** Don't leak EF/entity types to the client.

### Shared infrastructure (allow-list)

`Shared/` is **only** for cross-cutting infrastructure: database access, auth/JWT, HTTP execution, common result/error handling, and validation helpers. Anything feature-specific stays in the feature's use-case folder — do not grow `Shared/` into a dumping ground.

- Use `IHttpClientFactory` / `HttpClient` for outbound requests — never `new HttpClient()` per call.
- Persistence via SQLite, accessed through `Shared/Database`.
- Cross-cutting concerns (auth, security guards, validation, result mapping) are reused from `Shared/`, not reimplemented per feature.

## Frontend (React + TypeScript + Vite)

```
frontend/src/
  features/
    auth/              # register/login forms, token storage, auth state
    requestBuilder/    # method, URL, headers, query params, body editor
    responseViewer/    # status, duration, headers, formatted (escaped) body
    collections/       # saved requests grouped into collections
    history/           # list of executed requests
    mockEndpoints/     # optional in-app mock targets UI
  shared/
    api/               # axios instance + interceptor (Bearer token), API clients
    ui/                # reusable presentational components
    utils/             # formatting, parsing (e.g. cURL), helpers
```

### Conventions

- Each feature owns its components, hooks, and local state. Shared, reusable pieces go to `shared/`.
- A single configured axios instance in `shared/api` carries the JWT via an interceptor that reads from `localStorage`. Features import this client; they do not create their own axios instances.
- The request **definition** is sent to the API Playground backend, which executes it. The browser never calls the target URL directly.
- Response bodies are untrusted: render HTML as **escaped text**, never as live HTML. Formatting/highlighting must operate on escaped content.
- Keep types shared between request builder and API client to avoid drift.

## General principles

- Smallest correct slice first. Don't add layers/abstractions until a second use case demands them.
- A feature should be understandable in isolation.
- Shared code is extracted when reused, not speculatively.
- Tests live with the feature they cover.
