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
| REQ-003 (US-001 + US-002) | `openspec/changes/req-003-trip-create-and-view/` | 2026-11-14 | Proposal cites REQ-003; delta spec lands in P2. `acceptance-test-fixtures.md` authored in the same workdir |
| REQ-004 (US-008 + US-010 + US-012) | `openspec/changes/req-004-trip-invitations/` | 2026-11-14 | Proposal cites REQ-004; delta specs land in P2 (`invitations` + one `trips` state requirement). Fixtures extended in the same workdir. P4 implemented on the stacked branch; G1 signed, G2 pending push/PR + VL |
| REQ-005 (US-064) | `openspec/changes/us-064-mobile-app-shell/` | 2026-11-15 | Proposal cites REQ-005; delta specs land in P2 (new `app-shell` capability, six ADDED requirements). Frontend-only; no fixture dependency (story carries its own text-only verification table). Change renamed from `req-005-mobile-app-shell` and branch from `sdd-req-005-trip-setup` to `US-064-mobile-app-shell` on 2026-11-15 per user instruction; single-change split confirmed by user |
