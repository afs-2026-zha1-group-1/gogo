# Spec Delta — `preferences` (REQ-024)

- Change: `req-024-set-trip-budget`
- Baseline: the `preferences` delta of `req-019-save-interests` plus the delta of
  `req-020-manage-must-do`; neither is archived yet, and this delta stacks on both. The caller
  identity, trip existence and membership precondition stays defined once in REQ-019's
  `Preference caller identity and membership` and is not restated as a new ADDED requirement.
- Storage: `member_preference` with `kind = 'budget'`, one row per member, payload either
  `{"amount": <integer>, "currency": <code>, "limitType": "hard"|"soft"}` or `{}` for the cleared
  state. No migration.
- Amounts are integers in the currency's **minor unit**: `SGD`/`CNY`/`USD`/`EUR` have two decimal
  places, `JPY` has none. 40 SGD is stored and transferred as `4000`; 1200 JPY as `1200`.

## ADDED Requirements

### Requirement: Save member budget

The system SHALL expose `PUT /api/trips/{tripId}/preferences/budget` accepting
`{"amount": integer|null, "currency"?: string, "limitType"?: string}` and SHALL replace the
caller's whole-trip per-person budget.

The budget SHALL be all-or-nothing: either `amount` is an integer together with a non-null
`currency` and a non-null `limitType`, or `amount` is `null` together with an absent or `null`
`currency` and `limitType`, which means "no budget set".

`amount` SHALL be a non-negative integer of at most 2147483647 in the currency's minor unit. Zero
SHALL be a valid, storable value and SHALL be distinguishable from "not set" in every response and
in the stored payload.

`currency` SHALL be one of `SGD`, `CNY`, `USD`, `EUR`, `JPY`, matched exactly (no case folding, no
aliases, no surrounding whitespace tolerance). `limitType` SHALL be exactly `hard` or `soft`.

Validation SHALL complete before any write, in this order, and the first failing check SHALL
decide the response:

1. the body is a JSON object, otherwise status 400 with `code = INVALID_REQUEST`;
2. the `amount` key is present, otherwise `INVALID_REQUEST`; a missing key SHALL NOT be treated as
   `null`;
3. `amount` is `null` or an integer in range, otherwise status 400 with
   `code = BUDGET_AMOUNT_INVALID` (a non-integer, a value above 2147483647, or a negative value);
4. when `amount` is `null`, `currency` and `limitType` are both absent or `null`, otherwise status
   400 with `code = BUDGET_FIELDS_INCOMPLETE`;
5. when `amount` is an integer, `currency` is present and non-null, otherwise `BUDGET_FIELDS_INCOMPLETE`;
6. `currency` is in the allowed set, otherwise status 400 with `code = BUDGET_CURRENCY_NOT_ALLOWED`;
7. `limitType` is present and non-null, otherwise `BUDGET_FIELDS_INCOMPLETE`;
8. `limitType` is `hard` or `soft`, otherwise status 400 with `code = BUDGET_LIMIT_TYPE_INVALID`.

A successful save SHALL return status 200 with
`{"budget": {"amount": <integer>, "currency": <code>, "limitType": "hard"|"soft"}}`.

A save with `amount: null` SHALL return status 200 with `{"budget": null}` and SHALL keep the
member's row with the payload `{}`; the row SHALL NOT be deleted.

A rejected request SHALL NOT write any row and SHALL NOT modify the `payload` or `updated_at` of
an existing row, so a rejected save leaves the previous budget intact.

A member SHALL have at most one `budget` record per trip, so changing the limit type or the value
of an existing budget SHALL overwrite the same row and SHALL NOT create a second one. Repeating the
same body SHALL be idempotent: the stored `payload` SHALL stay the same, while `updated_at` MAY be
refreshed.

The capability SHALL NOT apply currency conversion, SHALL NOT compare amounts across currencies and
SHALL NOT impose a business upper bound beyond the representable range.

#### Scenario: A budget is saved and read back

- **GIVEN** Alice (`X-User-Id: 1`) is a member of trip 1 whose main plan is unconfirmed
- **WHEN** Alice submits `{"amount":4000,"currency":"SGD","limitType":"hard"}`
- **THEN** the response status is 200
- **AND** the response body is `{"budget":{"amount":4000,"currency":"SGD","limitType":"hard"}}`
- **AND** `member_preference` holds exactly one row for `(trip_id=1, user_id=1, kind='budget')`
- **AND** its `payload` parses to a single object, not an array, with the same three fields

