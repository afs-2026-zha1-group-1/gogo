# Verification report — US-031-037 main itinerary (P4 runtime acceptance)

- Change: `us-031-037-main-itinerary` (tasks 6.1–6.4)
- Executed: 2026-11-15, branch `US-031-037-main-itinerary-planning`
- Authority: [E2E checklist](e2e-us-031-037.md) · ATDD design §1/§4 ·
  fixtures §US-031-037 "State setup" · design D11
- Environment: backend `java -jar gogo-backend-0.0.1-SNAPSHOT.jar` on 8080
  (dev SQLite `backend/data/gogo.db`, Flyway V1–V5), frontend Vite dev server
  on 5173 with `/api` proxy; identity via the existing scaffold switcher
  (Alice 1 organizer, Ben 2 member, Eve 5 non-member)
- Screenshots: `frontend/logs/` (gitignored process evidence; the browser
  tool initially wrote them to `frontend/` root and they were moved here)
- Test-only flips: direct SQLite updates per fixtures "State setup"
  (`backend/target/flip.py`, workspace-only helper); default dev state
  restored after every flipped case and at the end (verified: 0 drafts,
  flag 0, 4 members ready rev 1, seed locations, 0 invitations, 0 budget rows)

## 6.1 Runtime startup (verified by port owner + endpoint, not logs)

- 8080 listener owned by java PID 28576; 5173 by node PID 42164 (Vite)
- `GET /api/trips/1/main-plan/inputs` (X-User-Id 2) → 200 before E2E
- After ST-3 the backend was restarted from the same jar; readiness polled
  via the inputs endpoint (200), then the final reset was applied

## 6.3 API matrix against the running backend

- Script: `backend/target/verify-matrix.ps1` (65 checks, phases A–E)
- Log: [us-031-037-matrix-run.log](us-031-037-matrix-run.log) —
  **65 passed, 0 failed**: M1–M14, V1–V7, identity/trip/role negatives,
  reverse checks (no preference write route, inputs read-only, soft budget
  invisible), J4 closure (issue 200 after confirm, accept 403
  `JOINING_CLOSED`, Eve not a member)
- Harness fixes during matrix authoring (not product defects): the
  `member_preference` stand-in requires `updated_at` on INSERT; PowerShell
  5.1 strips embedded quotes from native arguments, so budget payloads are
  built inside `flip.py` via `json.dumps`
- Observation (not a gap): a corrupted stored budget payload makes the
  product fail fast with 500; fixtures always store valid JSON and REQ-019
  owns preference write validation

## 6.2 E2E checklist results

Wording is free per fixtures ruling; Observed records actual wording.
"rec." = recorded browser observation (screenshot tool timed out).

