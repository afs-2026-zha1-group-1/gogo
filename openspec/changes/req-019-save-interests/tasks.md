# Tasks

- Change: `req-019-save-interests` (REQ-019, US-019)
- Inputs: [proposal](proposal.md) · [delta spec](specs/preferences/spec.md) ·
  [ATDD design](atdd-design.md) · [design](design.md) ·
  [fixtures](../../../requirement-workspace/acceptance-test-fixtures.md)
- G1: Pass closed 2026-11-16 (IO Emily 2026-11-15, SA evelyn.huang 2026-11-15 + sibling
  re-review). P3 rulings: D15 own error advice, D16 no shared-fixture edits, **D17
  plan-first stack** (the plan wins; code-consistency only where the plan cannot apply).
- Order rule: acceptance checks red before production code (ATDD design §2).
- NFR tests: out of scope by the user's decision on 2026-11-16 (ATDD design §6). P4
  delivers functional evidence only.
- Commit rule: local commits are allowed; pushing `feat/travel_preference` needs the
  owner's explicit authorization (the SA has stated they will push).

## 1. Red acceptance checks (owner: Dev; before any production code)

- [x] 1.1 Author `backend/src/test/java/com/gogo/preference/PreferenceApiTest.java`
      covering ID-1…ID-5, CAT-1…CAT-4, SAVE-1…SAVE-8, READ-1…READ-5; own in-memory
      SQLite file with `&foreign_keys=on`, Flyway `V1`–`V4`, pool size 1, assertions
      through `JdbcClient`, `@BeforeEach` clears `member_preference`, fixture trip id
      resolved by name (DD11, ATDD §4)
- [x] 1.2 Add the API-level reverse checks of ATDD §5: only the `interest` kind written,
      the caller's own row only, no `noPreference`/`ready` fields, no lock after
      `main_plan_confirmed = 1`, no `/api/tags`
- [x] 1.3 Run `mvn test`; record the red run and confirm it fails for the right reason
      (no `V4` table, no route), with `GreetingApiTest`, `TripApiTest` and
      `InvitationApiTest` still green — this run is also the first proof that the §7
      datasource change (2.1) breaks nothing. Red: 29 errors, all
      `no such table: member_preference`; after the green phase the full suite is 60/60
- [x] 1.4 Write the E2E check list (PAGE-1…PAGE-9) as numbered browser steps with
      expected observations (see the P4 local-verify report, §E2E)

## 2. Platform baseline and persistence (owner: Dev)

- [x] 2.1 `application.yml`: `journal_mode=WAL&busy_timeout=5000&foreign_keys=on` on the
      SQLite URL and `hikari.maximum-pool-size=1` (DD2, plan §7). Run the whole suite
      before and after; `V1`–`V3` seeds were reviewed and satisfy their foreign keys
- [x] 2.2 `pom.xml`: add `spring-boot-starter-validation` (DD4) and, per plan §7,
      `flyway-database-nc-sqlite` with an explicit `${flyway.version}` plus a pinned
      `sqlite-jdbc` (DD12). If the module does not resolve for the managed Flyway
      version, do **not** move the Flyway version — record the gap and fall back, since
      four changes share `V1`–`V4`. **The fallback branch was taken:**
      `dependency:get org.flywaydb:flyway-database-nc-sqlite:11.7.2` answered
      `Could not find artifact ... in central`, so `flyway-core` stays and the gap is
      design TS-11
- [x] 2.3 `V4__create_member_preference.sql`: one table, `UNIQUE(trip_id,user_id,kind)`,
      no seed rows, no trigger (DD1); confirm it applies after `V3` with foreign keys on
- [x] 2.4 `PreferenceRepository` on `JdbcClient` with `record` mapping (DD3): the single
      upsert save statement and the member-left-join read query (DD7, DD8); `payload`
      written as `{"codes":[...]}`
- [x] 2.5 `InterestCatalogue` constants in AC order, first-occurrence dedupe and
      label→code mapping (DD6); apply-time unit TDD for UT-1, UT-2, UT-3, UT-4

## 3. Endpoints, validation and error mapping (owner: Dev)

- [x] 3.1 `PreferenceController`: `GET` and `PUT /api/trips/{tripId}/preferences` with
      body shape → identity → trip existence → membership (DD5), reusing
      `TripRepository`
