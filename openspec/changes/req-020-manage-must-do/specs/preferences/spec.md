# Spec Delta

## ADDED Requirements

### Requirement: Save member must-do items

`PUT /api/trips/{tripId}/preferences/must-dos` SHALL replace the caller's must-do list: an item with
no or null `id` is created with `max(current ids)+1`, a known `id` is updated in place, an omitted
item is deleted. The stored payload mirrors `activity` as `name`, never returned (R4). Validation
precedes any write, in order: shape, `activity`, place-or-time, `time` as
`^([01]\d|2[0-3]):[0-5]\d$`, duplicate `id`, `id` ownership (foreign = unknown). No count, length or
dedup limit applies.

#### Scenario: An item is added and read back

- **GIVEN** Ben (`X-User-Id: 2`) is a member of trip 1 and has no saved must-do items
- **WHEN** Ben submits `{"items":[{"activity":"National Gallery Singapore visit","location":"National Gallery Singapore","time":"10:00"}]}`
- **THEN** the response status is 200
- **AND** the response carries exactly one item with an integer `id`, and `activity`, `location` and `time` equal to the submitted values
- **AND** `member_preference` holds exactly one row for `(trip_id=1, user_id=2, kind='must_do')`
- **AND** its `payload` parses to exactly one item carrying the same `id`

#### Scenario: An edit keeps the same item

- **GIVEN** Ben's list holds one item with `id = 1` and `time = "10:00"`
- **WHEN** Ben submits `{"items":[{"id":1,"activity":"National Gallery Singapore visit","location":"National Gallery Singapore","time":"10:30"}]}`
- **THEN** the response status is 200
- **AND** the response carries exactly one item, its `id` is still `1`, and its `time` is `"10:30"`
- **AND** Ben still holds exactly one `must_do` row, whose payload parses to exactly one item

#### Scenario: An item missing from the request is deleted

- **GIVEN** Ben's list holds items `1` and `2`
- **WHEN** Ben submits a list containing only item `1`
- **THEN** the response status is 200
- **AND** the response carries exactly one item with `id = 1`
- **AND** item `2` no longer appears in the stored payload nor in a later `GET`

#### Scenario: An empty list clears the list but keeps the record

- **GIVEN** Ben's list holds two items
- **WHEN** Ben submits `{"items":[]}`
- **THEN** the response status is 200
- **AND** the response body is `{"items":[]}`
- **AND** Ben's `must_do` row still exists and its `payload` is `{"items":[]}`

#### Scenario: Items keep the submitted order

- **GIVEN** Ben has no saved must-do items
- **WHEN** Ben submits a list whose activities are `A`, `B`, `C` in that order
- **THEN** the response and a later `GET` both carry `A`, `B`, `C` in that order
- **AND** editing `B` without reordering the request leaves the order `A`, `B`, `C`

#### Scenario: Item ids are list-local and may be reassigned

- **GIVEN** Ben's list holds one item with `id = 1`
- **WHEN** Ben clears the list and then adds one new item
- **THEN** the new item carries `id = 1`
- **AND** no contract outside this list refers to item ids

#### Scenario: A location or a time alone is enough

- **GIVEN** Ben has no saved must-do items
- **WHEN** Ben submits one item with only `location` and another with only `time`
- **THEN** the response status is 200
- **AND** the first item carries `time: null` and the second carries `location: null`

#### Scenario: Both location and time may be saved together

- **GIVEN** Ben has no saved must-do items
- **WHEN** Ben submits one item carrying both `location` and `time`
- **THEN** the response status is 200
- **AND** both values are stored and returned
- **AND** this overrides the reference screen's "choose one of location or time" wording

#### Scenario: Whitespace is trimmed and blank optional fields become null

- **GIVEN** Ben has no saved must-do items
- **WHEN** Ben submits `{"items":[{"activity":"  Museum  ","location":"   ","time":" 10:00 "}]}`
- **THEN** the response status is 200
- **AND** the stored `activity` is `"Museum"`, the stored `time` is `"10:00"` and the stored `location` is `null`

#### Scenario: A missing activity rejects the whole request

- **GIVEN** Ben's list holds one item with `id = 1`
- **WHEN** Ben submits an item whose `activity` is absent, empty or blank
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `MUST_DO_ACTIVITY_REQUIRED`
- **AND** Ben's `payload` and `updated_at` are byte-identical to the values before the request

#### Scenario: An item without a location and without a time is rejected

- **WHEN** Ben submits an item with a non-blank `activity` and neither `location` nor `time`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `MUST_DO_PLACE_OR_TIME_REQUIRED`
- **AND** nothing is written

#### Scenario: A malformed time is rejected

