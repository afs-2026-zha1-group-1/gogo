# Spec Delta

## ADDED Requirements

### Requirement: Preference caller identity and membership

The system SHALL identify the caller of every preference endpoint by the `X-User-Id`
request header, whose value SHALL be the integer id of a seeded `app_user`. The header
is a scaffold-level stand-in for authentication: the system SHALL NOT treat it as a
verified credential, and issuing or verifying credentials is out of scope.

A caller that cannot be identified (header missing, not an integer, or not a seeded
user) SHALL receive status 401 with `code = USER_REQUIRED`, and no preference data
SHALL be read or written.

Both preference endpoints SHALL be open only to members of the `tripId` in the path.
A caller who is not a member SHALL receive status 403 with `code = NOT_A_MEMBER`, and
the response SHALL NOT contain any member's interests.

An unknown `tripId` SHALL return status 404 with `code = TRIP_NOT_FOUND`.

The checks SHALL run in the order identity -> trip existence -> membership, matching
the existing `GET /api/trips/{id}`.

#### Scenario: Caller identity is missing

- **WHEN** a request carries no `X-User-Id` header
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** the preference data of that trip is unchanged

#### Scenario: Caller identity is unusable

- **WHEN** `X-User-Id` is `99` (a user that is not seeded) or `abc` (not an integer)
- **THEN** the response status is 401
- **AND** the response body carries `code` equal to `USER_REQUIRED`
- **AND** the response body contains no member's interests

#### Scenario: Surrounding whitespace in the identity header is tolerated

- **WHEN** `X-User-Id` is `" 2 "`
- **THEN** the result is identical to `X-User-Id: 2`
- **AND** this tolerance SHALL NOT extend to the values of `interests`
  (see the interest catalogue requirement)

#### Scenario: A non-member is denied

- **GIVEN** Eve (`X-User-Id: 5`) is not a member of trip 1
- **WHEN** Eve calls `GET` or `PUT /api/trips/1/preferences`
- **THEN** the response status is 403
- **AND** the response body carries `code` equal to `NOT_A_MEMBER`
- **AND** the response body contains no member's interests
- **AND** no row of `member_preference` for trip 1 changes

#### Scenario: An unknown trip is reported before membership

- **WHEN** a caller requests a `tripId` that does not exist
- **THEN** the response status is 404
- **AND** the response body carries `code` equal to `TRIP_NOT_FOUND`
- **AND** the outcome does not depend on which other trips the caller belongs to

### Requirement: Predefined interest catalogue

The system SHALL define exactly the following seven interests. The wire value SHALL be
the exact `label` string and the stored value SHALL be the corresponding `code`:

| label | code |
|---|---|
| `Art` | `art` |
| `Nature` | `nature` |
| `Culture` | `culture` |
| `History` | `history` |
| `Food` | `food` |
| `Shopping` | `shopping` |
| `Adventure` | `adventure` |

Matching SHALL be literal: the system SHALL NOT fold case, SHALL NOT trim surrounding
whitespace and SHALL NOT accept aliases, translations or substring matches.

The catalogue SHALL be held as code constants. This capability SHALL NOT depend on the
`tag` table, SHALL NOT depend on `/api/tags`, and SHALL NOT expose a write endpoint that
maintains the catalogue.

#### Scenario: All seven interests are accepted

- **GIVEN** Ben (`X-User-Id: 2`) is a member of trip 1 and has no saved interests
- **WHEN** Ben submits `{"interests":["Art","Nature","Culture","History","Food","Shopping","Adventure"]}`
- **THEN** the response status is 200
- **AND** the response `interests` carries the same seven labels in the submitted order
- **AND** the stored `codes` are
  `["art","nature","culture","history","food","shopping","adventure"]`

#### Scenario: Wrong case is rejected

- **WHEN** Ben submits `["art"]` or `["ART"]`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INTEREST_NOT_ALLOWED`

#### Scenario: Surrounding whitespace is rejected

- **WHEN** Ben submits `[" Art "]` or `["Art "]`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INTEREST_NOT_ALLOWED`

#### Scenario: Empty strings and near-matches are rejected