- [x] 3.2 `PreferenceSaveRequest` with `@NotNull` scalar presence plus a field-level
      `StrictStringListDeserializer` for element type (DD4, corrected at apply time);
      the catalogue check stays in the service and answers `INTEREST_NOT_ALLOWED`,
      `[]` clears, `200` echoes `{"interests":[…]}`
- [x] 3.3 `PreferenceApiException` + `PreferenceErrorAdvice` for
      `com.gogo.preference`, covering `MethodArgumentNotValidException` and
      `HttpMessageNotReadableException` as `INVALID_REQUEST` (DD4, D15)
- [x] 3.4 `GET`: `{"members":[…]}` with exactly `userId` and `interests`, ordered by
      `userId`, unsaved members present with `[]` (DD8)
- [x] 3.5 Run `mvn test`: ID/CAT/SAVE/READ checks green, merged capability tests unchanged
      (60/60: Greeting 3, Invitation 15, Preference 29, Trip 13)

## 4. Frontend on the plan stack (owner: Dev)

- [x] 4.1 Add `typescript`, `@types/react`, `@types/react-dom`, `antd`,
      `@tanstack/react-query`, `react-router-dom`; add `tsconfig.json` (`strict`,
      `jsx: react-jsx`, `moduleResolution: bundler`, `allowJs`, `checkJs: false`,
      `noEmit`) and the `typecheck` script (DD9)
- [x] 4.2 `src/api/client.ts` (`request<T>()` raising `ApiError {status, code, message}`),
      `src/api/preferences.ts`, `src/types/preferences.ts` (DD9); leave `api.js` for the
      un-migrated pages
- [x] 4.3 `main.jsx`: `QueryClientProvider` with `queries.retry = 0` so PAGE-9's retry is
      a user action (DD9)
- [x] 4.4 `App.jsx`: `HashRouter` + route table for `/`, `/create`, `/trips/:tripId`,
      `/trips/:tripId/preferences`, `/join/:token`; the addresses must not move, so the
      REQ-003/004 deltas stay satisfied (DD9). Tell the JS→TS migration owner before this
      lands
- [x] 4.5 `PreferencesPage.tsx`: seven `Tag.CheckableTag` chips keyed by label, `Button`
      for Save, `Alert` for the server `message`, `Skeleton`/`loading` for the pending
      state, `ConfigProvider` theme `colorPrimary = #0d9488`; query key
      `['preferences', tripId, userId]`, `useMutation` for the single PUT, rollback to the
      last acknowledged set on failure, retry action on load failure, no `localStorage`,
      no Clear All (DD9, DD10)
- [x] 4.6 `TripDetails.jsx`: one entry link to `#/trips/<id>/preferences` (D13)
- [x] 4.7 `npm ci && npm run typecheck && npm run build` pass, and no new hand-written
      CSS classes are added to `app.css` (DD9). Build warns about a 660 kB chunk, the
      expected cost recorded in the design's risks

## 5. Runtime acceptance and E2E (owner: Dev; evidence in the local-verify report)

- [x] 5.1 Start backend (8080) and frontend (5173); confirm by port owner and endpoint
      response (port owner PID 46936 after the restart, `GET /api/trips/1/preferences` 200)
- [x] 5.2 Execute PAGE-1…PAGE-9 with the identity switcher; capture the observations,
      including the 400 rollback and the identity switch. Recorded in the P4 report;
      PAGE-4 (in-flight disable) and PAGE-7 (400 rollback) are `Partial` because a
      ~20 ms local round trip makes the pending state invisible and the page offers no
      way to submit an invalid label
- [x] 5.3 Re-run every API scenario with `curl` against the running backend, including
      the reverse checks and the stored `payload` comparison
      (`docs/ai4se-plugins/20261116-1205-req019-api-verify-{commands.ps1,run.log}`)
- [x] 5.4 Add `docs/feedback/verification-matrix.md` rows and the P4 local-verify report;
      `Partial` where evidence is missing, never `Pass` by assertion
- [x] 5.5 Leave the dev database clean by saving `{"interests":[]}` for each identity used
      (Alice 1, Ben 2, Chloe 3 all hold `{"codes":[]}`); the trip created accidentally
      during the browser pass (`id=2`) was deleted

## 6. CI, gates and documents (owner: Dev drafts; IO/SA/VL decide)

- [x] 6.1 `.github/workflows/ci.yml`: frontend job gains `npm run typecheck` between
      `npm ci` and `npm run build` (DD12); backend job unchanged. Shared file — tell the
      other in-flight change owners
