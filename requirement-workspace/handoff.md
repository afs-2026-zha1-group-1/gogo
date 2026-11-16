# Handoff — requirement workspace → OpenSpec

- **Workdir path:** `requirement-workspace/` (override if relocated)
- **OpenSpec changes root:** `openspec/changes/`
- **Rule:** Copy or link stabilized requirements into a change package. This
  workdir is never the long-term Living Spec authority (`openspec/specs/`).

| Artifact | Destination | Notes |
|---|---|---|
| `requirements/` entries | `openspec/changes/<id>/` proposal inputs | After `/sdd:pre-spec-req` |
| Ready / analysis packs | change package or archive | Project convention |

## Handed off

| Requirement | Change package | Date | Notes |
|---|---|---|---|
| REQ-003 (US-001 + US-002) | `openspec/changes/archive/2026-11-15-req-003-trip-create-and-view/` | 2026-11-14 | Proposal cites REQ-003; delta spec landed in P2. `acceptance-test-fixtures.md` authored in the same workdir. Archived 2026-11-15; G1/G2/G3 Pass |
| REQ-004 (US-008 + US-010 + US-012) | `openspec/changes/archive/2026-11-15-req-004-trip-invitations/` | 2026-11-14 | Proposal cites REQ-004; delta specs landed in P2 (`invitations` + one `trips` state requirement). Fixtures extended in the same workdir. Archived 2026-11-15 after REQ-003; G1/G2/G3 Pass |
| REQ-005 | `openspec/changes/req-005-frontend-typescript-migration/` | 2026-11-16 | P1 proposal only; `.openspec.yaml` sets `skip_specs: true` because no product behavior changes. Delta specs, design, and tasks are deferred to later SDD phases per the user's P1-only confirmation. |
