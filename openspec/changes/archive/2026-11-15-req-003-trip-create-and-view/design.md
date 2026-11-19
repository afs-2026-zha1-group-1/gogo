# Design

## Context

REQ-003 implements the `trips` capability on the existing stack: Spring Boot +
`JdbcTemplate` (no ORM), embedded SQLite, Flyway, React 19 + Vite 8, two-job CI.
The committed tree holds only `com.gogo.hello` and a one-screen React app.
Identity is the scaffold agreed at P1: seeded users plus the trusted `X-User-Id`
header. G1 Pass recorded 2026-11-14 (IO Emily, SA Johnson) with the rulings:
destination required, both locations optional and normalized to null, non-member
read `403` without trip values, location completion deferred to US-031.

Links: [ATDD design](atdd-design.md) · [delta spec](specs/trips/spec.md) ·
[tasks](tasks.md) · [fixtures](../../../../requirement-workspace/acceptance-test-fixtures.md) ·
UI reference `ui-design-reference/` screens 02 (create) and 03 (detail).

## Goals / Non-Goals

Goals: `POST /api/trips` and `GET /api/trips/{id}` with the 12 specified
scenarios; atomic creator membership; stable error codes; create and details
screens with loading/error/denied/not-found states; seeded fixture data.

Non-Goals: edit/delete, lists/search, invitations (REQ-004), location completion
(US-031), real authentication, ORM, i18n, CI changes. Each has a reverse check in
the ATDD design.

## Decisions

**D1 — Migration `V2__create_trip.sql`.** SQLite dialect:
`app_user(id INTEGER PRIMARY KEY, display_name TEXT NOT NULL)`;
`trip(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, destination TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, start_location TEXT, end_location TEXT, organizer_id INTEGER NOT NULL REFERENCES app_user(id))`;
`trip_member(trip_id INTEGER NOT NULL REFERENCES trip(id), user_id INTEGER NOT NULL REFERENCES app_user(id), PRIMARY KEY (trip_id, user_id))`.
Seed users 1–5 and the sample trip (id assigned by the engine) with members
1–4. Locations nullable per the G1 ruling; destination NOT NULL.

**D2 — Backend package `com.gogo.trip`.** `TripController` (two routes),
`TripRepository` (JdbcTemplate), records `TripCreateRequest` and `TripResponse`,
`TripApiException` carrying an HTTP status plus a stable `code`, and one
`@RestControllerAdvice` rendering `{"code","message"}`. Identity resolution is a
small shared helper in the package (header parse + seeded-user lookup); REQ-004
will reuse it rather than duplicate.

**D3 — Validation order and codes.** Identity first (`USER_REQUIRED`, 401);
then date parse (`INVALID_DATE`, 400); then blank name (`NAME_REQUIRED`); then
missing/null/blank destination (`DESTINATION_REQUIRED`); then inverted range
(`INVALID_DATE_RANGE`). Locations: null/empty/whitespace → null; nonblank
preserved verbatim. Every rejection writes nothing. Dates parsed strictly as
`YYYY-MM-DD` (`LocalDate` with an explicit pattern, rejecting `2026-13-01`).

**D4 — Creation is one transaction.** Insert `trip`, insert the creator's
`trip_member` row; a failure in either leaves no trip (what C2/C3/C6 assert by
row count). Response `201` echoes the six values plus `id` and `organizerId`;
null locations serialize as JSON null.

**D5 — Read authorization.** Unknown id → `404 TRIP_NOT_FOUND`; known id without
membership → `403 NOT_A_MEMBER` with a body containing no trip field values;
member → `200` with the saved values. Membership decided by a join on
`trip_member`, never by the frontend.

**D6 — Frontend shell: hash router + identity switcher.** Minimal client-side
hash routing, no new dependency: `#/` greeting home, `#/create`, `#/trips/<id>`.
A scaffold identity switcher over the five seeded users sets `X-User-Id` on every
request; labeled as a demo scaffold, not a login. REQ-004 reuses both and adds
`#/join/<token>`.

**D7 — Screens and states.** Create page: six inputs (locations marked optional),
submit, busy state, server `message` on 400/401, success navigates to the new
trip's details. Details page: the six saved values (null locations rendered as
an explicit "not set" placeholder), loading state, denial message on 403,
not-found message on 404, failure text on unreachable/non-JSON responses. Visual
language follows `ui-design-reference/` (warm grey surfaces, teal brand, rounded
cards); one new stylesheet, no component library.

**D8 — Test isolation.** `TripApiTest` follows `GreetingApiTest`:
`@SpringBootTest` with `jdbc:sqlite:file:trip-test?mode=memory&cache=shared`,
Hikari pool size 1, Flyway `V1`–`V2`; row counts and membership asserted through
`JdbcTemplate`; trip ids read from create responses.

**D9 — Dependencies.** No new backend dependency. No new frontend dependency
(hash router and switcher are local code). CI unchanged.

## Risks / Trade-offs

- **Impersonation.** `X-User-Id` is trusted; accepted scaffold cost for a
  controlled demo, never described as a security control (G1 acknowledged).
- **Existence leak.** `403` for a non-member confirms the id exists; chosen from
  the AC wording and confirmed at G1.
- **Null locations.** Details UI must show an explicit placeholder so null is
  not mistaken for a loading gap; completion arrives only with US-031.
- **Ordering.** REQ-004's `V3` alters these tables; REQ-003 must land first
  (G1 acknowledged ordering).