# Change summary — ai-main-plan-generation (US-031-AI)

- Archived: 2026-11-18
- PR: #152, merge `09b5685`
- Living spec: `main-itinerary` — 1 MODIFIED requirement (9 scenarios)
- Knowledge: `tech-stack-plan.md` §28; `_LOG.md` row
- Gates: G1 Pass (IO Emily + SA Elian Jiang), G2 Pass (VL lumi),
  G3 Pass (SA Elian Jiang)

## Delivered

- Main-plan generation now uses the internal DeepSeek gateway
  (`llm-gateway-alicloud`, `deepseek-v4.1-flash`, `LLM_API_KEY`) through the
  existing `MainPlanProvider` port; a blank key still selects the deterministic
  city fixtures.
- AI output is validated before persistence (stops, `seq`, `HH:mm`, ordering,
  legs, nonnegative cost). Timeout / HTTP / empty / invalid output persists a
  minimal two-stop plan: trip start 09:00–09:30 (30-minute leg) → end
  17:00–17:30 (null leg), per-person cost 0, using completed locations.
- The inputs screen and plan-page regeneration show a non-blocking
  “AI 正在生成中…” notice; confirm is unchanged.
- No API, database, auth or splits contract change; no new dependency.

## Verification

- Backend 398/398; frontend typecheck + 45 unit tests + build.
- Browser E1–E4 + R-E1: notice, fallback, failure, confirm, non-organizer.
- Real DeepSeek generation: 5 stops, S$65, under 30s.
- CI runs 44251508951 / 44251514957 green (backend / frontend / browser);
  local verify Pass; `openspec validate --specs --strict` 9/9.

## Residuals

- AI stop count has no upper bound; confirmation validation bounds feasibility.
- Fallback is silent by the accepted product decision (2026-11-18).
- The G1 `X-User-Id` wording is pre-existing Living Spec drift, untouched here.