- [ ] 6.2 Push `feat/travel_preference` only on the owner's explicit authorization; read
      the fresh CI run for this change's commit and write the pipeline report
- [ ] 6.3 G2 decision record by a named VL; G3 by a named SA; the agent never self-signs
- [x] 6.4 Update `README.md` (endpoints, page route, `typecheck`) and the registry/handoff
      rows: `README.md` carries the two endpoints, `#/trips/<id>/preferences`, the
      `typecheck` command and the CI step; `requirement-workspace/registry.md` and
      `handoff.md` record P4 complete, Overall Partial and TS-11 open
- [ ] 6.5 **Archive precondition (G1 condition 4):** fix the five ADDED requirement
      bodies that exceed 500 characters and rerun
      `openspec validate req-019-save-interests --strict` on a machine that has the CLI;
      this environment has no `openspec` on `PATH`, so no pass may be claimed from here
- [ ] 6.6 **Final task before archive (config.yaml `rules.tasks`):** reconcile
      `docs/knowledge/architecture/tech-stack-plan.md` with what this change actually
      shipped — the two endpoints (with `interest` only), the `member_preference` columns
      and `UNIQUE(trip_id,user_id,kind)`, the §7 datasource baseline, the frontend stack
      gap on the five un-migrated pages, and the deviations TS-1…TS-10 of the design;
      reconcile only work completed by an archived change, never planned or
      still-unarchived work; append a row to `docs/knowledge/_LOG.md` when the plan
      changes; close this task before `/opsx:archive` (config.yaml
      `operations.archive`)

## 7. Stage artifacts (owner: Dev)

- [x] 7.1 P0–P2 artifacts and the G1 Pass record are committed (`proposal.md`,
      `specs/preferences/spec.md`, `dov-ac-review.md`, `g1-decision.md`, `.openspec.yaml`
      are in the branch history)
- [x] 7.2 P3 `atdd-design.md`, `design.md`, this `tasks.md` and the alignment self-check
      below are committed with the P4 code
- [ ] 7.3 Optionally run `/sdd:quality-checklist` (stage p3) before implementation —
      **not run, optional and skipped**; no checklist report exists for this change, so no
      pass may be claimed from it

## Alignment self-check (Spec ↔ Design ↔ Tasks ↔ ATDD)

| Spec requirement | Design decision | Tasks | ATDD rows | Result |
|---|---|---|---|---|
| Preference caller identity and membership (5) | DD3, DD5 | 3.1, 1.1 | ID-1…ID-5 | Pass |
| Predefined interest catalogue (4) | DD4, DD6 | 2.5, 3.2, 1.1 | CAT-1…CAT-4, UT-1/UT-2 | Pass |
| Save member interests (8) | DD1, DD4, DD6, DD7 | 2.3, 2.4, 3.2, 1.1 | SAVE-1…SAVE-8, UT-3/UT-4 | Pass |
| Read member interests (5) | DD8 | 2.4, 3.4, 1.1 | READ-1…READ-5 | Pass |
| Preferences page (9) | DD9, DD10 | 4.1–4.7, 5.2 | PAGE-1…PAGE-9 | Pass |
| Non-goals (other kinds, US-027, US-026, US-031, auth, `tag`, locking, i18n, page migration) | Goals / Non-Goals, DD1, DD3, DD9 | 1.2, 5.3 | ATDD §5 reverse table | Pass |
| Display contract (deep-dive ⑫: loading/empty/error/saving) | DD9, DD10 | 4.5, 5.2 | PAGE-1, PAGE-2, PAGE-7, PAGE-8, PAGE-9 | Pass |
| G1 condition 4 (strict validation) | Risks: strict validation still failing | 6.5 | — (not an ATDD row; archive gate) | Pass as a registered task, not as a passed check |
| Tech-stack baseline (`config.yaml` `context`, D17 plan-first) | DD2, DD3, DD4, DD9, DD12; deviations TS-1…TS-11 | 2.1, 2.2, 4.1, 6.1, 6.6 | — (not an ATDD row; archive gate) | Pass as plan-first choices plus recorded deviations (TS-11 still open) |

No silent scope creep: every task traces to a spec scenario, a declared non-goal reverse
check, or a stage artifact. NFR testing is explicitly excluded by the user's decision, so
its absence is not a gap. Self-check result: **Pass**.
