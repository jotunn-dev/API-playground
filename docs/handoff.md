# Handoff — Live Project State

This is the shared state of record between agents. Whoever finishes a step updates it.

---

## Current milestone

**Milestone 0 — Workflow & planning.**

## Current task

Create AI workflow setup and planning docs only. **No application code.**

## Status

- ✅ `CLAUDE.md`, `.claude/agents/*`, `.claude/rules/*`, `docs/*`
- ✅ Key decisions recorded (SSRF dev mode, email auth, Monaco viewer, cURL/mock priority).
- ✅ **M1 task breakdown drafted** (M1.1–M1.6) in [implementation-plan.md](implementation-plan.md).
- ⏳ Awaiting human approval of the **M1 task breakdown** before any application code.

## What changed

Updated all planning docs with the four confirmed decisions. Added the detailed Milestone 1 task breakdown (M1.1 backend skeleton → M1.2 auth → M1.3 frontend+auth UI → M1.4 executor → M1.5 builder → M1.6 Monaco viewer).

## What the next agent should do

**Wait for explicit human approval of the M1 breakdown.** On approval, DEV_LEAD starts **M1.1 only**, then stops for review. No code is written before approval.

## Open questions / blockers (for the human)

- None blocking. All prior open questions resolved (see decisions log). Awaiting approval of the M1 breakdown.

## Security review log

| Date | Reviewer | Subject | Verdict | Residual risk |
|------|----------|---------|---------|---------------|
| — | — | (none yet) | — | — |

## Decisions log

| Date | Decision |
|------|----------|
| 2026-06-27 | Adopted role-based AI workflow (PM/DEV/QA/SECURITY/DOCS), vertical-slice-first, one milestone at a time, human approval task-by-task. |
| 2026-06-27 | **SSRF mode = DEV MODE.** Local/private targets allowed (local dev tool). Always-on controls kept: http/https only, timeout, max response size, block file/ftp/gopher/other schemes. Documented as dev/demo, not production-hardened; backend must not be publicly exposed. |
| 2026-06-27 | **Auth identity = email** for register/login. |
| 2026-06-27 | **Response viewer = Monaco** (preferred): read-only code editor, syntax highlighting, line numbers, copy, for HTML/XML/JSON/text. No live DOM/HTML rendering; HTML shown as escaped source. |
| 2026-06-27 | **Optional features:** cURL parsing in scope but only after core slice; mock endpoints lower priority. |
| 2026-06-27 | **Backend architecture:** feature → use-case slices with **thin Minimal API endpoints + DI-resolved handlers**. No business logic in endpoints; logic in handlers/use cases. Simple MediatR-like handlers, **no MediatR package** unless strongly justified. Co-locate endpoint/handler/DTOs/validation/tests per use case. `Shared/` limited to DB, auth/JWT, HTTP execution, result/error handling, validation helpers. |
