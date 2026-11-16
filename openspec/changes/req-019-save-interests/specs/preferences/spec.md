# Spec Delta

## ADDED Requirements

### Requirement: Preference caller identity and membership

The system SHALL identify the caller of both preference endpoints by the `X-User-Id`
header, an integer id of a seeded `app_user`; it is a scaffold-level stand-in for
authentication, not a verified credential.

Both endpoints SHALL be open only to members of the `tripId` in the path. An
unidentified caller SHALL receive 401 `USER_REQUIRED`, a non-member 403 `NOT_A_MEMBER`,
an unknown trip 404 `TRIP_NOT_FOUND`, and no denial SHALL carry a member's interests.

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

The system SHALL accept exactly ten interests, in Chinese, and no others: `水上运动`,
`潜水`, `摄影`, `美食`, `咖啡`, `历史人文`, `手作`, `自然风景`, `冒险`, `慢游`. The wire
value SHALL be the exact label and the stored value the matching code, as the acceptance
scenario below asserts. Matching SHALL be literal — no case folding, no trimming, no
aliases, translations or substring matches. The catalogue SHALL be code constants, with
no dependence on `tag`/`/api/tags` and no write endpoint.

#### Scenario: All ten interests are accepted

- **GIVEN** Ben (`X-User-Id: 2`) is a member of trip 1 and has no saved interests
- **WHEN** Ben submits `{"interests":["水上运动","潜水","摄影","美食","咖啡","历史人文","手作","自然风景","冒险","慢游"]}`
- **THEN** the response status is 200
- **AND** the response `interests` carries the same ten labels in the submitted order
- **AND** the stored `codes` are
  `["water","diving","photo","food","coffee","heritage","craft","nature","adventure","slow"]`

#### Scenario: English labels from the earlier draft are rejected

- **WHEN** Ben submits `["Art"]`, `["art"]`, `["ART"]`, `["Food"]` or `["Water"]`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INTEREST_NOT_ALLOWED`

#### Scenario: Surrounding whitespace is rejected

- **WHEN** Ben submits `[" 潜水 "]` or `["潜水 "]`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INTEREST_NOT_ALLOWED`

#### Scenario: Empty strings and near-matches are rejected

- **WHEN** Ben submits `[""]`, `[" "]`, `["浮潜"]` or `["美食家"]`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INTEREST_NOT_ALLOWED`

### Requirement: Save member interests

`PUT /api/trips/{tripId}/preferences` SHALL accept `{"interests": string[]}`, replace the
caller's set as a whole and deduplicate it in first-occurrence order.

Validation SHALL complete before any write: an out-of-catalogue element rejects the
request with 400 `INTEREST_NOT_ALLOWED`, a malformed body with 400 `INVALID_REQUEST`,
storing nothing. A success returns 200 with the deduplicated set; `[]` clears the interests
but keeps the record.

#### Scenario: Duplicate values collapse to one

- **GIVEN** Ben (`X-User-Id: 2`) is a member of trip 1 and has no saved interests
- **WHEN** Ben submits `{"interests":["摄影","自然风景","摄影"]}`
- **THEN** the response status is 200
- **AND** the response body is `{"interests":["摄影","自然风景"]}`
- **AND** the stored `payload` for that member parses to exactly two elements, `photo` and `nature`
- **AND** that member holds exactly one row in `member_preference`

#### Scenario: Repeating the same set is idempotent

- **GIVEN** Ben has saved `摄影` and `自然风景`
- **WHEN** Ben submits `{"interests":["摄影","自然风景"]}` again
- **THEN** the response status is 200
- **AND** the response body and the stored `payload` are unchanged
- **AND** that member still holds exactly one row in `member_preference`

#### Scenario: A save replaces instead of merging

- **GIVEN** Ben has saved `摄影` and `自然风景`
- **WHEN** Ben submits `{"interests":["美食"]}`
- **THEN** the response status is 200
- **AND** the response body is `{"interests":["美食"]}`
- **AND** the stored `codes` hold `food` only, so `摄影` and `自然风景` are gone

#### Scenario: An empty array clears interests but keeps the record

- **GIVEN** Ben has saved `摄影` and `自然风景`
- **WHEN** Ben submits `{"interests":[]}`
- **THEN** the response status is 200
- **AND** the response body is `{"interests":[]}`
- **AND** the member's record still exists and its `payload` is `{"codes":[]}`

#### Scenario: A value outside the catalogue rejects the whole request

- **GIVEN** Ben has saved `摄影` and `自然风景`
- **WHEN** Ben submits `{"interests":["蹦极"]}`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INTEREST_NOT_ALLOWED`
- **AND** that member's `payload` and `updated_at` are byte-identical to the values
  before the request

