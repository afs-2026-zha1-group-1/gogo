# Verification — REQ-004 (req-004-trip-invitations)

- Date: 2026-11-14 (UTC+08:00)
- Branch: `sdd-req-004-planning` (stacked on the REQ-003 implementation; not pushed)
- Backend: `java -jar target/gogo-backend-0.0.1-SNAPSHOT.jar`, port 8080, rebuilt after `V3`
- Frontend: Vite dev server port 5173 (same instance reloaded via HMR)
- Test engine: same SQLite + Flyway migrations as production (`V1`, `V2`, `V3`)

## Automated acceptance (`mvn -B test`)

`Tests run: 31, Failures: 0, Errors: 0` — `GreetingApiTest` 3/3,
`InvitationApiTest` 15/15, `TripApiTest` 13/13.

Red-first observed: before implementation, `InvitationApiTest` failed 15/15 on
the missing `trip_invitation` table while the 16 existing tests passed. After
`V3` and the `com.gogo.invitation` package the class turned green. The REQ-003
reverse check `POST /api/trips/{id}/invitation → 404` was retired because
REQ-004 now owns that route; the remaining edit/delete/list reverse checks stay.

## Runtime API scenarios (curl against the running backend)

Fixture: trip id 1 `Singapore Friends Day`; users 1 Alice (organizer), 2 Ben,
5 Eve; `main_plan_confirmed` reset to 0 before the run.

| Case | Call | Observed |
|---|---|---|
| I1 | POST `/api/trips/1/invitation`, `X-User-Id: 1` | 200; token `e7ce…eb960`; `joinPath=/join/<token>`; one row |
| I2 | same call again | 200; identical token; still one row |
| I3 | same call, `X-User-Id: 2` | 403 `NOT_ORGANIZER`; no row created |
| I4-N | no header / `X-User-Id: 999999` | 401 `USER_REQUIRED` (both); no row |
| I5-N | trip 999999 | 404 `TRIP_NOT_FOUND` |
| J1 | GET `/api/invitations/<token>`, no identity | 200; name, destination, 2026-12-05 ×2, `mainPlanConfirmed=false`; no member/itinerary/preference keys |
| J2 | POST accept, `X-User-Id: 5` | 200 `{joined:true,alreadyMember:false}`; Eve row stored; `GET /api/trips/1` as Eve → 200 |
| J3 | accept again as Eve | 200 `{joined:true,alreadyMember:true}`; exactly one Eve row |
| J4 | test-only `main_plan_confirmed=1`, Eve not a member accepts | 403 `JOINING_CLOSED`; member count unchanged |
| J5-N | accept without / unknown identity | 401 `USER_REQUIRED` (both); no membership |
| J6 | Ben (existing member) accepts with joining open and closed | 200 `joined=true,alreadyMember=true` in both; member count unchanged |
| J7 | invalid token + missing / unknown identity, then known Eve | 401 / 401 / 404 `INVITATION_NOT_FOUND` |
| U1 | GET `/api/invitations/no-such-invitation` | 404 `INVITATION_NOT_FOUND`; no trip values |
| U2 | POST accept invalid token as Eve | 404 `INVITATION_NOT_FOUND`; no membership |
| R-1 | POST `/api/trips/1/confirm`; PATCH `/api/trips/1` | 404; 405; `main_plan_confirmed` unchanged |
| R-2 | DELETE `/api/invitations/<token>`; POST `/revoke`; POST `/confirm` | 405; 404; 404; preview has no expiry/revoked field |

## Browser E2E (Playwright against localhost:5173)