#### Scenario: Changing the limit type keeps one row

- **GIVEN** Alice's budget is 4000 SGD with `limitType = "hard"`
- **WHEN** Alice submits `{"amount":4000,"currency":"SGD","limitType":"soft"}`
- **THEN** the response status is 200
- **AND** `amount` and `currency` are unchanged and `limitType` is `"soft"`
- **AND** Alice still holds exactly one `budget` row

#### Scenario: Zero is a value, not an unset budget

- **GIVEN** Alice has no budget set
- **WHEN** Alice submits `{"amount":0,"currency":"SGD","limitType":"hard"}`
- **THEN** the response status is 200
- **AND** a later `GET` returns `budget.amount = 0` with `budget` not `null`
- **AND** the stored payload contains the key `amount` with the value `0`

#### Scenario: Clearing returns to "not set" but keeps the row

- **GIVEN** Alice's budget is 4000 SGD with `limitType = "hard"`
- **WHEN** Alice submits `{"amount":null}`
- **THEN** the response status is 200
- **AND** the response body is `{"budget":null}`
- **AND** a later `GET` returns `budget: null`
- **AND** Alice's row still exists and its `payload` is `{}`

#### Scenario: Zero and "not set" stay distinguishable in both directions

- **GIVEN** Alice's budget is 0 SGD with `limitType = "hard"`
- **WHEN** Alice clears it and then saves `{"amount":0,"currency":"SGD","limitType":"hard"}` again
- **THEN** every response is 200
- **AND** the two states are distinguishable: one carries `{"amount":0,...}`, the other `null`
- **AND** Alice still holds exactly one `budget` row throughout

#### Scenario: A negative amount is rejected and changes nothing

- **GIVEN** Alice's budget is 4000 SGD with `limitType = "hard"`
- **WHEN** Alice submits `{"amount":-100,"currency":"SGD","limitType":"hard"}`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `BUDGET_AMOUNT_INVALID`
- **AND** Alice's `payload` and `updated_at` are byte-identical to the values before the request

#### Scenario: A non-integer amount is rejected

- **WHEN** Alice submits an `amount` of `4000.5`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `BUDGET_AMOUNT_INVALID`
- **AND** nothing is written

#### Scenario: An amount above the representable range is rejected

- **WHEN** Alice submits an `amount` of `2147483648` or `1e12`
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `BUDGET_AMOUNT_INVALID`
- **AND** nothing is written

#### Scenario: A missing amount key is not the same as a null amount

