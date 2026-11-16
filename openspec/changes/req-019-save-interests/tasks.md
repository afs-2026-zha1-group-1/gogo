# Tasks

- Change: `req-019-save-interests` (REQ-019, US-019)
- Inputs: [proposal](proposal.md) · [delta spec](specs/preferences/spec.md) ·
  [ATDD design](atdd-design.md) · [design](design.md) ·
  [fixtures](../../../requirement-workspace/acceptance-test-fixtures.md)
- G1: Pass closed 2026-11-16 (IO Emily 2026-11-15, SA evelyn.huang 2026-11-15 + sibling
  re-review). P3 rulings: D15 own error advice, D16 no shared-fixture edits.
- Order rule: acceptance checks red before production code (ATDD design §2).
- NFR tests: out of scope by the user's decision on 2026-11-16 (ATDD design §6). P4
  delivers functional evidence only.
- Commit rule: local commits are allowed; pushing `feat/travel_preference` needs the
  owner's explicit authorization (the SA has stated they will push).

## 1. Red acceptance checks (owner: Dev; before any production code)

- [ ] 1.1 Author `backend/src/test/java/com/gogo/preference/PreferenceApiTest.java`
      covering ID-1…ID-5, CAT-1…CAT-4, SAVE-1…SAVE-8, READ-1…READ-5; own in-memory
      SQLite file, Flyway `V1`–`V4`, pool size 1, `@BeforeEach` clears
      `member_preference`, fixture trip id resolved by name (DD8, ATDD §4)
- [ ] 1.2 Add the API-level reverse checks of ATDD §5: only the `interest` kind written,
      the caller's own row only, no `noPreference`/`ready` fields, no lock after
      `main_plan_confirmed = 1`, no `/api/tags`
- [ ] 1.3 Run `mvn test`; record the red run and confirm it fails for the right reason
      (no `V4` table, no route), with `GreetingApiTest`, `TripApiTest` and
      `InvitationApiTest` still green
- [ ] 1.4 Write the E2E check list (PAGE-1…PAGE-9) as numbered browser steps with
      expected observations

## 2. Migration and persistence (owner: Dev)

- [ ] 2.1 `V4__create_member_preference.sql`: one table, `UNIQUE(trip_id,user_id,kind)`,
      no seed rows, no trigger (DD1); confirm it applies after `V3`
- [ ] 2.2 `PreferenceRepository`: the single upsert save statement and the
      member-left-join read query (DD5, DD6); `payload` written as `{"codes":[...]}`
- [ ] 2.3 `InterestCatalogue` constants in AC order, first-occurrence dedupe and
      label→code mapping (DD4); apply-time unit TDD for UT-1, UT-2, UT-3
- [ ] 2.4 Record the design TS-9 gap in the P4 evidence (foreign keys declared but
      unenforced without `foreign_keys=on`; pool size pinned to 1 only in tests); **do not**
      edit `application.yml` in this change — the harness fix belongs to Dev/SA

## 3. Endpoints and error mapping (owner: Dev)

- [ ] 3.1 `PreferenceController`: `GET` and `PUT /api/trips/{tripId}/preferences` with
      identity → trip existence → membership (DD3), reusing `TripRepository`
- [ ] 3.2 `PUT`: validate the whole array before any write, reject with
      `INTEREST_NOT_ALLOWED`, echo `{"interests":[…]}` on `200`, accept `[]` as clear
      (DD4, DD5)
- [ ] 3.3 `GET`: `{"members":[…]}` with exactly `userId` and `interests`, ordered by
      `userId`, unsaved members present with `[]` (DD6)
- [ ] 3.4 `PreferenceApiException` + `PreferenceErrorAdvice` covering
      `com.gogo.preference` and unreadable bodies as `INVALID_REQUEST` (D15)
- [ ] 3.5 Run `mvn test`: ID/CAT/SAVE/READ checks green, merged capability tests unchanged

## 4. Frontend (owner: Dev)

- [ ] 4.1 `parseRoute` gains `#/trips/<id>/preferences` ahead of the details pattern, and
      `App.jsx` mounts the page with `userId` and `tripId` (DD7)
- [ ] 4.2 `Preferences.jsx`: `GET` on mount and on identity change, seven interest
      controls, one `PUT` from the explicit Save action, loading / empty / saved /
      inline-error / load-failure-with-retry states, no `localStorage` (DD7)
- [ ] 4.3 `.chips` / `.chip` styles in `app.css`, no Clear All control, no new dependency
- [ ] 4.4 `TripDetails.jsx`: one entry link to the preferences page (D13)
- [ ] 4.5 `npm run build` passes

