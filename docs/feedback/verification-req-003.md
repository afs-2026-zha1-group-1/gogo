# Verification — REQ-003 (req-003-trip-create-and-view)

- Date: 2026-11-14 (UTC+08:00)
- Branch: `sdd-req-003-planning` (local, ahead of group1 by the merge + implementation commits pending authorization)
- Backend: `java -jar target/gogo-backend-0.0.1-SNAPSHOT.jar` (rebuilt after V2), port 8080
- Frontend: Vite dev server port 5173 (restarted; the previous session's instance had a stale proxy)
- Test engine: same SQLite + Flyway migrations as production (`V1`, `V2`)

## Automated acceptance (mvn -B test)

`Tests run: 16, Failures: 0, Errors: 0` — `GreetingApiTest` 3/3, `TripApiTest` 13/13.
Red-first observed: before implementation the class failed (missing configuration,
then missing tables/routes); two test-side defects were fixed during red-green
(seed lookup by MIN(id) after C1 creates a same-named trip; GET /api/trips reverse
case expects 405 because POST /api/trips exists).

## Runtime API scenarios (curl against running backend)

| Case | Call | Observed |
|---|---|---|
| C1 | POST /api/trips, X-User-Id 1, full body | 201; id assigned; six values + organizerId 1 echoed |
| C1b | same-day dates | accepted (C1 body uses 2026-12-05 twice) |
| C2 | startDate 2026-12-06 > endDate | 400 INVALID_DATE_RANGE |
| C3 | name "   " | 400 NAME_REQUIRED |
| C6 | destination "" / null / omitted | 400 DESTINATION_REQUIRED (all three) |
| C7 | startLocation "  ", endLocation null | 201; read-back as member: both null; name/destination preserved |
| C4-N | startDate 2026-13-01 | 400 INVALID_DATE |
| C5-N | no X-User-Id / X-User-Id 99 | 401 USER_REQUIRED (both) |
| R1 | GET /api/trips/1, X-User-Id 2 | 200 with the six seeded values |
| R2 | GET /api/trips/1, X-User-Id 5 | 403 NOT_A_MEMBER; body has no trip values |
| R2-N | GET /api/trips/1, no header | 401 USER_REQUIRED |
| R3-N | GET /api/trips/999999, X-User-Id 2 | 404 TRIP_NOT_FOUND |
| reverse | PUT / DELETE /api/trips/1 | 405 / 405 |
| reverse | GET /api/trips | 405 (no list endpoint) |
| reverse | POST /api/trips/1/invitation | 404 (REQ-004 scope absent) |
| reverse | GET /api/greeting | 200 {"message":"Hello World"} unchanged |

## Browser E2E (Playwright against localhost:5173)

| Step | Observed |
|---|---|
| Home | h1 "Hello World" from the API; identity switcher present (default Alice) |
| Create flow | 6 inputs; submit with end location blank → hash #/trips/6; details show Singapore, 2026-12-05 ×2, City Hall MRT, "Not set", user 1 |
| Validation (empty form) | on-screen error INVALID_DATE (date checked before name per design D3) |
| Validation (dates+destination, blank name) | on-screen error NAME_REQUIRED: Trip name must not be blank |
| Denied | identity Eve → #/trips/1 → "Access denied", message, no trip values rendered |
| Not found | #/trips/999999 → "Trip not found", "No trip with id 999999" |
| Failure state | observed live while the stale vite proxy returned HTML: "Failed to load the greeting: request failed" (no hard-coded fallback) |

## Operational notes

- The previous session's java process held a Windows lock on the jar; `mvn package`
  failed until it was stopped. Both stale dev processes (java PID 70372, vite PID
  211752) were this repository's own instances and were restarted.
- The stale vite instance served the SPA fallback for /api (proxy not effective);
  restarting it restored the proxy. Verified by curl JSON through 5173 before E2E.