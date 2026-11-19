# Tasks

- Change: `req-019-save-interests` (REQ-019, US-019)
- Inputs: [proposal](proposal.md) · [delta spec](specs/preferences/spec.md) ·
  [ATDD design](atdd-design.md) · [design](design.md) ·
  [fixtures](../../../../requirement-workspace/acceptance-test-fixtures.md)
- G1: Pass closed 2026-11-16 (IO Emily 2026-11-15, SA evelyn.huang 2026-11-15 + sibling
  re-review), then **Pass again on the revised delta, 2026-11-16** (IO Emily + SA
  evelyn.huang; `g1-decision.md` revision re-review). P3 rulings: D15 own error advice, D16
  no shared-fixture edits, **D17
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
- [x] 1.4 Write the E2E check list (PAGE-1…PAGE-9, plus PAGE-10 for the screen-08
      baseline added on 2026-11-16) as numbered browser steps with expected observations
      (see the P4 local-verify report, §E2E)

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
- [x] 2.3 `V7__create_member_preference.sql` (originally `V4`, then `V6`): one table, `UNIQUE(trip_id,user_id,kind)`,
      no seed rows, no trigger (DD1); applies after `V5` with foreign keys on. Renumbered from
      `V4` when `origin/main` merged on 2026-11-16 — `V4` became the splits migration and
      `V5` already declares the same table as an `IF NOT EXISTS` stand-in, so the statement is
      now `CREATE TABLE IF NOT EXISTS` (8.8)
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

- [x] 4.1 Add `typescript`, `@types/react`, `@types/react-dom`,
      `@tanstack/react-query`, and add `tsconfig.json` (`strict`, `jsx: react-jsx`,
      `moduleResolution: bundler`, `allowJs`, `checkJs: false`, `noEmit`) and the `typecheck`
      script (DD9). `antd` and `react-router-dom` were added with the first version and both
      were settled by the merges: `antd` is gone (TS-13) and the router arrives with the
      splits screens (TS-12, 8.8)
- [x] 4.2 `src/api/client.ts` (`request<T>()` raising `ApiError {status, code, message}`),
      `src/api/preferences.ts`, `src/types/preferences.ts` (DD9); leave `api.js` for the
      un-migrated pages
- [x] 4.3 `main.jsx`: `QueryClientProvider` with `queries.retry = 0` so PAGE-9's retry is
      a user action (DD9)
- [x] 4.4 Routing (as the merge settled it): `App.tsx` gains the
      `#/trips/:tripId/preferences` branch in the hand-written `parseRoute`. `HashRouter` was
      not adopted because `origin/main` landed the app shell with `parseRoute` first (TS-12).
      The addresses did not move, so the REQ-003/004 deltas stay satisfied (DD9)
- [x] 4.5 `PreferencesPage.tsx`: query key `['preferences', tripId, userId]`,
      `useMutation` for the single PUT, rollback to the last acknowledged set on failure,
      retry action on load failure, no `localStorage`, no Clear All (DD9, DD10). First
      delivered with seven `Tag.CheckableTag` chips; revised on 2026-11-16 to the screen-08
      layout with ten Chinese `.pick` chips (8.3)
- [x] 4.6 `TripDetails.jsx`: one entry link to `#/trips/<id>/preferences` (D13)
- [x] 4.7 `npm ci && npm run typecheck && npm run build` pass. `app.css` gained exactly
      one class, `.pick` (8.4): the earlier "no new hand-written CSS classes" constraint
      predates the screen-08 baseline and is superseded by it. The build warns about a
      660 kB chunk, the expected cost recorded in the design's risks

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
- [x] 6.2 Push `feat/travel_preference` only on the owner's explicit authorization; read
      the fresh CI run for this change's commit and write the pipeline report — pushed to
      `e7333f0`, the owner opened PR #44, and run `43824457379` is green on that head
      (`Backend tests` 203/203, `Frontend build` with `typecheck`), read through the
      authenticated gh API; `ci-report.md` +
      `docs/ai4se-plugins/20261116-153521-pipeline-report.md`
