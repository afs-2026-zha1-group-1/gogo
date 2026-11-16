# P2 consistency lint — us-065-frontend-typescript-migration

- Phase: `p2`
- Focus: proposal and Delta Spec
- Date: 2026-11-16
- Artifact level: 2 (proposal + specs)
- Validation: `openspec validate us-065-frontend-typescript-migration --strict --json` passed.

## Verdict

**Pass** — 0 BLOCKER, 0 WARNING, 2 SUGGESTIONS. The proposal now has an
explicit Non-Goals section. The remaining items are non-blocking: the known
greeting-spec discrepancy is outside this change and was deferred to a separate
change; detailed browser-state coverage remains in US-065 AC5–AC7.

## Findings

| ID | Severity | Phase | Location | Issue | Suggested fix | Evidence | Authority |
|---|---|---|---|---|---|---|---|
| SH-2 | SUGGESTION | P2 | `openspec/specs/greeting/spec.md`; `proposal.md`, Impact | The Living Spec describes a plain-text response, while REQ-002 and the current frontend use the JSON `message` field. This pre-existing discrepancy is outside US-065, which preserves existing behavior, and is documented as deferred. | Keep the correction outside US-065 and resolve the Living Spec discrepancy in a separate change. | `openspec/specs/greeting/spec.md`; `requirement-workspace/requirements/REQ-002.md`; `frontend/src/pages/Home.jsx`; proposal, Known unrelated spec drift. | proposal + spec + code [fact] |
| SH-3 | SUGGESTION | P2 | `specs/frontend-build/spec.md`, FB-4 | The migration's preserved-flow scenario names the routes, identity header, and broad trip/invitation states, but does not enumerate every state transition. | Keep US-065 AC5–AC7 as the detailed regression oracle; no expansion is needed for this TypeScript migration. | `specs/frontend-build/spec.md`, FB-4; `requirement-workspace/requirements/US-065.md`, AC5–AC7. | spec + requirement [inference] |

## Resolved since previous review

- P3 BLOCKER: `proposal.md` now has a named, non-empty `## Non-Goals`
  section grounded in US-065's existing Out of scope list.

## Checks

| Rule group | Result | Notes |
|---|---|---|
| P1–P4 | Pass | Why, What Changes, Non-Goals, and impact across frontend, upstream API/backend boundary, and downstream CI/browser flows are present. |
| C1 | Pass | Source, entry/imports, typing, root guard, build, browser flows, dev-server, and package/config constraints map to FB-1–FB-6. |
| S1, S3, S4, S5 | Pass | Delta follows the OpenSpec structure; requirements trace to the proposal; scenarios use GIVEN/WHEN/THEN and are attached to numbered requirements. |
| S2, S2b, S2c | N/A | No citation prefixes are used. |
| T1–T3, C2 | N/A | `tasks.md` does not exist at P2. |
| D1–D3 | N/A | `design.md` does not exist at P2. |
| C6 | N/A | No `@knowledge:` or `@rule:` references are used. |

## Residual risks

- No blocking residual risks remain for P2 alignment.
- The greeting Living Spec discrepancy remains known and deferred to a separate
  change; it is not changed by this TypeScript migration.
- US-065 AC5–AC7 remain the detailed regression oracle for browser-flow
  preservation; no frontend implementation was changed in this P2 work.

## Reviewer metadata

- Reviewer: AI-assisted P2 consistency review
- Human sign-off: pending
- Date: 2026-11-16

## Next

P2 alignment is clean. The G1 decision record may now be prepared with human
IO/SA sign-off still pending; this lint does not approve the Gate.