#### Scenario: A mixed request is rejected as a whole

- **GIVEN** Ben has saved `摄影` and `自然风景`
- **WHEN** Ben submits `{"interests":["摄影","蹦极"]}`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INTEREST_NOT_ALLOWED`
- **AND** `摄影` is neither appended nor rewritten, and the member still holds
  `摄影` and `自然风景`

#### Scenario: The first save creates exactly one row

- **GIVEN** Ben has no row in `member_preference`
- **WHEN** Ben saves `{"interests":["摄影"]}`
- **THEN** the response status is 200
- **AND** `member_preference` holds exactly one row for
  `(trip_id=1, user_id=2, kind='interest')`

#### Scenario: A malformed request is rejected

- **WHEN** the body is a JSON array, omits `interests`, sends `interests` as the string
  `"摄影"`, or sends an `interests` array containing `null` or a number
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INVALID_REQUEST`
- **AND** the member's saved interests are unchanged

### Requirement: Read member interests

`GET /api/trips/{tripId}/preferences` SHALL return
`{"members": [{"userId": <integer>, "interests": [<label>...] }]}`, carrying every
member of that trip ordered by ascending `userId`, each object with exactly those two
fields. A member who never saved interests SHALL appear with `interests: []`. The
endpoint SHALL be read-only.

#### Scenario: A member reads back the saved set

- **GIVEN** Ben has saved `摄影` and `自然风景`
- **WHEN** Ben requests `GET /api/trips/1/preferences` with `X-User-Id: 2`
- **THEN** the response status is 200
- **AND** the `members` element with `userId = 2` carries `interests` equal to
  `["摄影","自然风景"]`
- **AND** the result matches the save response, so the values are still visible after
  the page is reloaded

#### Scenario: A member without saved interests reads an empty array

- **GIVEN** Chloe (`X-User-Id: 3`) is a member who never saved interests
- **WHEN** any member reads the preferences
- **THEN** `members` contains an element with `userId = 3`
- **AND** its `interests` is `[]`

#### Scenario: Members do not overwrite each other

- **GIVEN** Ben has saved `摄影` and Chloe has saved `美食`
- **WHEN** any member reads the preferences
- **THEN** the `userId = 2` element carries `interests` equal to `["摄影"]`
- **AND** the `userId = 3` element carries `interests` equal to `["美食"]`

#### Scenario: The response carries only the agreed fields, ordered by user id

- **WHEN** any member reads the preferences
- **THEN** every `members` element carries exactly `userId` and `interests`
- **AND** the elements are ordered by ascending `userId`

#### Scenario: Reading changes nothing

- **GIVEN** Ben has saved `摄影`
- **WHEN** the preferences are read twice in a row
- **THEN** both responses are identical
- **AND** that member's `payload` and `updated_at` are unchanged

### Requirement: Preferences page

The frontend SHALL provide `#/trips/{tripId}/preferences`, linked from the trip page, with
only the interests section of `screen-08-preferences.png`; that screen's other blocks belong
to other changes. The selected state SHALL come from the `GET` entry matching the current
identity. A save SHALL send the selection as one explicit request, adopt the response and
on failure show the server `message` with the state rolled back. Local storage SHALL NOT
count as evidence of a saved state.

#### Scenario: Loading

- **WHEN** the preferences page is opened and `GET` has not returned
- **THEN** the page shows a loading message
- **AND** the interest controls and the "Save" action are disabled

#### Scenario: Empty state

- **GIVEN** the current identity has never saved interests for that trip
- **WHEN** the page has finished loading
- **THEN** none of the ten interests is selected
- **AND** the user can select interests and save right away

#### Scenario: Saved interests are shown again after a reload

- **GIVEN** Ben has saved `摄影` and `自然风景`
- **WHEN** Ben opens the preferences page
- **THEN** `摄影` and `自然风景` are selected
- **AND** the other eight interests are not selected

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

- **GIVEN** the server holds `摄影` and `自然风景` for the current member
- **WHEN** the save request returns 400 with `code` equal to `INTEREST_NOT_ALLOWED`
- **THEN** the page shows the response `message`
- **AND** the selected state returns to `摄影` and `自然风景`

#### Scenario: Identity, membership or trip is rejected

- **WHEN** `GET` or `PUT` returns 401, 403 or 404
- **THEN** the page shows the matching error text and a way back
- **AND** the page SHALL NOT render any member's saved interests

#### Scenario: Loading fails

- **WHEN** `GET` fails because the endpoint is unreachable or returns a non-2xx status
- **THEN** the page shows an error message and a retry action
- **AND** the page SHALL NOT show an empty or previously shown selection as saved
