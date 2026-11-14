# Acceptance-test fixtures

- Scope: sample values referenced by US-001 (issue #4), US-002 (issue #5), and
  US-008 (issue #6), US-010 (issue #7), US-012 (issue #8)
- Source: every value below is taken verbatim from the acceptance-criteria sets.
  Nothing is invented; if an AC does not state a value, no value is set.
- Created: 2026-11-14. The stories refer to this file but it did not exist in the
  repository; see `intents/2026-11-14-req-003.md`.
- Extended: 2026-11-14 for REQ-004; see `intents/2026-11-14-req-004.md`. The
  REQ-004 section reuses the users and trip above unchanged.

## Users

Seeded by the `V2` Flyway migration so that membership can be decided without a
login screen. `X-User-Id` carries `id`.

| id | display name | role in the fixture |
|---|---|---|
| 1 | Alice | organizer and first member of the sample trip |
| 2 | Ben | member, used for the allowed read |
| 3 | Chloe | member |
| 4 | Daniel | member |
| 5 | Eve | not a member, used for the denied read |

## Sample trip

`US-002` calls it the "Synthetic Singapore Friends Day trip on 2026-12-05,
Asia/Singapore (+08:00)". Timezone does not affect date-only values.

| field | value |
|---|---|
| name | Singapore Friends Day |
| destination | Singapore |
| start date | 2026-12-05 |
| end date | 2026-12-05 |
| start location | City Hall MRT |
| end location | Merlion Park |
| organizer | Alice (id 1) |
| members | Alice, Ben, Chloe, Daniel (ids 1, 2, 3, 4) |
| non-member | Eve (id 5) |

The trip id is assigned by the database; tests must read it from the create
response rather than assume a value.

## Requests

| Case | Call | Expected |
|---|---|---|
| C1 create | `POST /api/trips`, `X-User-Id: 1`, body `{"name":"Singapore Friends Day","destination":"Singapore","startDate":"2026-12-05","endDate":"2026-12-05","startLocation":"City Hall MRT","endLocation":"Merlion Park"}` | `201`, response echoes the six values, `organizerId = 1` |
| C2 date order | same body with `"startDate":"2026-12-06"`, `"endDate":"2026-12-05"` | `400`, `code = INVALID_DATE_RANGE` |
| C3 blank name | same body with `"name":"   "` | `400`, `code = NAME_REQUIRED` |
| R1 member read | `GET /api/trips/{id}`, `X-User-Id: 2` | `200`, the six saved values |
| R2 non-member read | `GET /api/trips/{id}`, `X-User-Id: 5` | `403`, `code = NOT_A_MEMBER`, no trip values |
| R2-N no identity | `GET /api/trips/{id}` without `X-User-Id` | `401`, `code = USER_REQUIRED` |
| R3-N unknown trip | `GET /api/trips/999999`, `X-User-Id: 2` | `404`, `code = TRIP_NOT_FOUND` |
| C4-N malformed date | create body with `"startDate":"2026-13-01"` | `400`, `code = INVALID_DATE` |

## Values deliberately not fixed

| Item | Why no value is set |
|---|---|
| New trip id | Assigned by the database in C1 |
| `createdAt` | Not required by any AC |
| Error message wording | Only the `code` is contractual; messages are implementation text |
| Destination or location emptiness | No AC states an error for these fields; see REQ-003 OQ-1 |

## REQ-004 — invitations (US-008 / US-010 / US-012)

Same users and same sample trip as above. Eve (id 5) is the invited outsider;
after a successful acceptance she becomes a member and the R1 read applies to her.

### State setup

| Item | Value | Why |
|---|---|---|
| Main plan of the fixture trip | unconfirmed by default | `V3` adds `trip.main_plan_confirmed` default 0; no API sets it in this change (US-037 owns the flow) |
| Confirmed-main-plan case (J4) | test-only direct database update of `trip.main_plan_confirmed` to 1 | The confirmation flow is out of scope; the closure AC still must be exercised. Documented test-only setup, not product behavior |
| Invitation token | assigned by the backend at issuance; tests read it from the issue response | Opaque random value; no AC fixes a token string |
| Invalid token input | any string that was never issued, e.g. `no-such-invitation` | Test input for U1/U2/U3, not a sample value claimed by an AC |

### Requests

| Case | Call | Expected |
|---|---|---|
| I1 issue | `POST /api/trips/{id}/invitation`, `X-User-Id: 1` | `200`, body carries `token` and `joinPath` (`/join/<token>`); one invitation row for the trip |
| I2 re-issue | same call again | `200`, same `token`; still one invitation row |
| I3 non-organizer | same call, `X-User-Id: 2` | `403`, `code = NOT_ORGANIZER`; invitation row count unchanged |
| I4-N no identity | same call without `X-User-Id` | `401`, `code = USER_REQUIRED`; nothing created |
| I5-N unknown trip | `POST /api/trips/999999/invitation`, `X-User-Id: 1` | `404`, `code = TRIP_NOT_FOUND` |
| J1 preview | `GET /api/invitations/{token}`, no identity header | `200`, `tripName = Singapore Friends Day`, `destination = Singapore`, `startDate = 2026-12-05`, `endDate = 2026-12-05`, joining open; no member, itinerary or preference fields |
| J2 accept | `POST /api/invitations/{token}/accept`, `X-User-Id: 5` | `200` joined; `trip_member` row (trip, 5) exists; `GET /api/trips/{id}` with `X-User-Id: 5` → `200` |
| J3 double accept | J2 call twice | both `200` joined; exactly one `trip_member` row for (trip, 5) |
| J4 closed | confirmed-main-plan setup, then J2 call | `403`, `code = JOINING_CLOSED`; member rows unchanged |
| J5-N no identity | accept without `X-User-Id` | `401`, `code = USER_REQUIRED`; no membership |
| U1 invalid preview | `GET /api/invitations/no-such-invitation` | `404`, `code = INVITATION_NOT_FOUND`; no trip values |
| U2 invalid accept | `POST /api/invitations/no-such-invitation/accept`, `X-User-Id: 5` | `404`, `code = INVITATION_NOT_FOUND`; no membership |

### Values deliberately not fixed (REQ-004)

| Item | Why no value is set |
|---|---|
| Token string | Random per issuance; tests read it from I1 |
| Absolute invitation URL | Composed by the frontend from its own origin plus `joinPath`; the QR must encode exactly that composed URL (I6) |
| Expiry / revocation fields | Non-MVP per US-008 and US-012 design scope; no such field or endpoint exists |
| Error message wording | Only the `code` is contractual |
