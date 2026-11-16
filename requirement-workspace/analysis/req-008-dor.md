# DoR light self-check — REQ-008 (US-066)

- Date: 2026-11-16
- Entry: `requirement-workspace/requirements/REQ-008.md`
- Deep-dive in scope: yes (`requirement-workspace/deep-dive.md` §REQ-008), so
  items ⑨–⑫ apply
- This is an entry self-check, not a Gate. No Pass/Fail gate decision is
  recorded here.

## Findings

| # | Item | Severity | Status | Location | Issue / evidence |
|---|---|---|---|---|---|
| ① | Intent clear | — | Pass | REQ-008 §Intent | Verified email/password login + server session replaces the scaffold; login page, protected access, invitation resume stated |
| ② | Actors defined | — | Pass | REQ-008 §Actors | Account holder, signed-out traveler, invited guest, member/organizer; authorization rules unchanged |
| ③ | Scope bounded | — | Pass | REQ-008 §In/Out scope | Out of scope names US-067/068/069, registration, reset, SSO, rate limiting, dashboard/split work |
| ④ | Scenarios / AC concrete | — | Pass | REQ-008 §Scenarios | Eleven scenarios with observable session, redirect, error, permission and resume outcomes |
| ⑤ | Exception / boundary | — | Pass | deep-dive §REQ-008 ⑩ | Invalid credentials, missing/expired session, header-only request, CSRF, fixation, restart, pending invite, denial branches enumerated |
| ⑥ | Results verifiable | — | Pass | REQ-008 §Scenarios + deep-dive ⑫ | Cookie/session, 200/401/403, generic error, no-data assertions, preview resume and explicit accept are all observable |
| ⑦ | Dependencies / app-arch touchpoints | — | Pass | impact brief §REQ-008; REQ-008 §Affected capabilities | New `auth`; modified `trips`/`invitations`/`app-shell`; Spring Security session; credential table; public vs protected surfaces fixed |
| ⑧ | Open-questions gate | — | Pass | REQ-008 §Open questions | Blocking not-resolved = 0 (OQ-1/2/3 resolved 2026-11-16); OQ-4–OQ-10 resolved from the draft proposals (user decision 2026-11-16) |
| ⑨ | Data contract decided | — | Pass | deep-dive §REQ-008 ⑨ | Credential grain/fields, account projection, session state, CSRF token, pending-invite state, auth state all concrete; no `{TBD}` |
| ⑩ | Boundary enumerated | — | Pass | deep-dive §REQ-008 ⑩ | Every scenario branch has an in/out row; header bypass, expiry, restart, CSRF and public surfaces covered |
| ⑪ | Cross-REQ aligned | — | Pass | deep-dive §REQ-008 ⑪ | trips/invitations/app-shell MODIFY rows; greeting untouched; US-061/067/068/069 downstream; tech-stack deviation recorded |
| ⑫ | Notification / display contract | — | Pass | deep-dive §REQ-008 ⑫ | Seven surfaces with trigger/recipient/content/channel; no notification workflow |

## A0 deep-dive gate

⑨ Pass, ⑩ Pass, ⑪ Pass, ⑫ Pass → **A0 Pass**. Split permitted and confirmed
(single change `us-066-log-in`, 2026-11-16).

## Advisory findings

| Severity | Status | Location | Issue | Fix hint / owner |
|---|---|---|---|---|
| WARNING | resolved | REQ-008 OQ-4 | Session idle timeout unspecified by the AC | 30 min configurable, short in tests; user accepted 2026-11-16. Owner SA/Dev |
| WARNING | resolved | REQ-008 OQ-7/OQ-8 | Credential table shape and seeded demo credentials are fixture-critical | `account_credential` + documented `alice@example.com` … with one demo password; user accepted 2026-11-16. Owner Dev |
| WARNING | resolved | REQ-008 OQ-6 | Changing or keeping the unauthenticated 401 code affects the existing contract | Keep `USER_REQUIRED` with an auth-required message; user accepted 2026-11-16. Owner Dev |
| WARNING | resolved | REQ-008 OQ-9/OQ-10 | Switcher replacement and login route/placement | Read-only signed-in name and `#/login` full-screen; user accepted 2026-11-16. Owner Dev/IO |
| WARNING | resolved | deep-dive ⑨ | In-memory sessions are lost on server restart; users re-login | Accepted for a single-instance MVP; document in the proposal; no Spring Session dependency. User accepted 2026-11-16. Owner SA |
| SUGGESTION | resolved | REQ-008 §Constraints | `tech-stack-plan.md` says "no accounts" and `X-Member-Id` | Deliberate deviation; record in proposal and reconcile at archive per `openspec/config.yaml`. Owner SA |
| SUGGESTION | resolved | fixtures | Seeded demo passwords live in the repository | Demo-only account set; never surfaced in UI or logs; documented. Owner SA |
| SUGGESTION | resolved | tests | All existing trip/invitation/main-plan tests drive the `X-User-Id` header | Migrate tests to session login at P4; expected outcomes/codes unchanged. Owner Dev |
| SUGGESTION | resolved | CSRF | SPA must bootstrap the token before the first POST (including login) | P3 defines the bootstrap order; acceptance S8 covers it. Owner Dev |

No BLOCKER is deferred. Blocking open questions not `resolved`: **0**.

## Exit gate

- BLOCKER count: **0**
- Blocking open questions not `resolved`: **0**
- WARNING / SUGGESTION carry owners; none blocks drafting.
- Advisory round: completed 2026-11-16 — OQ-4–OQ-10 and all WARNING/SUGGESTION
  items were resolved from the draft proposals by the user; split plan
  (`us-066-log-in`, single change) confirmed the same day. Cleared to author the
  proposal.