- **WHEN** Ben submits one item at a time whose `time` is `"10:0"`, `"10:00:00"`, `"25:00"`, `"10am"`, `"1 0:00"` or `"24:00"`
- **THEN** each response status is 400
- **AND** each response body carries `code` equal to `MUST_DO_TIME_INVALID`
- **AND** nothing is written

#### Scenario: An unknown or foreign item id rejects the whole request

- **GIVEN** Ben has no item with `id = 7`, and Chloe (`X-User-Id: 3`) does have one
- **WHEN** Ben submits a list referring to `id = 7`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `MUST_DO_ITEM_UNKNOWN`
- **AND** both Ben's and Chloe's stored items are unchanged

#### Scenario: A duplicated id in one request is rejected

- **GIVEN** Ben's list holds one item with `id = 1`
- **WHEN** Ben submits a list whose two items both carry `id = 1`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `MUST_DO_ITEM_DUPLICATE_ID`
- **AND** nothing is written

#### Scenario: A mixed request is rejected as a whole

- **GIVEN** Ben's list holds item `1` with `activity = "Museum"`
- **WHEN** Ben submits a list containing a valid new item and one item whose `time` is `"9:00"`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `MUST_DO_TIME_INVALID`
- **AND** the valid new item is not stored, so Ben's list still holds only item `1`

#### Scenario: A malformed body is rejected

- **WHEN** the body is a JSON array, omits `items`, sends `items` as an object, or sends an item that is not an object, or an `id` that is a string
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INVALID_REQUEST`
- **AND** the caller's saved items are unchanged

#### Scenario: Repeating the same list is idempotent

- **GIVEN** Ben's list holds two items
- **WHEN** Ben submits the same list twice
- **THEN** both responses are 200 and byte-identical
- **AND** the stored ids, order and `payload` are unchanged

#### Scenario: The first save creates exactly one row

- **GIVEN** Ben has no `must_do` row
- **WHEN** Ben saves one item
- **THEN** `member_preference` holds exactly one row for `(trip_id=1, user_id=2, kind='must_do')`

#### Scenario: The stored payload mirrors the activity under `name`

- **GIVEN** Ben has no saved must-do items
- **WHEN** Ben saves one item whose `activity` is `National Gallery Singapore visit`, and then edits
  that same item's `activity` to `Night visit`
- **THEN** after each of the two writes the stored payload's item carries `name` equal to its own
  `activity`
- **AND** neither response body carries a `name` key

### Requirement: Read member must-do items

The system SHALL expose `GET /api/trips/{tripId}/preferences/must-dos` to any member of that trip,
returning every member's items as
`{"members": [{"userId": <integer>, "mustDos": [{"id","activity","location","time"}]}]}`, with `null`
for an absent `location` or `time` and `mustDos: []` for a member who never saved, so no member is
omitted. Reading SHALL NOT create or modify any row and SHALL NOT return the stored `name` mirror.

#### Scenario: A member reads back the saved list

- **GIVEN** Ben saved one item
- **WHEN** any member reads `GET /api/trips/1/preferences/must-dos`
- **THEN** the response status is 200
- **AND** the `userId = 2` element carries one item whose fields equal the save response
- **AND** the values are still visible after a page reload

#### Scenario: A member without saved items reads an empty array

- **GIVEN** Chloe never saved must-do items
- **WHEN** any member reads the must-do items
- **THEN** `members` contains an element with `userId = 3`
- **AND** its `mustDos` is `[]`

#### Scenario: Members do not overwrite each other

- **GIVEN** Ben saved `Museum` and Chloe saved `Gardens by the Bay`
- **WHEN** any member reads the must-do items
- **THEN** the `userId = 2` element carries only Ben's item
- **AND** the `userId = 3` element carries only Chloe's item
- **AND** the two item ids are unrelated

#### Scenario: The response carries only the agreed fields, ordered by user id

- **WHEN** any member reads the must-do items
- **THEN** every `members` element carries exactly `userId` and `mustDos`
- **AND** every item carries exactly `id`, `activity`, `location` and `time`
- **AND** the elements are ordered by ascending `userId`

#### Scenario: The storage mirror never reaches a response

- **GIVEN** Ben saved one item, so his stored payload carries both `activity` and its `name` mirror
- **WHEN** any member reads the must-do items
- **THEN** no item in the response carries a `name` key
- **AND** `GET /api/trips/{tripId}/main-plan/inputs` still lists that activity in `mustDo`

#### Scenario: Reading changes nothing

- **GIVEN** Ben saved one item
- **WHEN** the must-do items are read twice in a row
- **THEN** both responses are identical
- **AND** Ben's `payload` and `updated_at` are unchanged

## MODIFIED Requirements

### Requirement: Preferences page

The frontend SHALL provide `#/trips/{tripId}/preferences`, linked from the trip page, laid out per
`screen-08-preferences.png` in two sections: interests, then must-do items. Blocks of that screen
owned by other changes SHALL NOT render. Interests save as one explicit request whose response the
page adopts; each must-do item change persists with its own `PUT` and never writes interests. A
failed `GET` offers retry, and nothing renders as saved unless the server returned it.

