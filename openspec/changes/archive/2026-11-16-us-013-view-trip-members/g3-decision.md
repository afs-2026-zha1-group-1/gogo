# G3 decision — us-013-view-trip-members

- **Gate:** G3 (Merge & Archive)
- **Status:** **PENDING — NOT RECORDED**
- **Change id:** `us-013-view-trip-members`
- **Archive path:** `openspec/changes/archive/2026-11-16-us-013-view-trip-members/`
- This is a sign-off sheet; G3 is recorded only after the named SA supplies a
  decision below. The agent records the human statement and does not self-approve.

## Inputs

- **Merge outcome:** merged into `main` as `364a52d`; main CI run `43841187214`
  both jobs success.
- **G2:** Pass (VL **Leo**, `g2-decision.md`, re-recorded on `47a8e3f` after
  C1–C5 closure).
- **Living Spec:** `trips` gained the member-roster requirement; `app-shell`
  removed `Placeholder tabs` and added `Tab content`; Purpose prose reconciled.
  `openspec validate --all` passes (9/9).
- **Archive:** folder moved to the archive path above; `change-summary.md`
  present.
- **KB:** `tech-stack-plan.md` §15 landed reconciliation + `_LOG.md` row.
- **Evidence:** local verify `20261116-165153`; pipeline `20261116-165200`;
  browser U1–U3 + split regression; 226/226 backend tests on the final merge.

## Check conclusions

| Check | Outcome |
|---|---|
| Merge | Pass — `main` `364a52d`, no residual conflict |
| Merge-time conflicts | `registry.md` only, resolved keeping main's US-049/050 + REQ-008 rows and adding US-013 |
| Archive completeness | Pass — change folder archived, summary present, Living Spec updated |
| Validation | Pass — `openspec validate --all` 9/9 |
| Residual risks | F2 split `MEMBER_REQUIRED` divergence; OQ-2 no durable trip memory; unreachable empty/missing UI states; optional 404 `code` hardening |

## Sign-off

| Role | Name | Decision (Pass / Conditional / Fail) | Date | Conditions + owner (required for Conditional) | Evidence |
|---|---|---|---|---|---|
| SA | Johnson | _(pending)_ | | | |

## Decision

- Decision: _(pending)_
- Conditions + owners: _(none yet)_
- Approver: SA **Johnson** (pending)

## Recording rules

1. G3 requires a named SA decision; G1/G2 signatures are not inherited.
2. A Conditional decision is invalid without remediation items and owners.
3. After the row is filled, the agent changes the status to **RECORDED — Pass /
   Conditional / Fail** and cites the evidence.
4. Until then G3 is not closed; issue #9 closure and board Done wait.