| # | Observed | Evidence |
|---|---|---|
| S9-1 | Ben: ready pill 4/4, Alice/Ben/Chloe/Daniel each "已就绪 · 偏好修订 1"; no error surface | `frontend/logs/s9-1-ben-summary.png` |
| S9-2 | Common interests chips food + culture; must-do union lists the four seeded stops | `frontend/logs/s9-2-interests-mustdo.png` |
| S9-3 | Four budget lines "不设硬预算"; rules list shows the six identifiers | `frontend/logs/s9-3-budgets-rules.png` |
| S9-4 | Ben: no generate button; hint "只有组织者可以生成主线方案…" | `frontend/logs/s9-4-ben-readonly.png` |
| S9-5 | Alice: "一键生成主线方案" present; click → POST 201 → navigates to Screen 10 draft v1 | `frontend/logs/s9-5-alice-generated.png` |
| S9-6 | Eve: denial state, no preference/budget data leaked | `frontend/logs/s9-6-eve-denied.png` |
| S10-1 | Alice: 4 stops 09:00–09:30 / 10:00–10:30 / 11:00–11:15 / 11:30–12:00, legs 30/30/15 (none on last), cost S$50, badge "草稿 v1", not confirmed | `frontend/logs/s10-1-alice-draft.png` (+ `-top`/`-bottom`) |
| S10-2 | Ben: same timeline, no confirm/regenerate actions, read-only hint | `frontend/logs/s10-2-ben-readonly.png` |
| S10-3 | Alice confirm on valid v1 → green card "主线方案已确认 · 加入已关闭", badge "已确认 v1" (version stays 1), timeline unchanged, action bar gone; DB: draft v1 `confirmed`, trip flag 1 | rec. (round 5) + SQL verification; screenshot tool timeout |
| S10-4 | After confirm Alice's trip detail still issues a link (QR + URL); Eve opens it → closed-joining UI "加入已关闭" + "主线方案已确认，新的成员不能再加入。", no accept button. Closed UI renders from the preview `mainPlanConfirmed` flag (existing REQ-004 Join behavior); the 403 `JOINING_CLOSED` accept rejection is evidenced by matrix J4 | `frontend/logs/s10-4-alice-invite.png`, `frontend/logs/s10-4-eve-join-closed.png`, matrix log J4 rows |
| S10-5 | Confirmed state terminal: Alice has no regenerate/confirm buttons; Ben sees the same confirmed read-only view | `frontend/logs/s10-5-ben-confirmed.png` + rec. (Alice, round 3) |
| B-1 | Daniel `ready=0`: Screen 9 shows 3/4 with Daniel "未就绪"; generate → red error "还有成员未就绪：Daniel。请等所有成员提交偏好后再试。", stays on Screen 9; SQL: 0 drafts; Screen 10 keeps empty state "还没有主线方案" + organizer CTA | `frontend/logs/b1-not-ready-blocked.png`; empty state rec. + `frontend/logs/st2-empty-alice.png` (same UI) + SQL; empty-state screenshot tool timeout |
| B-2 | Alice hard budget 4000: confirm → red card "确认被拦截：请先修复以下问题" with "Alice 超出硬预算 / 硬预算 S$40 · 人均费用 S$50 · 超出 S$10"; no schedule rows; badge stays "草稿 v1"; action bar remains | `frontend/logs/b2-overrun-blocked.png` (5/5 checks) |
| B-3 | Budget removed + Ben rev 2: yellow banner "此草稿已过期 / 有成员的偏好修订号发生了变化。请重新生成后再确认。"; confirm → red stale message "Member preferences changed since this draft was generated; regenerate before confirming"; regenerate offered | `frontend/logs/b3-stale-blocked.png` |
| B-4 | Regenerate → badge "草稿 v2", banner gone; confirm → confirmed green card, badge "已确认 v2" | `frontend/logs/b4-confirmed.png` |
| B-5 | Stop 1 leg flipped to 45 (30-min gap): confirm → red card row "第 1 站 · 路程超出空档（TRAVEL_EXCEEDS_GAP）" + "Travel from stop 1 does not fit before stop 2 starts"; no overrun row; stays draft; matrix V3 covers all five types | rec. (round 5); screenshot tool timeout; matrix log V3 rows |
| B-6 | Null locations: trip detail shows "尚未设置，可由后续主线生成补全"; generate → detail shows 出发地 Merlion Park / 返程地 City Hall MRT (preferences-first, persisted: SQL). Supplied case: seed City Hall MRT / Merlion Park preserved after generate (SQL + UI) | `frontend/logs/b6-null-completed.png`, `frontend/logs/b6-supplied-preserved.png` + SQL |
| ST-1 | **Partial** — loading strings exist ("正在加载生成输入…" / "正在加载主线方案…") but the local backend answers too fast to capture the in-flight skeleton; `st1-loading.png` actually shows the ready state, not a skeleton | `frontend/logs/st1-loading.png` (misnamed; ready state) + rec. |
| ST-2 | No draft: Alice empty state with CTA "去生成主线方案"; Ben read-only empty state "组织者还没有生成主线方案…"; no crash | `frontend/logs/st2-empty-alice.png`, `frontend/logs/st2-empty-ben.png` |
| ST-3 | Backend stopped: both surfaces show failure cards "无法加载生成输入" / "无法加载主线方案" with "HTTP 502", 重试 + 返回首页; retry re-renders failure; no blank page, no unhandled exception | `frontend/logs/st3-inputs-failed.png`, `frontend/logs/st3-plan-failed.png` |
| ST-4 | Eve denied on both surfaces; Ben reads without write actions; Alice has organizer actions | `frontend/logs/s9-6-eve-denied.png`, `frontend/logs/st4-eve-plan-denied.png`, `s9-4`/`s10-2` vs `s9-5`/`b4` |

## CI-gate evidence (local, task 7.x input)

- `mvn -B test` (Maven 3.9.16): **90/90 green, BUILD SUCCESS** —
  MainPlanApiTest 34, TripApiTest 13, InvitationApiTest 15, GreetingApiTest 3,
  ScheduleValidatorTest 11, LocationCompletionTest 6, BudgetOverrunsTest 5,
  FakeMainPlanProviderTest 3 (re-run after all E2E rounds)
- `npm run build`: vite 53 modules, built in 125ms, no errors

## Deviations and open items

1. ST-1 is **Partial** (no in-flight skeleton capture); never asserted Pass.
2. Three screenshots missing due to browser screenshot-tool timeouts
   (B-1 empty state, B-5, S10-3); each row still has recorded observations
   plus SQL/matrix cross-evidence, per the checklist's "recorded observation"
   allowance.
3. S10-4 closed UI appears immediately from the preview flag instead of
   after a rejected accept click; this is existing REQ-004 Join behavior and
   the 403 path is covered by the API matrix (J4). Recorded, not a gap.
4. Round-5 browser reused a stale page once (leftover B-5 blocked card);
   after reload the confirm succeeded and DB state matched expectations.
5. No product code was changed during runtime acceptance; all flips were
   test-only and restored.

## Exit criteria

Every checklist row has an Observed entry with evidence above; ST-1 marked
Partial. Tasks 6.1–6.3 complete; 6.4 satisfied by this report plus the P4
local-verify report under `docs/ai4se-plugins/`.