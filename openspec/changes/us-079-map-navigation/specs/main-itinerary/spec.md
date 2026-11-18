# Spec Delta — main-itinerary (us-079-map-navigation)

## MODIFIED Requirements

### Requirement: Readiness-gated main plan generation

The system SHALL allow only the trip organizer to generate a main-plan draft
via `POST /api/trips/{id}/main-plan`, responding 201 with the draft projection,
and only when every trip member is ready at a recorded preference revision.
Generation SHALL persist a new draft version (ordered stops, times, travel
legs, input revisions, per-person cost) without auto-confirming; regeneration
SHALL supersede the previous current draft. Generation SHALL be rejected once
a confirmed version exists (G6). Generation SHALL additionally persist each
stop's address and WGS-84 coordinates completed from the place cache
(`place_cache`, keyed by name+city) at persist time; cache misses SHALL leave
the three fields null (programmatic geocode write-back owns later completion),
and the 201 projection SHALL carry the same three fields per stop.

#### Scenario: G1 — all members ready, draft generated (US-031 AC1)

- **GIVEN** the four members are ready at preference revision 1 and the plan provider supplies the four fixture stops
- **WHEN** the organizer (Alice, `X-User-Id: 1`) generates the main plan
- **THEN** the response status is 201 and draft version 1 is saved as the current draft
- **AND** the body carries `version` 1, `confirmed` false, `stale` false, `costPerPersonCents` 5000 and `inputRevisions` pairing userIds 1–4 with revision 1
- **AND** `stops` lists the four fixture stops in supplied order with `seq`, `name`, `startTime`, `endTime` and `travelMinutesToNext` 30/30/15 (null on the last stop)
- **AND** the trip is not main-plan-confirmed

#### Scenario: G2 — pending member blocks generation (US-031 AC2)

- **GIVEN** Daniel (id 4) is not ready
- **WHEN** the organizer generates the main plan
- **THEN** the request is rejected with 409 and code `MEMBERS_NOT_READY`
- **AND** `pendingMembers` identifies Daniel (`userId` 4, `displayName` Daniel) as requiring a response
- **AND** no draft is persisted

#### Scenario: G5 — regeneration creates a new version

- **GIVEN** a current draft version 1 exists
- **WHEN** the organizer generates the main plan again
- **THEN** the response status is 201 with `version` 2 as the current draft
- **AND** version 1 is superseded and is no longer returned by the draft read

#### Scenario: G6 — generation after confirmation rejected

- **GIVEN** the main plan is already confirmed at version 1
- **WHEN** the organizer generates the main plan again
- **THEN** the request is rejected with 409 and code `ALREADY_CONFIRMED`
- **AND** no new draft is persisted and the confirmed version is unchanged
  (explicitly accepted in user product review 2026-11-15; Emily IO approval
  recorded separately; replanning deferred to R2 — the versioned draft schema
  reserves the seam)

#### Scenario: G7 — generation persists stop address and coordinates from the place cache

- **GIVEN** the place cache holds the fixture stops' addresses and WGS-84 coordinates
- **WHEN** the organizer generates the main plan
- **THEN** each persisted stop row carries `address`, `lat`, `lng` from the cache
- **AND** the 201 body's `stops` carry the same three fields per stop

#### Scenario: G8 — cache miss leaves coordinates null without blocking generation

- **GIVEN** a supplied stop name is absent from the place cache
- **WHEN** the organizer generates the main plan
- **THEN** generation succeeds and that stop's `lat`, `lng` are null
- **AND** the provider-supplied `address` is preserved and no coordinate is fabricated

### Requirement: Draft review with computed staleness

The system SHALL let trip members read the current draft at
`GET /api/trips/{id}/main-plan`, responding 200 with the draft projection
(`tripId`, `version`, `confirmed`, `stale`, `costPerPersonCents`, `inputRevisions`,
ordered `stops` with times and travel legs). After confirmation the same read
SHALL return the confirmed version. `stale` SHALL be computed on read, not
stored, and applies to unconfirmed drafts only; the confirmed version SHALL be
frozen (P2 lint ruling 2026-11-15). The projection's `stops` SHALL additionally
carry `address`, `lat`, `lng` when persisted; null values SHALL be omitted from
the wire (additive, old clients unaffected).

#### Scenario: Member reads the current draft

