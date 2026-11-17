# Spec Delta — `preferences` (REQ-020)

- Change: `req-020-manage-must-do`
- Baseline: the `preferences` delta of `req-019-save-interests`, which is not archived yet. This delta
  stacks on the **revised** text of that baseline (2026-11-16: ten Chinese interest labels and the
  `screen-08-preferences.png` page layout). The caller identity, trip existence and membership
  precondition is defined once in REQ-019's `Preference caller identity and membership` and applies
  unchanged to the endpoints below; it is not restated here as a new ADDED requirement.
- Revision (2026-11-16, P3): three amendments. (1) The MODIFIED `Preferences page` requirement was
  re-based on that revised revision 1, because it had been written against the pre-revision text
  (seven English labels, no layout paragraph). (2) A storage-only `name` mirror was added (R4),
  because the merged main-plan reader reads `name`; it costs two scenarios, so this delta is now
  3 requirements / 44 scenarios instead of the earlier 42. (3) The two ADDED requirement bodies were
  shortened to the 500-character strict limit (G1 condition 6); every statement they dropped is
  asserted by a scenario of the same requirement, so no contract, no scenario and no count changed.
  Amendments (1) and (2) were re-reviewed and signed Pass on 2026-11-16 by IO Emily and SA
  evelyn.huang (`g1-decision.md`, "Revision re-review (2026-11-16) — Pass", condition 8 closed).
  Amendment (3) is a formatting change made afterwards under condition 6 and does not reopen that
  signature.
- Storage: `member_preference` with `kind = 'must_do'`, one row per member, payload
  `{"items": [{id, activity, name, location, time}]}`, `null` where a field is absent. `name` mirrors
  `activity` and is never returned. No migration.

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

The frontend SHALL provide the page `#/trips/{tripId}/preferences` inside the existing application,
and SHALL link to it from the trip details page. The page SHALL render two sections in this order:
the interests section, then the must-do items section.

The **interests section** SHALL render the selected state of the ten predefined interests, whose
only source SHALL be the `GET /api/trips/{tripId}/preferences` response entry matching the current
identity (the identity selector in the top bar). The user's selection SHALL be submitted as one
request by an explicit "Save" action; the section SHALL NOT submit on every toggle.

The layout SHALL follow the approved screen `screen-08-preferences.png`, as revision 1 established it
and extended here with the must-do section: a top app bar with a back control, the title `我的偏好`,
the subtitle `<display name> · US-019~020` (R1) and a save-state badge; a section heading
`兴趣（US-019 · 预设列表、不重复）`; one selectable chip per catalogue interest, showing its emoji and
Chinese label, in the catalogue order (`水上运动`, `潜水`, `摄影`, `美食`, `咖啡`, `历史人文`, `手作`,
`自然风景`, `冒险`, `慢游`), with the selected chip filled in the dark ink colour and the rest on the
light surface; a hint line explaining that saved interests are visible to every member; a section
heading `必做项（US-020 · 可增删改）` listing one row per item, marking an item's `location` with a pin
and its `time` with a clock and offering an edit and a delete icon button per row; an `添加必做项`
action opening the inline form whose fields are `活动名称`, `地点` and `固定时间`, with `取消` and
`保存` (R2); and a fixed bottom action bar holding the primary interest save button. The remaining
screen-08 blocks (budget, the no-preference switch and ``提交并标记就绪``) belong to other changes and
SHALL NOT be rendered here.

The save-state badge SHALL describe the interests section only, because must-do items persist per
action and report inside their own section; its states are `加载中`, `保存中`, `未保存` and `已保存`
(R3).

The **must-do items section** SHALL render the current member's items only, each showing its
`activity` and, when present, its `location` and `time`. It SHALL offer an inline add form, an
inline edit action and a delete action per item. Delete SHALL open a confirmation dialog
identifying the item, with Confirm and Cancel actions. Opening, cancelling or dismissing it
SHALL send no request and SHALL preserve the item. Only confirmation SHALL send the delete
request. Every completed add/edit or confirmed delete SHALL be persisted
by its own `PUT /api/trips/{tripId}/preferences/must-dos`; the section SHALL NOT wait
for a page-level save and SHALL NOT offer a "save all" action.