- [x] 6.3 G2 decision record by a named VL; G3 by a named SA; the agent never self-signs —
      **G2 Pass recorded**. VL **Sammi Ng** signed `g2-decision.md` on 2026-11-16 17:19 (+0800)
      (signature commit `3b2d42d`, ticked `Pass`; the timestamp is that commit's time because the
      VL left the field blank). The agent only transcribed the signature into the gate fields —
      header, Decision, Approvers, Timestamp and the Code-review dimension row — and left the
      verdict untouched. G3 is now recorded too: SA **evelyn.huang** signed
      `g3-decision.md` Pass on 2026-11-16
- [x] 6.4 Update `README.md` (endpoints, page route, `typecheck`) and the registry/handoff
      rows: `README.md` carries the two endpoints, `#/trips/<id>/preferences`, the
      `typecheck` command and the CI step; `requirement-workspace/registry.md` and
      `handoff.md` record P4 complete, Overall Partial and TS-11 open
- [x] 6.5 **Archive precondition (G1 condition 4):** fix the five ADDED requirement
      bodies that exceed 500 characters and rerun
      `openspec validate req-019-save-interests --strict` on a machine that has the CLI —
      **closed 2026-11-16.** The five bodies were rewritten from 944 / 964 / 1381 / 613 /
      1729 characters to 460 / 522 / 443 / 330 / 488 (plain character count) by stating one
      behaviour each and leaving the detail to the
      scenario that already asserted it (identity checks, the label→code table, malformed
      bodies, idempotency, the one-row rule, response field set, read-only, the screen-08
      layout via the approved screen). No scenario was added, removed or reworded, so the
      requirement/scenario counts stay 5 / 31. `openspec validate req-019-save-interests
      --strict` → `Change 'req-019-save-interests' is valid`, exit 0
- [x] 6.6 **Final task before archive (config.yaml `rules.tasks`):** reconcile
      `docs/knowledge/architecture/tech-stack-plan.md` with what this change actually
      shipped — the two endpoints (with `interest` only), the `member_preference` columns
      and `UNIQUE(trip_id,user_id,kind)`, the §7 datasource baseline, the frontend stack
      gap on the five un-migrated pages, and the deviations TS-1…TS-10 of the design;
      reconcile only work completed by an archived change, never planned or
      still-unarchived work; append a row to `docs/knowledge/_LOG.md` when the plan
      changes; close this task before `/opsx:archive` (config.yaml
      `operations.archive`) — **closed 2026-11-16.** §17 records only what shipped: the
      `GET`/`PUT /api/trips/{tripId}/preferences` contract on session identity, the ten-label
      catalogue with its codes, `V7__create_member_preference.sql` and the
      `UNIQUE(trip_id,user_id,kind)` key (noting `V5`'s `IF NOT EXISTS` pre-declaration makes
      it a no-op on this baseline), the page route and the CI `typecheck` step, plus TS-2 and
      TS-11 as accepted deviations. §5's `member_id`/plain index and §6's `X-Member-Id` are
      marked as superseded rather than rewritten, so the plan keeps its planning history. One
      `_LOG.md` row appended; `scripts/kb-lint.sh` still prints SKIP (documented baseline), so
      `_INDEX.md` needs no row because no new knowledge file was created

## 7. Stage artifacts (owner: Dev)

- [x] 7.1 P0–P2 artifacts and the G1 Pass record are committed (`proposal.md`,
      `specs/preferences/spec.md`, `dov-ac-review.md`, `g1-decision.md`, `.openspec.yaml`
      are in the branch history)
- [x] 7.2 P3 `atdd-design.md`, `design.md`, this `tasks.md` and the alignment self-check
      below are committed with the P4 code
- [ ] 7.3 Optionally run `/sdd:quality-checklist` (stage p3) before implementation —
      **not run, optional and skipped**; no checklist report exists for this change, so no
      pass may be claimed from it

## 8. Revision 2026-11-16 — Chinese catalogue and the screen-08 page (owner: Dev)

Raised by the requirement owner after the P4 code existed. It changes the G1-passed delta,
so it is logged here instead of being absorbed silently.

