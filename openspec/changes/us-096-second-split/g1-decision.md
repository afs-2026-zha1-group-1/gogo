# G1 Decision — us-096-second-split

- Date: 2026-11-18
- Change: `us-096-second-split`
- IO: Emily
- SA: Johnson
- VL: Leo (G2 role)

## Decision

**Pass.**

## Evidence

- `proposal.md`、`design.md`、`specs/splits/spec.md`（3 ADDED + 7 MODIFIED）、`tasks.md` present.
- `openspec validate us-096-second-split --strict` = valid.
- Cross-change scan recorded in `cross-change-scan.md`; A1 belongs to `us-003-edit-trip-basics`, A2 is a merge-topology false positive (the branch is 0 behind `group1/main`, 5 ahead).
- Existing splits tests updated for `split-r1-*`; new `SplitRoundApiTest` covers round start, ordering, isolation, confirmation, cancellation, budget aggregation and provider exclusions.
- Frontend typecheck, unit tests and build green; real browser two-round flow verified.

## Notes

- US-095 `FROM_START` is merged into this change; round 1 keeps `MIDDLE` / `FROM_START`, round 2 only `MIDDLE`.
- Role names were supplied by the user on 2026-11-18.