#### Scenario: Loading

- **WHEN** the preferences page is opened and the `GET` requests have not returned
- **THEN** the page shows a loading message
- **AND** the interest controls, the interest "Save" action and the item actions are disabled

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

#### Scenario: Empty must-do list

- **GIVEN** the current identity has never saved must-do items
- **WHEN** the page has finished loading
- **THEN** the must-do section shows an empty state
- **AND** the add form is usable right away

#### Scenario: Saved must-do items are shown again after a reload

- **GIVEN** Ben saved one item with `location` and `time`
- **WHEN** Ben opens the preferences page
- **THEN** the item is listed with its activity, location and time
- **AND** its id is the one returned by the server

#### Scenario: Adding an item persists immediately

- **GIVEN** the must-do section is loaded
- **WHEN** the user fills the add form and confirms
- **THEN** one `PUT /api/trips/{tripId}/preferences/must-dos` is sent without any page-level save
- **AND** the new item appears with the id from the response

#### Scenario: Editing an item persists immediately and keeps the item count

- **GIVEN** the must-do section lists one item
- **WHEN** the user changes the item's time and confirms
- **THEN** one `PUT` is sent
- **AND** the section still lists one item with the same id and the new time

#### Scenario: Deleting an item requires confirmation

- **GIVEN** the must-do section lists two items
- **WHEN** the user activates Delete for one item
- **THEN** a confirmation dialog identifies that item and offers Confirm and Cancel
- **AND** no `PUT` is sent and both items remain visible
- **WHEN** the user confirms and the request succeeds
- **THEN** exactly one `PUT` is sent and the section lists only the remaining item

#### Scenario: Cancelling item deletion preserves the list

- **GIVEN** the delete confirmation dialog is open for one of two items
- **WHEN** the user cancels or dismisses the dialog
- **THEN** no `PUT` is sent, both items remain and saved data is unchanged
- **AND** unrelated unsaved interest selections remain unchanged

#### Scenario: Switching identity reloads for the new identity

- **GIVEN** Ben sees his own interests and items on the preferences page
- **WHEN** the identity selector in the top bar switches to Chloe
- **THEN** the page fetches both sections again
- **AND** the page shows Chloe's interests and Chloe's items, with none of Ben's state retained

#### Scenario: Saving disables duplicate submissions

- **WHEN** the user activates the interest "Save" action and the request is still in flight
- **THEN** the interest controls and that action are disabled

#### Scenario: A successful save follows the response

- **WHEN** the interest save request returns 200
- **THEN** the selected state equals the `interests` in the response
- **AND** no error message remains on the page

#### Scenario: A rejected save shows an inline error and rolls back

- **GIVEN** the server holds `摄影` and `自然风景` for the current member
- **WHEN** the interest save returns 400 with `code` equal to `INTEREST_NOT_ALLOWED`
- **THEN** the page shows the response `message`
- **AND** the selected state returns to `摄影` and `自然风景`

#### Scenario: A rejected must-do action shows an inline error and rolls back

- **GIVEN** the must-do section lists one item
- **WHEN** an add, edit or delete `PUT` returns 400 or 500
- **THEN** the must-do section shows the response `message`
- **AND** the list returns to the state the server acknowledges
- **AND** the rejected change is not shown as saved

#### Scenario: An in-flight must-do action blocks a duplicate submission

- **WHEN** a must-do action is in flight
- **THEN** the action controls of that section are disabled until it completes

#### Scenario: A must-do action does not touch the interest selection

- **GIVEN** the interest section shows `摄影` selected but not yet saved
- **WHEN** the user adds a must-do item
- **THEN** no interest `PUT` is sent
- **AND** the interest selection is still `摄影`

#### Scenario: Identity, membership or trip is rejected

- **WHEN** any `GET` or `PUT` returns 401, 403 or 404
- **THEN** the page shows the matching error text and a way back
- **AND** the page SHALL NOT render any member's saved interests or items

#### Scenario: Loading fails

- **WHEN** a `GET` fails because the endpoint is unreachable or returns a non-2xx status
- **THEN** the page shows an error message and a retry action
- **AND** the page SHALL NOT show an empty or previously shown list as saved

#### Scenario: The page keeps no local evidence of saved state

- **WHEN** the page is reloaded after a successful save
- **THEN** both sections are rendered from the `GET` responses only
- **AND** no browser local storage value is read as a saved state