- [x] 8.1 Catalogue: `InterestCatalogue` holds the ten Chinese labels (`水上运动`, `潜水`,
      `摄影`, `美食`, `咖啡`, `历史人文`, `手作`, `自然风景`, `冒险`, `慢游`) with codes
      `water`, `diving`, `photo`, `food`, `coffee`, `heritage`, `craft`, `nature`,
      `adventure`, `slow`
- [x] 8.2 `PreferenceApiTest`: `ALL_TEN`, CAT-1…CAT-4 renamed and re-pointed, every label
      and code assertion in the SAVE/READ scenarios replaced. Red first (15 failures + 1
      error in 29 cases), green after 8.1
- [x] 8.3 Page: top app bar (back, `我的偏好`, `<name> · US-019`, save-state badge), the
      `兴趣（US-019 · 预设列表、不重复）` heading, ten emoji chips in prototype order with
      the selected chip inverted, a hint line and a fixed bottom primary button; the
      US-020/024/027 blocks are not rendered (PAGE-10)
- [x] 8.4 `app.css` gains one class, `.pick` (hover/selected/disabled); the merged `.chip`
      used by the main-itinerary pages is untouched
- [x] 8.5 Documents follow the code: `specs/preferences/spec.md` (catalogue table, CAT-2,
      the read and page scenarios, the visual baseline), `design.md` (Goals, DD6, DD9,
      DD10, TS-5, TS-12 and the revision section), `atdd-design.md` (CAT rows, PAGE-10),
      `README.md`, `docs/feedback/verification-matrix.md` and the P4 report
- [x] 8.6 **G1 re-review by IO + SA** on the revised delta — **Pass, 2026-11-16**. IO Emily
      and SA evelyn.huang both signed the revised text per the requirement owner's explicit
      instruction, with no conditions and no findings; recorded in `g1-decision.md`
      §"Revision re-review (2026-11-16) — Pass" and mirrored in `dov-ac-review.md` §8. G2 may
      now cite that record for this text. The agent did not sign for either role.
- [x] 8.7 Browser pass at `#/trips/<id>/preferences` against the running backend and Vite dev
      server, compared with `screen-08-preferences.png` (PAGE-10). Headless Edge captures at
      520×940 / 2×: `docs/ai4se-plugins/20261116-preferences-empty.png` (nothing selected) and
      `20261116-preferences-selected.png` (水上运动/潜水/摄影 after a save plus reload). App
      bar, heading, chip order and selection inversion match; the scoped differences
      (subtitle, badge text, button text, absent US-020/024/027 blocks) are listed in the P4
      report
- [x] 8.8 Merge `origin/main` (`bac8095`, splits + `shadcn/ui`) and reconcile: six conflicts
      resolved (`application.yml`, `package.json`, `package-lock.json`, `main.jsx`,
      `tsconfig.json`, `impact-brief.md`), the preference migration renumbered `V4` → `V6`
      (2.3), `antd` dropped for `.notice` (TS-13), `typecheck` defined as `tsc -b`. Re-run on
      the merged tree: `mvn -B clean test` 203/203 green, `npm run typecheck` clean,
      `npm run build` 136 modules / 487.83 kB JS. Evidence: P4 report §"Merge with
      `origin/main` (2026-11-16)"
- [x] 8.9 Merge `origin/main` a second time (`f11d395`, PR #46 = US-065's full TypeScript
      migration) and reconcile: two conflicts — `frontend/package.json` (took main's
      `typecheck` = `tsc --noEmit` and `build` = `npm run typecheck && vite build`, superseding
      8.8's `tsc -b`, because `tsconfig.app.json` is deleted and `tsconfig.json` now carries
      `noEmit`) and `frontend/src/main.tsx` (kept the PAGE-9 retry comment; main deleted
      `main.jsx`). Auto-merged and re-checked: `App.tsx` still routes
      `#/trips/<id>/preferences`, `TripDetails.tsx` still links to it, `PreferencesPage.tsx`
      compiles under the merged strict config. Merged tree: `npm ci`, `npm run typecheck` clean,
      `npm run build` 136 modules / 488.36 kB JS / 38.39 kB CSS. No backend file in the merge, so
      the 203/203 backend run from 8.8 still stands. Local-only caveat: main's lockfile marks
      `@rolldown/binding-win32-x64-msvc` with `libc: glibc`, so Windows `npm ci` skips it and
      `vite build` cannot load a native binding; it was installed with `npm i --no-save` to build
      here and `package.json`/`package-lock.json` were left as main owns them (retired in 8.10)