- **GIVEN** a current draft exists and every input revision matches the member's current revision
- **WHEN** Ben (member, `X-User-Id: 2`) reads the main plan
- **THEN** the response status is 200 with `version`, `confirmed` false, `stale` false, `costPerPersonCents`, `inputRevisions` and the ordered `stops` with times and legs

#### Scenario: Revision bump surfaces staleness

- **GIVEN** a draft was generated at revision 1 for all members
- **WHEN** Ben's preference revision advances to 2 and a member reads the main plan
- **THEN** the response status is 200 and the same draft is surfaced with `stale` true (any member's current revision differing from the revision recorded at generation makes an unconfirmed draft stale)
- **AND** the draft version and its recorded `inputRevisions` are unchanged

#### Scenario: No draft yet

- **GIVEN** no draft has been generated for the trip
- **WHEN** a trip member reads the main plan
- **THEN** the request is rejected with 404 and code `NO_DRAFT`

#### Scenario: Confirmed plan read

- **GIVEN** the main plan was confirmed at version 1
- **WHEN** a trip member reads the main plan
- **THEN** the response status is 200 with `version` 1, `confirmed` true and `stale` false
- **AND** the confirmed version is the existing draft marked confirmed, not a newly created version

#### Scenario: Confirmed plan stays frozen after a revision bump

- **GIVEN** the main plan was confirmed at version 1
- **WHEN** Ben's preference revision advances to 2 and a member reads the main plan
- **THEN** the response status is 200 with `version` 1, `confirmed` true and `stale` false (the confirmed version is frozen: `stale` is always false for it regardless of later revision changes; staleness applies to unconfirmed drafts only)

#### Scenario: Read carries persisted stop location fields

- **GIVEN** a draft whose stops carry persisted `address`, `lat`, `lng`
- **WHEN** a trip member reads the main plan
- **THEN** the 200 body's `stops` carry the three fields for those stops
- **AND** stops without persisted location omit the fields (null)

## ADDED Requirements

### Requirement: Stop location write-back and place cache sedimentation

The system SHALL let the trip organizer write programmatically geocoded
coordinates via `POST /api/trips/{id}/main-plan/stop-locations` with body
`{stops:[{seq,lat,lng}]}` (WGS-84), responding 200 with the same projection as
the draft read. The write SHALL update only the current draft's matching stop
rows and SHALL upsert the place cache (`place_cache`, name+city) with
`source=geocode` so later trips reuse the resolved location. Coordinates are
program-produced (browser geocode write-back); the AI generation contract
SHALL NOT supply coordinates. Rejections SHALL use the established codes:
no current draft 404 `NO_DRAFT` (including confirmed-only trips), non-organizer
403 `NOT_ORGANIZER`, unknown stop seq 422 `UNKNOWN_STOP`, out-of-range
coordinates 422 `INVALID_COORDS`.

#### Scenario: W1 — write-back persists coordinates and sediments the cache

- **GIVEN** a current draft exists and the caller is the organizer
- **WHEN** the organizer posts `{stops:[{seq:1,lat:1.3,lng:103.86}]}`
- **THEN** the response status is 200 and stop 1 of the current draft carries lat 1.3 / lng 103.86
- **AND** the place cache row for that stop's name+city is upserted with `source=geocode`

#### Scenario: W2 — unknown stop seq rejected

- **GIVEN** a current draft exists
- **WHEN** the organizer posts a seq not present in the draft
- **THEN** the request is rejected with 422 and code `UNKNOWN_STOP`
- **AND** no stop row or cache row changes

#### Scenario: W3 — out-of-range coordinates rejected

- **GIVEN** a current draft exists
- **WHEN** the organizer posts lat 91 (or lng beyond ±180)
- **THEN** the request is rejected with 422 and code `INVALID_COORDS`
- **AND** no stop row or cache row changes

#### Scenario: W4 — non-organizer member cannot write locations

- **GIVEN** Ben is a member but not the organizer
- **WHEN** Ben posts stop locations
- **THEN** the request is rejected with 403 and code `NOT_ORGANIZER`

#### Scenario: W5 — no current draft rejected

- **GIVEN** the trip has no current draft (never generated, or only a confirmed version)
- **WHEN** the organizer posts stop locations
- **THEN** the request is rejected with 404 and code `NO_DRAFT`
- **AND** the confirmed version is untouched

#### Scenario: W6 — sedimented cache reused by a later trip

- **GIVEN** a stop location was sedimented into the place cache by write-back
- **WHEN** another trip with the same stop name+city generates its main plan
- **THEN** generation completes that stop's address/coordinates from the cache without a new geocode
