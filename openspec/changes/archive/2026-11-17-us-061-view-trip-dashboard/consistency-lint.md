# US-061 consistency lint

## Current implementation reconciliation — 2026-11-17

The earlier lint below is historical. The current proposal, deltas, design
and ATDD record the selected-current-trip dashboard and role-specific
milestones, and explicitly disclose the organizer invitation POST on
destination load. Earlier G1 approval and CI evidence do not cover this
revision. Renew human alignment and validate the reconciled artifacts; the
US-066 shell overlap and tracker reconciliation remain separately owned.

- Phase: P2; scope: proposal, delta specs and related living specs.
- Reviewed: 2026-11-16 23:08 +08:00; reviewer: AI; human sign-off pending.
- Artifact level: proposal + specs; design and tasks absent.
- Verdict: **Partial** — 0 blockers, 3 warnings, 0 suggestions.
- This report is not a gate decision and is not living-spec authority.

| ID | Severity | Location | Issue and evidence | Suggested fix | Authority |
|---|---|---|---|---|---|
| W1 | WARNING | `openspec/specs/app-shell/spec.md`; `openspec/changes/us-066-log-in/specs/app-shell/spec.md`; `specs/app-shell/spec.md` | US-066 is an unarchived change modifying some of the same shell requirements. The living shell still contains scaffold identity text, while both changes describe authenticated identity. | SA to sequence the changes and reconcile their full requirement blocks before archive; do not restore the old scaffold. | spec [fact] |
| W2 | WARNING | `requirement-workspace/requirements/US-061.md`; `proposal.md` Impact | US-058's completion read, separate archive and no-write trip-details fix remain prerequisites; their delivery and contracts are not established here. | IO/SA to name owners and verify delivery/contracts before end-to-end acceptance. | proposal [fact] |
| W3 | WARNING | `specs/app-shell/spec.md` | Historical scenario headings refer to the former scaffold and no aggregation, while their updated bodies describe the new behavior. Strict validation requires the existing scenario names to be retained. | Treat the bodies as the new assertions; reconcile scenario names through a supported follow-up after the requirement is merged. | spec [fact] |

## Checks and limitations

- Proposal Why, What Changes and Non-Goals are present; Impact explicitly
  identifies self, upstream and downstream dimensions. Initial P3 and P4
  findings were resolved by clarifying the existing proposal scope.
- The validator rejected renamed existing scenario headings because MODIFIED
  blocks must retain them. They were restored; see W3.
- OpenSpec strict validation passes. Both proposed capabilities have delta
  files; each delta requirement has scenarios and traces to the proposal.
- Delta scenarios follow the OpenSpec WHEN/THEN schema. The generic lint
  checklist's additional GIVEN and numbered-requirement conventions are not
  required by this project's OpenSpec schema; treating their absence as
  blockers would contradict the applicable artifact instructions.
- Design and task rules, and spec-to-task coverage, are N/A: neither artifact
  exists yet. No `@knowledge:` or `@rule:` references occur in the delta.
- Living app-shell is modified, not edited by this lint. No automatic merge or
  rewrite was performed.

## Residual risks

- The original US-061 tracker still differs from the later confirmed scope;
  its owner must reconcile it.
- The new member-scoped list read is outside the binding plan's listed APIs;
  record the deviation in design and reconcile the plan at archive.
- Successfully validating spec structure does not prove a safe completion
  read, a no-write destination, or a functioning dashboard.

## Next

Obtain IO/SA review, then explicitly invoke
`/sdd:g1-decision-record` with named approvers and their actual decision.