- [x] 8.10 Merge `origin/main` a third time (`40381ac` = `171ec00` "fix(main): fixing frontend
      build error" + the US-049/050 G1 record) and reconcile: one conflict, `README.md` —
      kept main's "missing native binding" note and corrected the branch's stale
      `tsc -b --noEmit` to the shipped `tsc --noEmit`, noting CI runs it between `npm ci` and
      the build. `171ec00` removes the non-Linux `libc` constraints from
      `frontend/package-lock.json` and adds `frontend/tests/lockfile.test.mjs`; `ci.yml`
      auto-merged into `Check lockfile portability` → `npm ci` → `typecheck` → `build`. The 8.9
      workaround is retired: `npm ci` now installs `@rolldown/binding-win32-x64-msvc` (81
      packages). Verified on the merged tree: lockfile test 2/2, `tsc --noEmit` clean,
      `npm run build` 136 modules / 488.36 kB JS / 38.39 kB CSS; no backend file in the merge,
      so 203/203 still stands. Merge commit `f16d009`; PR #44 back to `CLEAN` and run
      43829662798 green on that head
- [x] 8.11 Merge `origin/main` a fourth time (`80d3dce` = PR #48, which archives US-066 and
      US-065 and adds the US-049/050 follow-up) and reconcile: four conflicts, `README.md`,
      `backend/pom.xml` (kept `spring-boot-starter-validation` **and** main's
      `spring-boot-starter-security`), `frontend/src/App.tsx` and `frontend/src/types.ts`
      (`AccountBar` replaces `ScaffoldBar`; `login` joins the full-page list). Two adaptations
      were forced by main's US-066 rather than by the conflict itself: the migration was
      renumbered `V6` → `V7` because `V6__create_account_credential.sql` now exists on `main`,
      and the preference endpoints take the caller from `Authentication`/`AccountPrincipal`
      instead of `X-User-Id` (the header is now inert; an anonymous call is `401
      USER_REQUIRED` and a `PUT` needs the CSRF token). `PreferenceApiTest` switched to
      `TestAuth.asUser`/`csrfOnly` and kept 29 tests, with the two header scenarios rewritten
      as "anonymous + old header is still 401" and "a header that disagrees with the session
      does not change the stored member". The page derives `userId` from `useAuth()` and the
      client uses main's `api()` + `lib/csrf`, so the obsolete `api/client.ts` was deleted.
      Verified on the merged tree: `mvn -B clean test` 243/243, `npm run typecheck` clean,
      lockfile test 2/2, `npm run build` 500.89 kB JS
- [x] 8.12 Merge `origin/main` a fifth time (`5b7a1be`, US-013's member roster) and reconcile:
      three conflicts, all "both sides added" — `README.md` (US-013 paragraph kept beside the
      preference paragraphs), `docs/knowledge/_LOG.md` (both KB rows kept) and
      `frontend/src/App.tsx` (`Members` and `PreferencesPage` imports both kept); `app.css`,
      `types.ts`, `ci.yml` and the `requirement-workspace` ledgers auto-merged. No preference
      code, migration or test line changed. Verified: `mvn -B clean test` 255/255 (243 plus
      main's `TripMembersApiTest` 12), `npm run typecheck` clean, lockfile test 2/2,
      `npm run build` 503.85 kB JS
- [x] 8.13 Merge `origin/main` a sixth time (`81af3d1`, US-067's QR scanner and US-071's
      P1/P2 documents) after PR #44 was merged: 24 commits, **no conflict** — the automatic
      merge kept both sides for `README.md`, `docs/knowledge/_LOG.md`, `frontend/src/App.tsx`,
      `app.css`, `types.ts`, `package.json`/`package-lock.json` (the merge itself changed none
      of this change's files, since the branch side only carried `spec.md`, `tasks.md` and
      `g3-decision.md`). No preference code, migration, test or spec line changed. Verified: `mvn -B clean test` 255/255 (28
      suites; main's new work was frontend and docs only), `npm run typecheck` clean, lockfile
      test 2/2, `npm run build` 645.74 kB JS / 44.41 kB CSS / 142 modules (main's `Scanner.tsx`
      and `scan.ts` grew the bundle; the >500 kB chunk warning is pre-existing),
      `openspec validate req-019-save-interests --strict` still `is valid`
- [x] 8.14 Land G3 in `main` and archive (2026-11-16): the G3 record, the strict-validation fix
      and the sixth merge reached `main` through **PR #50** (`head b3c5b92`, base `81af3d1`,
      3 commits / 5 files +174 −110, pull-request run `43876766780` green, merge commit
      `5183291`, main push run `43877290310` green); `ci-report.md` gained the PR #50 section.
      The archive was then cut from `origin/main` `db45609` (US-072's archive plus two `lumi_dev`
      syncs), ran `openspec archive req-019-save-interests -y`, moved the package to
      `openspec/changes/archive/2026-11-16-req-019-save-interests/` and merged the delta into
      `openspec/specs/preferences/spec.md`; `change-summary.md` was authored, tech-stack §17 and
      a `_LOG.md` row were added (6.6), and the registry/handoff rows now carry G3 Pass and the
      archive path. Result recorded in `g3-decision.md` under "Archive result"

## Alignment self-check (Spec ↔ Design ↔ Tasks ↔ ATDD)

| Spec requirement | Design decision | Tasks | ATDD rows | Result |
|---|---|---|---|---|
| Preference caller identity and membership (5) | DD3, DD5 | 3.1, 1.1 | ID-1…ID-5 | Pass |
| Predefined interest catalogue (4) | DD4, DD6 | 2.5, 3.2, 1.1 | CAT-1…CAT-4, UT-1/UT-2 | Pass |
| Save member interests (8) | DD1, DD4, DD6, DD7 | 2.3, 2.4, 3.2, 1.1 | SAVE-1…SAVE-8, UT-3/UT-4 | Pass |
| Read member interests (5) | DD8 | 2.4, 3.4, 1.1 | READ-1…READ-5 | Pass |
| Preferences page (9) | DD9, DD10 | 4.1–4.7, 5.2, 8.3, 8.4 | PAGE-1…PAGE-10 | Pass |
| Non-goals (other kinds, US-027, US-026, US-031, auth, `tag`, locking, i18n, page migration) | Goals / Non-Goals, DD1, DD3, DD9 | 1.2, 5.3 | ATDD §5 reverse table | Pass |
| Display contract (deep-dive ⑫: loading/empty/error/saving) | DD9, DD10 | 4.5, 5.2 | PAGE-1, PAGE-2, PAGE-7, PAGE-8, PAGE-9 | Pass |
| Revision 2026-11-16 (Chinese catalogue, screen-08 baseline); merges of `origin/main`; archive | DD6, DD9, DD10, TS-13; Revision section | 8.1–8.14 | CAT-1…CAT-4, SAVE-1, PAGE-3, PAGE-7, PAGE-10 | Pass — 8.1–8.14 all closed; 8.6 is the G1 revision re-review, signed Pass 2026-11-16 by IO Emily and SA evelyn.huang; 8.8–8.13 are the six `origin/main` merges; 8.14 is the G3 landing through PR #50 and the archive
| G1 condition 4 (strict validation) | Risks: strict validation still failing | 6.5 | — (not an ATDD row; archive gate) | **Pass** — 6.5 closed 2026-11-16: `openspec validate req-019-save-interests --strict` → `is valid`, exit 0 |
| Tech-stack baseline (`config.yaml` `context`, D17 plan-first) | DD2, DD3, DD4, DD9, DD12; deviations TS-1…TS-13 | 2.1, 2.2, 4.1, 6.1, 6.6 | — (not an ATDD row; archive gate) | Pass as plan-first choices plus recorded deviations (TS-11 still open) |

No silent scope creep: every task traces to a spec scenario, a declared non-goal reverse
check, or a stage artifact. NFR testing is explicitly excluded by the user's decision, so
its absence is not a gap. Self-check result: **Pass**. 8.6 was the only item owned by
someone else; it closed on 2026-11-16 when IO Emily and SA evelyn.huang signed the
revised delta.