- **GIVEN** Alice's budget is 4000 SGD with `limitType = "hard"`
- **WHEN** Alice submits `{"currency":"SGD","limitType":"hard"}` without an `amount` key
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INVALID_REQUEST`
- **AND** Alice's stored budget is unchanged, so the request did not clear it

#### Scenario: A half budget is rejected

- **WHEN** Alice submits `{"amount":4000}` with `currency` absent, or `{"amount":4000,"currency":"SGD"}` with `limitType` absent
- **THEN** each response status is 400
- **AND** each response body carries `code` equal to `BUDGET_FIELDS_INCOMPLETE`
- **AND** nothing is written

#### Scenario: A null amount with a currency is rejected

- **WHEN** Alice submits `{"amount":null,"currency":"SGD"}` or `{"amount":null,"limitType":"hard"}`
- **THEN** each response status is 400
- **AND** each response body carries `code` equal to `BUDGET_FIELDS_INCOMPLETE`
- **AND** nothing is written

#### Scenario: An unsupported currency code is rejected

- **WHEN** Alice submits a `currency` of `"sgd"`, `"SGDX"`, `"XXX"` or `""`
- **THEN** each response status is 400
- **AND** each response body carries `code` equal to `BUDGET_CURRENCY_NOT_ALLOWED`
- **AND** nothing is written

#### Scenario: An unsupported limit type is rejected

- **WHEN** Alice submits a `limitType` of `"HARD"`, `"medium"` or `""`
- **THEN** each response status is 400
- **AND** each response body carries `code` equal to `BUDGET_LIMIT_TYPE_INVALID`
- **AND** nothing is written

#### Scenario: A zero-decimal currency carries its minor-unit value

- **WHEN** Alice submits `{"amount":1200,"currency":"JPY","limitType":"soft"}`
- **THEN** the response status is 200
- **AND** the stored and returned `amount` is `1200`
- **AND** the page renders it as `JPY 1200` without decimal places

#### Scenario: Repeating the same budget is idempotent

- **GIVEN** Alice's budget is 4000 SGD with `limitType = "hard"`
- **WHEN** Alice submits the same body again
- **THEN** the response status is 200
- **AND** the stored `payload` is unchanged
- **AND** Alice still holds exactly one `budget` row

#### Scenario: A save is accepted after the main plan is confirmed

- **GIVEN** trip 1 has `main_plan_confirmed = 1`
- **WHEN** Alice saves `{"amount":4000,"currency":"SGD","limitType":"hard"}`
- **THEN** the response status is 200
- **AND** the value is stored
- **AND** the outcome is identical to the unconfirmed case, because no locking branch exists in this capability

#### Scenario: One member's budget does not touch another member's

- **GIVEN** Ben (`X-User-Id: 2`) has no budget and Chloe (`X-User-Id: 3`) has 2000 CNY
- **WHEN** Ben saves `{"amount":4000,"currency":"SGD","limitType":"hard"}`
- **THEN** the response status is 200
- **AND** Chloe's `payload` and `updated_at` are unchanged

#### Scenario: A malformed body is rejected

- **WHEN** the body is a JSON array or a string, or is not readable JSON
- **THEN** the response status is 400
- **AND** the response body carries `code` equal to `INVALID_REQUEST`
- **AND** the caller's saved budget is unchanged

### Requirement: Read member budgets

The system SHALL expose `GET /api/trips/{tripId}/preferences/budget`, returning the budget of every
member to a member of that trip, in the shape
`{"members": [ {"userId": <integer>, "budget": {"amount": <integer>, "currency": <code>, "limitType": "hard"|"soft"} | null} ]}`.

Each member object SHALL carry exactly `userId` and `budget`. `budget` SHALL be `null` when the
member never saved a budget and also when the member's last save cleared it, so "not set" has one
representation on the wire. `members` SHALL be ordered by ascending `userId` so assertions are
repeatable. A member who never saved a budget SHALL still appear, so the endpoint SHALL NOT omit
members.

The endpoint SHALL be read-only: reading SHALL NOT create or modify any row.

#### Scenario: A member reads back the saved budget

- **GIVEN** Alice saved 4000 SGD with `limitType = "hard"`
- **WHEN** any member reads `GET /api/trips/1/preferences/budget`
- **THEN** the response status is 200
- **AND** the `userId = 1` element carries `{"amount":4000,"currency":"SGD","limitType":"hard"}`
- **AND** the values are still visible after a page reload

#### Scenario: A member without a budget reads null

- **GIVEN** Ben never saved a budget
- **WHEN** any member reads the budgets
- **THEN** `members` contains an element with `userId = 2`
- **AND** its `budget` is `null`

#### Scenario: A cleared budget reads null as well

- **GIVEN** Alice saved a budget and then cleared it
- **WHEN** any member reads the budgets
- **THEN** the `userId = 1` element carries `budget: null`
- **AND** the member is not omitted

#### Scenario: A zero budget reads back as zero

- **GIVEN** Alice saved an amount of `0`
- **WHEN** any member reads the budgets
- **THEN** the `userId = 1` element carries `budget.amount = 0`
- **AND** that element's `budget` is not `null`

#### Scenario: The response carries only the agreed fields, ordered by user id

- **WHEN** any member reads the budgets
- **THEN** every `members` element carries exactly `userId` and `budget`
- **AND** the elements are ordered by ascending `userId`

#### Scenario: Reading changes nothing

- **GIVEN** Alice saved a budget
- **WHEN** the budgets are read twice in a row
- **THEN** both responses are identical
- **AND** Alice's `payload` and `updated_at` are unchanged

## MODIFIED Requirements

### Requirement: Preferences page

The frontend SHALL provide the page `#/trips/{tripId}/preferences` inside the existing application,
and SHALL link to it from the trip details page. The page SHALL render three sections in this
order: interests, must-do items, budget.

The **interests section** SHALL render the selected state of the seven predefined interests, whose
only source SHALL be the `GET /api/trips/{tripId}/preferences` response entry matching the current
identity (the identity selector in the top bar). The user's selection SHALL be submitted as one
request by an explicit "Save" action; the section SHALL NOT submit on every toggle.