| # | Step | Expected | Observed |
|---|---|---|---|
| S1 | Open `#/trips/1` as Alice | Invitation panel with QR, link text, copy actions | Panel rendered; 130×130 canvas; link `http://localhost:5173/#/join/e7ce…eb960`; two copy affordances |
| I6 | Decode the rendered canvas with a local decoder, compare with the copied link | decoded URL equals the link | `jsqr` decoded exactly the same absolute URL; match `true` |
| S1b | Trigger copy | exact absolute URL handed to the clipboard API | clipboard write patched in-page to capture the argument: `http://localhost:5173/#/join/e7ce…eb960` |
| S2a | Open the join URL with preview | five public fields, identity notice, accept enabled while unconfirmed | `Singapore Friends Day`, `Singapore`, `2026-12-05 – 2026-12-05`, "主线尚未确认，你可以加入", accept button |
| S2b | Accept as Eve | joined state; membership stored | "已加入「Singapore Friends Day」"; DB Eve row = 1 |
| S2c | Set `main_plan_confirmed=1`, reopen join page | joining closed, no accept button | "主线方案已确认，新的成员不能再加入" + "加入已关闭" pill + back home |
| U3 | Open `#/join/no-such-invitation` | generic unusable surface, no private field, no reminder workflow | "这个邀请链接已失效", privacy card, back home only |
| S1c | Open `#/trips/1` as Ben (member, not organizer) | organizer-only denial, no QR/link | "只有组织者可以分享邀请链接"; no canvas; no link box |
| UI-1 | Home | aligned hero, status card, bottom CTA | matches reference visual language; greeting still read from the API |
| UI-2 | Create (`#/create`) with end before start | field-level error, disabled CTA | end input red, "结束日期不能早于开始日期", CTA disabled |
| UI-3 | Create valid trip | 201 → details of the new trip, panel for organizer | `#/trips/8`, hero shows the new name; test trip removed afterwards |

Screenshots (local only, `frontend/logs/` is git-ignored):
`req-004-details-top.png`, `req-004-details.png`, `req-004-join-preview.png`,
`req-004-joined.png`, `req-004-join-closed.png`, `req-004-unusable.png`,
`req-004-denied.png`, `req-004-create-invalid.png`, `req-004-home.png`.

## UI alignment check against `ui-design-reference/`

| Reference screen | Implemented surface | Alignment |
|---|---|---|
| 01 Dashboard | `#/` home | Hero gradient, icon-section titles, card + bottom CTA; no demo-only stats invented |
| 02 Create (US-001) | `#/create` | Appbar with back/title/sub, icon labels, two-column rows, info note, bottom CTA, field-level date error |
| 03 Detail (US-002) | `#/trips/<id>` | Hero card, icon row list for date/locations/organizer, section titles |
| 04 Invite (US-008) | invitation panel | QR card, "扫码或分享链接加入", linkbox with copy, joining rule note |
| 05 Join (US-010) | `#/join/<token>` | Invite card, identity line, privacy note, accept CTA, joined state |
| 06 Invalid (US-012) | `#/join/<invalid>` | Red check ring, generic copy, privacy card, back home; no reminder workflow |

Design tokens (colors, radii, shadows, system font stack) are taken from the
reference `:root`. The app keeps a 430 px mobile-first column instead of the
prototype's phone frame and navigation panel, per the porting guidance in the
reference README.

## Notes and deviations

- **`jsqr` license.** The plan text said MIT; the installed package (1.4.0)
  declares **Apache-2.0**. Permissive, dev-only, locally executed; recorded here
  as the install-time check. `qrcode` 1.5.4 is MIT.
- **Clipboard in automation.** The Playwright browser denies
  `navigator.clipboard.writeText`/`readText`; the component now falls back on a
  rejected write to selection + `execCommand`. The copy handler's argument was
  verified by patching `writeText` in-page (S1b).
- **Reminder button.** The reference screen 06 shows "提醒组织者重发邀请"; the
  spec marks reminders a non-goal, so the unusable surface offers only back home.
- **No product confirmation path.** `main_plan_confirmed` is still set only by
  the documented test-only database update; R-1 asserts no route sets it.

## Operational notes

- The previous session's backend process (PID 210428) was this repository's own
  jar and was stopped to rebuild with `V3`; the new process (PID 183580) owns
  port 8080. Vite (PID 239216) remained and reloaded the new frontend.
- The dev database applied `V3` additively (`trip_invitation`, `main_plan_confirmed`
  default 0); no existing row changed. Fixture row 1 was restored to
  `main_plan_confirmed=0` with Eve removed after the closed-state check, and the
  throwaway UI trip was deleted.