- **WHEN** Ben submits `[""]`, `[" "]`, `["teleport"]` or `["foodie"]`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INTEREST_NOT_ALLOWED`

### Requirement: Save member interests

The system SHALL expose `PUT /api/trips/{tripId}/preferences` accepting
`{"interests": string[]}` and SHALL replace the caller's interest set as a whole.

The server SHALL deduplicate the submitted array while keeping the first-occurrence
order, so the response and the stored value SHALL contain each interest at most once.

Validation SHALL complete before any write: if any element is outside the predefined
catalogue, the system SHALL reject the whole request with status 400 and
`code = INTEREST_NOT_ALLOWED`, and the allowed elements SHALL NOT be stored.

A successful save SHALL return status 200 with `{"interests": [...]}` carrying the
deduplicated stored set.

An empty array SHALL be accepted and SHALL mean "clear interests": the system SHALL keep
the member's record and store an empty set, and SHALL NOT delete the record.

A member SHALL have at most one record per `kind`, so the first save inserts and later
saves overwrite. Repeating the same set SHALL be idempotent: the stored `payload` SHALL
stay the same, while `updated_at` MAY be refreshed.

A request body that is not a JSON object, that omits `interests`, or whose `interests`
is not an array of strings (including `null` or numeric elements) SHALL return status
400 with `code = INVALID_REQUEST`.

A rejected request SHALL NOT write any row and SHALL NOT modify the `payload` or
`updated_at` of an existing row.

#### Scenario: Duplicate values collapse to one

- **GIVEN** Ben (`X-User-Id: 2`) is a member of trip 1 and has no saved interests
- **WHEN** Ben submits `{"interests":["Art","Nature","Art"]}`
- **THEN** the response status is 200
- **AND** the response body is `{"interests":["Art","Nature"]}`
- **AND** the stored `payload` for that member parses to exactly two elements, `art` and `nature`
- **AND** that member holds exactly one row in `member_preference`

#### Scenario: Repeating the same set is idempotent

- **GIVEN** Ben has saved `Art` and `Nature`
- **WHEN** Ben submits `{"interests":["Art","Nature"]}` again
- **THEN** the response status is 200
- **AND** the response body and the stored `payload` are unchanged
- **AND** that member still holds exactly one row in `member_preference`

#### Scenario: A save replaces instead of merging

- **GIVEN** Ben has saved `Art` and `Nature`
- **WHEN** Ben submits `{"interests":["Food"]}`
- **THEN** the response status is 200
- **AND** the response body is `{"interests":["Food"]}`
- **AND** the stored `codes` hold `food` only, so `Art` and `Nature` are gone

#### Scenario: An empty array clears interests but keeps the record

- **GIVEN** Ben has saved `Art` and `Nature`
- **WHEN** Ben submits `{"interests":[]}`
- **THEN** the response status is 200
- **AND** the response body is `{"interests":[]}`
- **AND** the member's record still exists and its `payload` is `{"codes":[]}`

#### Scenario: A value outside the catalogue rejects the whole request

- **GIVEN** Ben has saved `Art` and `Nature`
- **WHEN** Ben submits `{"interests":["teleportation"]}`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INTEREST_NOT_ALLOWED`
- **AND** that member's `payload` and `updated_at` are byte-identical to the values
  before the request

#### Scenario: A mixed request is rejected as a whole

- **GIVEN** Ben has saved `Art` and `Nature`
- **WHEN** Ben submits `{"interests":["Art","teleportation"]}`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INTEREST_NOT_ALLOWED`
- **AND** `Art` is neither appended nor rewritten, and the member still holds
  `Art` and `Nature`

#### Scenario: The first save creates exactly one row

- **GIVEN** Ben has no row in `member_preference`
- **WHEN** Ben saves `{"interests":["Art"]}`
- **THEN** the response status is 200
- **AND** `member_preference` holds exactly one row for
  `(trip_id=1, user_id=2, kind='interest')`

#### Scenario: A malformed request is rejected

- **WHEN** the body is a JSON array, omits `interests`, sends `interests` as the string
  `"Art"`, or sends an `interests` array containing `null` or a number
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INVALID_REQUEST`
- **AND** the member's saved interests are unchanged

### Requirement: Read member interests

The system SHALL expose `GET /api/trips/{tripId}/preferences`, returning the interest
details of every member to a member of that trip, in the shape
`{"members": [ {"userId": <integer>, "interests": [<label>...] } ]}`.

Each member object SHALL carry exactly `userId` and `interests`; it SHALL NOT carry a
display name or any other field. `members` SHALL be ordered by ascending `userId` so
assertions are repeatable. A member who has never saved interests SHALL still appear
with `interests: []`, so the endpoint SHALL NOT omit members.