The **must-do items section** SHALL render the current member's items only, each showing its
`activity` and, when present, its `location` and `time`. It SHALL offer an inline add form, an
inline edit action and a delete action per item. The delete action SHALL delete immediately and
SHALL NOT require a confirmation dialog. Every one of those actions SHALL be persisted
immediately by its own `PUT /api/trips/{tripId}/preferences/must-dos`; the section SHALL NOT wait
for a page-level save and SHALL NOT offer a "save all" action.

The **budget section** SHALL render the current member's budget with an amount input, a currency
selector and a hard/soft selector. The currency selector SHALL include `SGD`, `CNY`, `USD`, `EUR`
and `JPY` and SHALL NOT pre-select an amount. The section SHALL be saved by its own explicit
"Save budget" action, which SHALL send `PUT /api/trips/{tripId}/preferences/budget` and SHALL NOT
save the interests or the must-do items. The section SHALL offer a "Clear" action that sends
`{"amount":null}`.

The budget section SHALL render the amount using the currency's decimal places (`SGD`, `CNY`,
`USD`, `EUR` two; `JPY` none) and SHALL NOT hard-code a factor of 100. It SHALL render "not set"
differently from an explicit `0`, so a zero budget is never shown as an empty budget.

A successful action SHALL update its section from the response body. A failed action SHALL show the
server `message` and return its section to the state the server acknowledges, so a rejected change
is never shown as saved. A failed load of any `GET` SHALL show an error with a retry action, and
SHALL NOT render unloaded or stale data as saved.

The three sections SHALL be independent: each of the three save actions SHALL write only its own
`kind`, and none of them SHALL save or alter another section's state.

The page SHALL NOT use browser local storage as evidence of a saved state.

#### Scenario: Loading

- **WHEN** the preferences page is opened and the `GET` requests have not returned
- **THEN** the page shows a loading message
- **AND** the interest controls, all controls of the other two sections, and the three save actions are disabled

#### Scenario: Empty interests

- **GIVEN** the current identity has never saved interests for that trip
- **WHEN** the page has finished loading
- **THEN** none of the seven interests is selected
- **AND** the user can select interests and save right away

#### Scenario: Saved interests are shown again after a reload

- **GIVEN** Ben has saved `Art` and `Nature`
- **WHEN** Ben opens the preferences page
- **THEN** `Art` and `Nature` are selected
- **AND** the other five interests are not selected

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

#### Scenario: Deleting an item persists immediately

- **GIVEN** the must-do section lists two items
- **WHEN** the user deletes one of them
- **THEN** one `PUT` is sent
- **AND** the section lists exactly the remaining item

#### Scenario: An unset budget is not rendered as an empty or zero amount

- **GIVEN** the current identity never saved a budget
- **WHEN** the page has finished loading
- **THEN** the budget section shows its "not set" state
- **AND** the amount input is empty and no currency or limit type is implied
- **AND** the section does not display an amount of zero

#### Scenario: A saved budget is shown again after a reload

- **GIVEN** Alice saved `{"amount":4000,"currency":"SGD","limitType":"hard"}`
- **WHEN** Alice opens the preferences page
- **THEN** the amount is rendered as `40.00` with `SGD` and the hard limit labelled
- **AND** the formatted value matches the two-decimal rule of that currency

#### Scenario: A zero budget is rendered differently from an unset budget

- **GIVEN** Alice saved `{"amount":0,"currency":"SGD","limitType":"hard"}`
- **WHEN** Alice opens the preferences page
- **THEN** the amount is rendered as `0.00` with the hard limit labelled
- **AND** the rendered copy differs from the "not set" state

#### Scenario: A zero-decimal currency is formatted without decimals

- **GIVEN** Alice saved `{"amount":1200,"currency":"JPY","limitType":"soft"}`
- **WHEN** Alice opens the preferences page
- **THEN** the amount is rendered as `1200` and no `.00` suffix appears

#### Scenario: Saving the budget sends one request and touches nothing else

- **GIVEN** the interest section shows a saved selection and the must-do section lists one item
- **WHEN** the user sets an amount, a currency and a limit type and activates "Save budget"
- **THEN** exactly one `PUT /api/trips/{tripId}/preferences/budget` is sent
- **AND** no interest or must-do `PUT` is sent
- **AND** the budget section renders the values from the response

#### Scenario: Saving the budget blocks duplicate submissions

- **WHEN** the budget save is in flight
- **THEN** the budget controls and its save action are disabled until it completes

#### Scenario: Clearing the budget returns the section to "not set"

- **GIVEN** Alice's budget is 4000 SGD with `limitType = "hard"`
- **WHEN** Alice activates "Clear" and the request returns 200 with `{"budget":null}`
- **THEN** the section renders its "not set" state again
- **AND** no amount, currency or limit type is shown as saved

