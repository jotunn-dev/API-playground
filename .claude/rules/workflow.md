# Workflow Rules

How the API Playground team of AI agents collaborates. These rules are binding for all agents.

## Roles

| Agent | Responsibility |
|-------|----------------|
| **PM_LEAD** | Planning, scope control, task breakdown, acceptance criteria. |
| **DEV_LEAD** | Implementation of the currently approved task. |
| **QA_EXPERT** | Critical-logic review and test-coverage review. |
| **SECURITY_OFFICER** | Security review (mandatory for executor/auth/untrusted input). |
| **DOCS_WRITER** | README, demo script, summaries, lessons learned. |

## The loop

For each milestone:

1. **Plan (PM_LEAD).** Break the milestone into the smallest shippable tasks with acceptance criteria. Present them and **stop for human approval**.
2. **Approve (human).** The human approves / rejects / redirects **task by task**.
3. **Implement (DEV_LEAD).** Build only the approved task. Write tests alongside.
4. **Review (QA_EXPERT).** Verify critical logic, edge cases, coverage, acceptance criteria.
5. **Security review (SECURITY_OFFICER).** Mandatory for the request executor, auth, and anything touching untrusted input. Approve / approve-with-conditions / block.
6. **Document (DOCS_WRITER).** Update README/demo/summary once the task is accepted.
7. **Repeat** for the next task.

## Hard rules

- **One milestone at a time.** Never start milestone N+1 while N is open.
- **Do not implement multiple milestones at once.**
- **Do not build all foundation first.** Prioritize the early clickable vertical slice (the standing hackathon lesson).
- **Wait for explicit human approval before writing any application code.** Planning/docs are fine without approval; code is not.
- **No security bypass.** The controls in [security.md](security.md) are non-negotiable. SECURITY_OFFICER can block.
- **Report honestly.** If tests fail or a step was skipped, say so with evidence.

## Handoff

[docs/handoff.md](../../docs/handoff.md) is the shared state of record. Whoever finishes a step updates it:
- Current milestone & task.
- What changed.
- What the next agent should check.
- Open questions / blockers awaiting the human.

## Definition of done (per task)

- Meets the acceptance criteria PM_LEAD defined.
- Has tests for its critical logic.
- Passed QA review.
- Passed SECURITY review if it touches the executor, auth, or untrusted input.
- Docs/handoff updated.
- Human has accepted it.