The endpoint SHALL be read-only: reading SHALL NOT create or modify any row.

#### Scenario: A member reads back the saved set

- **GIVEN** Ben has saved `Art` and `Nature`
- **WHEN** Ben requests `GET /api/trips/1/preferences` with `X-User-Id: 2`
- **THEN** the response status is 200
- **AND** the `members` element with `userId = 2` carries `interests` equal to
  `["Art","Nature"]`
- **AND** the result matches the save response, so the values are still visible after
  the page is reloaded

#### Scenario: A member without saved interests reads an empty array

- **GIVEN** Chloe (`X-User-Id: 3`) is a member who never saved interests
- **WHEN** any member reads the preferences
- **THEN** `members` contains an element with `userId = 3`
- **AND** its `interests` is `[]`

#### Scenario: Members do not overwrite each other

- **GIVEN** Ben has saved `Art` and Chloe has saved `Food`
- **WHEN** any member reads the preferences
- **THEN** the `userId = 2` element carries `interests` equal to `["Art"]`
- **AND** the `userId = 3` element carries `interests` equal to `["Food"]`

#### Scenario: The response carries only the agreed fields, ordered by user id

- **WHEN** any member reads the preferences
- **THEN** every `members` element carries exactly `userId` and `interests`
- **AND** the elements are ordered by ascending `userId`

#### Scenario: Reading changes nothing

- **GIVEN** Ben has saved `Art`
- **WHEN** the preferences are read twice in a row
- **THEN** both responses are identical
- **AND** that member's `payload` and `updated_at` are unchanged

### Requirement: Preferences page

The frontend SHALL provide the page `#/trips/{tripId}/preferences` inside the existing
application, and SHALL link to it from the trip details page.

The page SHALL render the selected state of the seven predefined interests, whose only
source SHALL be the `GET` response entry matching the current identity (the identity
selector in the top bar).

The user's selection SHALL be submitted as one request by an explicit "Save" action;
the page SHALL NOT submit on every toggle.

A successful save SHALL update the selected state from the response body. A failed save
SHALL show the server `message` and restore the selected state to what the server
acknowledges. A failed load SHALL show an error with a retry action, and SHALL NOT render
unloaded or stale selections as saved.

The page SHALL NOT use browser local storage as evidence of a saved state.

#### Scenario: Loading

- **WHEN** the preferences page is opened and `GET` has not returned
- **THEN** the page shows a loading message
- **AND** the interest controls and the "Save" action are disabled

#### Scenario: Empty state

- **GIVEN** the current identity has never saved interests for that trip
- **WHEN** the page has finished loading
- **THEN** none of the seven interests is selected
- **AND** the user can select interests and save right away

#### Scenario: Saved interests are shown again after a reload

- **GIVEN** Ben has saved `Art` and `Nature`
- **WHEN** Ben opens the preferences page
- **THEN** `Art` and `Nature` are selected
- **AND** the other five interests are not selected

#### Scenario: Switching identity reloads for the new identity

- **GIVEN** Ben sees his own selection on the preferences page
- **WHEN** the identity selector in the top bar switches to Chloe
- **THEN** the page fetches the preferences again
- **AND** the selected state is Chloe's set, with none of Ben's selection retained

#### Scenario: Saving disables duplicate submissions

- **WHEN** the user activates "Save" and the request is still in flight
- **THEN** the interest controls and the "Save" action are disabled

#### Scenario: A successful save follows the response

- **WHEN** the save request returns 200
- **THEN** the selected state equals the `interests` in the response
- **AND** no error message remains on the page

#### Scenario: A rejected save shows an inline error and rolls back

- **GIVEN** the server holds `Art` and `Nature` for the current member
- **WHEN** the save request returns 400 with `code` equal to `INTEREST_NOT_ALLOWED`
- **THEN** the page shows the response `message`
- **AND** the selected state returns to `Art` and `Nature`

#### Scenario: Identity, membership or trip is rejected

- **WHEN** `GET` or `PUT` returns 401, 403 or 404
- **THEN** the page shows the matching error text and a way back
- **AND** the page SHALL NOT render any member's saved interests

#### Scenario: Loading fails

- **WHEN** `GET` fails because the endpoint is unreachable or returns a non-2xx status
- **THEN** the page shows an error message and a retry action
- **AND** the page SHALL NOT show an empty or previously shown selection as saved
