# G2 decision — us-066-log-in

- Gate: G2 (Verify)
- Change id: `us-066-log-in`（REQ-008 / US-066）
- Inputs:
  - local verify: `docs/ai4se-plugins/20261116-154649-local-verify-report.md`（Overall Pass）
  - pipeline ci: `docs/ai4se-plugins/20261116-155440-pipeline-report.md`（CI Pass；run 43828244877 on `7c5b1dd`）
  - final PR checks: PR #47 head `5752a12` backend + frontend success（GitHub Actions，2026-11-16）
  - pipeline cd: n/a（未部署）
- Dimension results: build Pass · static Pass · code review Pass · evidence Pass · ci Pass · cd n/a
- Defect grades: CRITICAL 0 · WARNING 0 · SUGGESTION 4（splits Purpose prose drift、历史场景名、expiry proxy、demo credentials）
- Decision: **Pass**
- Waivers / conditions + owners: none；残余建议由 SA 在归档/后续维护处理
- Approvers: **VL = lumi**（用户 2026-11-16 明确指定“g2直接签lumi”）
- Timestamp: 2026-11-16

## Sequence note

PR #47 已按用户先前指令在 G2 之前合并到 main（merge commit `135d3df`）。本记录是在合并后依据 local verify + CI 证据补记的 G2 Pass；不是对未验证代码的事后追认。未执行 deploy/CD。

## Traceability (optional)

| Requirement | Spec | Code | Test |
|---|---|---|---|
| Account credential login | `specs/auth/spec.md` | `com.gogo.auth.*` | `AuthApiTest` |
| Server session / me | same | `AuthController`, `SecurityConfig` | `AuthApiTest`, `SessionExpiryApiTest` |
| Protected identity / public surfaces | same + trips/invitations/main-itinerary/splits deltas | controllers + `SplitDraftController` | all API suites |
| CSRF | same | `SecurityConfig`, `lib/csrf.ts` | `AuthApiTest`, browser E13 |
| Login page / invite resume / demo accounts | same | `features/auth/*`, `Join.tsx` | browser E1–E16 |
| Error shape + splits exception | same | `AuthErrorAdvice`, `SecurityConfig` | `AuthApiTest`, split suites |