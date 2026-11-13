# Session handoff note — REQ-001 → OpenSpec

- Date: 2026-11-13
- Stage: P1 complete
- Workdir: `requirement-workspace/`
- Change: `openspec/changes/req-001-hello-world/`

`handoff.md` already holds non-empty project content, so this change-specific
handoff is recorded as a separate session note instead of overwriting it
(pre-spec-workdir rule: no silent overwrite of non-empty user content).

## Artifact mapping

| Workdir artifact | OpenSpec destination | Notes |
|---|---|---|
| `intents/2026-11-13-req-001.md` | Cited by `proposal.md` §Why / §What Changes | Raw intent sources 1–4, including the H2 substitution and the CI request |
| `requirements/REQ-001.md` | `openspec/changes/req-001-hello-world/proposal.md` | Six-field entry stabilized; AC1–AC3 plus reverse case AC3-N feed the P2 delta spec |
| `deep-dive.md` §REQ-001 | A0 gate evidence in `proposal.md` | ⑨–⑫ all Pass |
| `analysis/req-001-dor.md` | DoR evidence cited by the P1 checklist report | BLOCKER = 0; 2 WARNING + 1 SUGGESTION deferred with owners |
| `impact-brief.md` | `proposal.md` §Impact, §Effort and ordering | Risks R1–R5 carried into P2/P4 |
| `registry.md` | Traceability row for REQ-001 | Status P1 complete |

## Authority boundary

This workdir is not the Living Spec authority. Long-term specs live in
`openspec/specs/` and are populated only by the P5 archive of this change.

## Next

`/sdd:delta-craft` (P2), then `/sdd:g1-decision-record` with named IO + SA.
G1 is not claimed by the agent.