## 5. Runtime acceptance and E2E (owner: Dev; evidence in the local-verify report)

- [ ] 5.1 Start backend (8080) and frontend (5173); confirm by port owner and endpoint
      response
- [ ] 5.2 Execute PAGE-1…PAGE-9 with the identity switcher; capture the observations,
      including the 400 rollback and the identity switch
- [ ] 5.3 Re-run every API scenario with `curl` against the running backend, including
      the reverse checks and the stored `payload` comparison
- [ ] 5.4 Add `docs/feedback/verification-matrix.md` rows and the P4 local-verify report;
      `Partial` where evidence is missing, never `Pass` by assertion
- [ ] 5.5 Leave the dev database clean by saving `{"interests":[]}` for each identity used

## 6. CI, gates and documents (owner: Dev drafts; IO/SA/VL decide)

- [ ] 6.1 Push `feat/travel_preference` only on the owner's explicit authorization; read
      the fresh CI run for this change's commit and write the pipeline report
- [ ] 6.2 G2 decision record by a named VL; G3 by a named SA; the agent never self-signs
- [ ] 6.3 Update `README.md` (endpoints, page route) and the registry/handoff rows
- [ ] 6.4 **Archive precondition (G1 condition 4):** fix the five ADDED requirement
      bodies that exceed 500 characters and rerun
      `openspec validate req-019-save-interests --strict` on a machine that has the CLI;
      this environment has no `openspec` on `PATH`, so no pass may be claimed from here
- [ ] 6.5 **Final task before archive (config.yaml `rules.tasks`):** reconcile
      `docs/knowledge/architecture/tech-stack-plan.md` with what this change actually
      shipped — the two endpoints (with `interest` only), the `member_preference`
      columns and `UNIQUE(trip_id,user_id,kind)`, and the deviations TS-1…TS-12 of the
      design; reconcile only work completed by an archived change, never planned or
      still-unarchived work; append a row to `docs/knowledge/_LOG.md` when the plan
      changes; close this task before `/opsx:archive` (config.yaml
      `operations.archive`)

## 7. Stage artifacts (owner: Dev)

- [ ] 7.1 P0–P2 artifacts and the G1 Pass record are committed
- [ ] 7.2 P3 `atdd-design.md`, `design.md`, this `tasks.md` and the alignment self-check
      below
- [ ] 7.3 Optionally run `/sdd:quality-checklist` (stage p3) before implementation

## Alignment self-check (Spec ↔ Design ↔ Tasks ↔ ATDD)

| Spec requirement | Design decision | Tasks | ATDD rows | Result |
|---|---|---|---|---|
| Preference caller identity and membership (5) | DD2, DD3 | 3.1, 1.1 | ID-1…ID-5 | Pass |
| Predefined interest catalogue (4) | DD4 | 2.3, 3.2, 1.1 | CAT-1…CAT-4, UT-1/UT-2 | Pass |
| Save member interests (8) | DD1, DD4, DD5 | 2.1, 2.2, 3.2, 1.1 | SAVE-1…SAVE-8, UT-3/UT-4 | Pass |
| Read member interests (5) | DD6 | 2.2, 3.3, 1.1 | READ-1…READ-5 | Pass |
| Preferences page (9) | DD7 | 4.1–4.4, 5.2 | PAGE-1…PAGE-9 | Pass |
| Non-goals (other kinds, US-027, US-026, US-031, auth, `tag`, locking, i18n, CI) | Goals / Non-Goals, DD1, DD3, DD7 | 1.2, 5.3 | ATDD §5 reverse table | Pass |
| Display contract (deep-dive ⑫: loading/empty/error/saving) | DD7 | 4.2, 5.2 | PAGE-1, PAGE-2, PAGE-7, PAGE-8, PAGE-9 | Pass |
| G1 condition 4 (strict validation) | Risks: strict validation still failing | 6.4 | — (not an ATDD row; archive gate) | Pass as a registered task, not as a passed check |
| Tech-stack baseline (`config.yaml` `context`) | Deviations TS-1…TS-12 recorded, none silent | 2.4, 6.5 | — (not an ATDD row; archive gate) | Pass as recorded deviations, not as fixes |

No silent scope creep: every task traces to a spec scenario, a declared non-goal reverse
check, or a stage artifact. NFR testing is explicitly excluded by the user's decision, so
its absence is not a gap. Self-check result: **Pass**.