#### Scenario: A rejected budget save keeps the previous values

- **GIVEN** Alice's saved budget is 4000 SGD with `limitType = "hard"`
- **WHEN** the budget save returns 400 with `code = BUDGET_AMOUNT_INVALID` or `BUDGET_FIELDS_INCOMPLETE`
- **THEN** the section shows the response `message`
- **AND** the saved value stays the server's value, so the rejected input is not shown as saved
- **AND** the controls keep the user's typed input so it can be corrected

#### Scenario: Switching identity reloads all three sections

- **GIVEN** Ben sees his own interests, items and budget on the preferences page
- **WHEN** the identity selector in the top bar switches to Chloe
- **THEN** the page fetches all three sections again
- **AND** the page shows Chloe's state, with none of Ben's state retained

#### Scenario: Saving interests disables duplicate submissions

- **WHEN** the user activates the interest "Save" action and the request is still in flight
- **THEN** the interest controls and that action are disabled

#### Scenario: A successful interest save follows the response

- **WHEN** the interest save request returns 200
- **THEN** the selected state equals the `interests` in the response
- **AND** no error message remains on the page

#### Scenario: A rejected interest save shows an inline error and rolls back

- **GIVEN** the server holds `Art` and `Nature` for the current member
- **WHEN** the interest save returns 400 with `code` equal to `INTEREST_NOT_ALLOWED`
- **THEN** the page shows the response `message`
- **AND** the selected state returns to `Art` and `Nature`

#### Scenario: A rejected must-do action shows an inline error and rolls back

- **GIVEN** the must-do section lists one item
- **WHEN** an add, edit or delete `PUT` returns 400 or 500
- **THEN** the must-do section shows the response `message`
- **AND** the list returns to the state the server acknowledges
- **AND** the rejected change is not shown as saved

#### Scenario: An in-flight must-do action blocks a duplicate submission

- **WHEN** a must-do action is in flight
- **THEN** the action controls of that section are disabled until it completes

#### Scenario: A must-do action does not touch the other sections

- **GIVEN** the interest section shows `Art` selected but not yet saved, and a budget is saved
- **WHEN** the user adds a must-do item
- **THEN** no interest or budget `PUT` is sent
- **AND** the interest selection is still `Art` and the budget section is unchanged

#### Scenario: Identity, membership or trip is rejected

- **WHEN** any `GET` or `PUT` returns 401, 403 or 404
- **THEN** the page shows the matching error text and a way back
- **AND** the page SHALL NOT render any member's saved interests, items or budgets

#### Scenario: Loading fails

- **WHEN** a `GET` fails because the endpoint is unreachable or returns a non-2xx status
- **THEN** the page shows an error message and a retry action
- **AND** the page SHALL NOT show an empty or previously shown section as saved

#### Scenario: The page keeps no local evidence of saved state

- **WHEN** the page is reloaded after a successful save
- **THEN** all three sections are rendered from the `GET` responses only
- **AND** no browser local storage value is read as a saved state

## Clarifications

| id | Decision | Rationale |
|---|---|---|
| C1 | Validation order is fixed and the first failing check decides the response | A request can violate several rules at once; without a fixed order the error `code` would not be assertable |
| C2 | A missing `amount` key is `INVALID_REQUEST`, while `"amount": null` clears the budget | Keeps "malformed request" and "clear" apart, so a truncated body can never silently erase a saved budget |
| C3 | A cleared budget keeps the row with `payload = {}` | Matches REQ-019's rule that clearing never deletes the record; "not set" still has a single wire representation (`null`) |
| C4 | No business upper bound beyond the representable range | The ACs define none; a fabricated limit would become a product rule that later stories must honour |
| C5 | The wire format stays in the currency's minor unit, and the page converts using a per-currency decimal table | Keeps storage integral (plan §5) while the screen shows `40.00`; a hard-coded factor of 100 would break `JPY` |
| C6 | The budget section saves on its own action, never through a page-level submit | Interests save explicitly, must-do items save per action, budgets save per section; one shared submit would write several `kind`s at once |
| C7 | MVP boundary: the closed loop is save, read back, change the limit type, clear | Currency conversion, exchange rates, budget history and any business amount ceiling are intentionally absent (REQ-024 OQ-10/OQ-13), and no other member's budget is rendered by this change; their absence is a scope decision, not an omission |