A successful action SHALL update its section from the response body. A failed action SHALL show the
server `message` and return its section to the state the server acknowledges, so a rejected change
is never shown as saved. A failed load of either `GET` SHALL show an error with a retry action, and
SHALL NOT render unloaded or stale data as saved.

The two sections SHALL be independent: saving interests SHALL NOT write must-do items, and any
must-do action SHALL NOT save or alter the interest selection.

The page SHALL NOT use browser local storage as evidence of a saved state.

#### Scenario: Loading

- **WHEN** the preferences page is opened and the `GET` requests have not returned
- **THEN** the page shows a loading message
- **AND** the interest controls, the interest "Save" action and the item actions are disabled

#### Scenario: Empty interests

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

#### Scenario: Switching identity reloads both sections

- **GIVEN** Ben sees his own interests and items on the preferences page
- **WHEN** the identity selector in the top bar switches to Chloe
- **THEN** the page fetches both sections again
- **AND** the page shows Chloe's interests and Chloe's items, with none of Ben's state retained

#### Scenario: Saving interests disables duplicate submissions

- **WHEN** the user activates the interest "Save" action and the request is still in flight
- **THEN** the interest controls and that action are disabled

#### Scenario: A successful interest save follows the response

- **WHEN** the interest save request returns 200
- **THEN** the selected state equals the `interests` in the response
- **AND** no error message remains on the page

#### Scenario: A rejected interest save shows an inline error and rolls back

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

## Clarifications

C1–C6 were frozen at G1 and are unchanged by the 2026-11-16 re-basing. R1–R3 were added by that
re-basing of the page requirement; R4 was added the same day. All four were re-reviewed and signed
Pass on 2026-11-16 (IO Emily, SA evelyn.huang) — `g1-decision.md`, condition 8 closed.

| id | Decision | Rationale |
|---|---|---|
| C1 | Item ids are unique within the caller's list only and may be reassigned after the list is emptied (`max + 1`) | Ids are never referenced outside the list, and a durable counter would require a payload field or a second table; REQ-020's proposal wording "not reused after deletion" is narrowed accordingly |
| C2 | The stored and returned order is the request order | Makes assertions repeatable and matches the interest set's ordering rule; no server-side sorting rule is added |
| C3 | No item-count limit, field-length limit or name-based deduplication | The ACs define none, and a fabricated limit would be a new product rule |
| C4 | An absent `location`/`time` is stored as `null`, not omitted | Keeps the stored and returned item shape fixed, so assertions do not depend on key presence |
| C5 | Both `location` and `time` may be saved together | Overrides the reference screen's "choose one of location or time" wording, as decided in REQ-020's P1 |
| C6 | Delete requires a confirmation dialog; cancelling or dismissing sends no request | User ruling 2026-11-15 supersedes the earlier immediate-delete decision, and supersedes the reference screen, whose `rmMustdo` removes a row at once — the same kind of override C5 makes. Item-count/field-length limits, name-based deduplication and per-item date remain out of scope |
| R1 | The app bar subtitle reads `<display name> · US-019~020` | The reference screen carries the whole range `US-019~027`, while revision 1 shipped `· US-019` because that was all the page rendered; the range now covers both rendered sections. Changes a shipped string, so it was submitted for the 2026-11-16 re-review and is signed |
| R2 | The must-do strings come from `screen-08-preferences.png` | Fixes what the E2E rows assert: heading `必做项（US-020 · 可增删改）`, action `添加必做项`, fields `活动名称` / `地点` / `固定时间`, buttons `取消` / `保存`, pin and clock markers. The screen's `二选一` marker on `地点` is dropped, because C5 allows both fields |
| R3 | The save-state badge describes the interests section only | Revision 1 shipped one page-level badge for its single save; must-do persists per action and reports inside its own section, so the badge must not claim to cover it |
| R4 | The stored payload mirrors `activity` as `name`; the response never carries it | User ruling 2026-11-16. `MainPlanService.mustDoItems`, already merged to `main`, reads `item.path("name")`, and `V5__create_main_plan.sql` seeds `must_do` rows in that shape; without the mirror, every item saved through this change would reach main-plan generation as an empty string while `MainPlanApiTest` stayed green. The alternatives were changing that reader (`activity` first, `name` fallback) or a `V7` rewrite of the seeds; the mirror was chosen because it keeps this change inside its own package and leaves the merged reader and the seeds untouched |
