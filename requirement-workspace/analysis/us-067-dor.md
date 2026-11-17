# US-067 — Definition of Ready self-check

- Entry: `requirements/US-067.md`
- Date: 2026-11-16
- Scope: Base 8 (①–⑧); deep-dive ⑨–⑫ deferred until impact analysis confirms
  add/extend direction.

## Base 8 results

| # | Item | Verdict | Note |
|---|---|---|---|
| ① | Intent clear | **Pass** | Statement + Intent section: scanner UI for invitation QR, camera lifecycle, URL validation, link fallback. Outsider can understand what and why. |
| ② | Actors defined | **Pass** | Invited traveler (seeded user), frontend scanner surface, backend existing APIs (preview/accept). Identity model inherited from REQ-003/004. |
| ③ | Scope bounded | **Pass** | In-scope: 8 bullet items (scanner UI, camera lifecycle, QR decode, URL validation, error recovery, existing rules handoff). Out-of-scope: 6 items (icon placement S1–S2, login S9, new backend, issuance, notifications, deep-link). |
| ④ | Scenarios / AC hints concrete | **Pass** | 11 scenarios with observable outcomes; 8 in-scope. Each names a trigger and an assertable result. |
| ⑤ | Exception / boundary | **Pass** | S6 (invalid/revoked/closed), S7 (unrelated QR), S8 (camera denied/unavailable/unreadable), R-1 (no auto-accept), R-2 (no arbitrary navigation), R-3 (camera release on back-nav). |
| ⑥ | Results verifiable | **Pass** | Outcomes are observable: camera tracks stopped, token extracted from URL, navigation to `#/join/<token>`, API response codes, error panel rendered. No vague "works well". |
| ⑦ | Dependencies / app-arch touchpoints | **Pass** | Depends on REQ-004 invitations API (preview, accept), existing Join page route, jsqr dependency (REQ-004 OQ-6). Affected capability: `invitations` (one ADDED frontend requirement). No new backend, no migration. |
| ⑧ | Open-questions gate | **Pass** | Blocking OQ-1/2/3 all `resolved`. Non-blocking OQ-4/5 remain `open` (P3 design decisions, do not block drafting). |

**BLOCKER count: 0**

## Advisory findings

| Severity | Status | Location | Issue | Fix hint |
|---|---|---|---|---|
| SUGGESTION | open | Scenarios S10 | Duplicate-membership check through scanner path is a regression of existing REQ-004 J3/J6 behavior, not new US-067 logic. Consider whether it needs a dedicated E2E scenario or can be covered by the existing Join page test suite. | Decide in P3 ATDD design whether to add a scanner-specific test or cite the existing J3/J6 as sufficient. |
| SUGGESTION | open | Links to evidence | No GitHub issue number referenced for US-067. | Add issue link when the story card is created. |

**WARNING count: 0. SUGGESTION count: 2.**

## Exit

Base 8 BLOCKER = 0 → proceed to embedded impact analysis.
