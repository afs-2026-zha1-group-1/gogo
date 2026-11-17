# Spec Delta

## ADDED Requirements

### Requirement: Save member budget

The system SHALL expose `PUT /api/trips/{tripId}/preferences/budget` accepting
`{"amount", "currency", "limitType"}` to replace the caller's per-person budget, all-or-nothing.
Validation precedes writes; the first failing check decides the `code`, mapped in the scenarios
below. A valid save returns 200; a rejected save writes nothing.

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

#### Scenario: A defect maps to its own error code

- **WHEN** a request's only defect is the one named below
- **THEN** the response is 400 with the mapped `code`

| Defect | `code` |
|---|---|
| body not a JSON object, or no `amount` key | `INVALID_REQUEST` |
| `amount` negative, fractional, or above 2147483647 | `BUDGET_AMOUNT_INVALID` |
| integer `amount` without `currency` or without `limitType` | `BUDGET_FIELDS_INCOMPLETE` |
| `currency` outside `SGD`, `CNY`, `USD`, `EUR`, `JPY`, matched exactly | `BUDGET_CURRENCY_NOT_ALLOWED` |
| `limitType` outside `hard`, `soft` | `BUDGET_LIMIT_TYPE_INVALID` |

#### Scenario: An incomplete null budget is not a clear

- **WHEN** `amount` is `null` while `currency` or `limitType` is present and non-null
- **THEN** the response is 400 `BUDGET_FIELDS_INCOMPLETE`
- **AND** the saved budget is unchanged

#### Scenario: The representable maximum is accepted and the capability does no arithmetic

- **WHEN** a member saves `amount` `2147483647` and later reads both their own and another member's
  budget in a different currency
- **THEN** the save returns 200 and the read returns `2147483647` unchanged
- **AND** neither response converts, compares or caps the amounts, because the capability defines
  no exchange rate and no business limit beyond the range above

### Requirement: Read member budgets

The system SHALL expose `GET /api/trips/{tripId}/preferences/budget` to any member of that trip,
returning `{"members": [{"userId", "budget"}]}` for every member, `budget` being
`{"amount", "currency", "limitType"}` or `null`. `null` means never saved and cleared alike, so
"not set" has one wire representation. Elements are ordered by ascending `userId` and no member is
omitted. Reading changes nothing.

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

The frontend SHALL provide `#/trips/{tripId}/preferences`, linked from the trip page, laid out per
`screen-08-preferences.png` in three sections: interests, must-do items, then budget; blocks owned
by other changes SHALL NOT render. Interests save as one explicit request whose response the page
adopts; each must-do and budget action persists with its own `PUT` and writes only its own section.
A failed `GET` offers retry, and nothing renders as saved unless the server returned it.

#### Scenario: Loading

- **WHEN** the preferences page is opened and the `GET` requests have not returned
- **THEN** the page shows a loading message
- **AND** the interest controls, all controls of the other two sections, and the three save actions are disabled

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
- **AND** unrelated interest selections and budget input remain unchanged

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
- **WHEN** Alice activates "Clear"
- **THEN** a confirmation dialog identifies the budget and offers Confirm and Cancel
- **AND** no request is sent and the saved budget remains visible
- **WHEN** Alice confirms and the request returns 200 with `{"budget":null}`
- **THEN** the section renders its "not set" state again
- **AND** exactly one budget `PUT` sends `{"amount":null}`; no other section is saved
- **AND** no amount, currency or limit type is shown as saved

#### Scenario: Cancelling budget clearing preserves values and input

- **GIVEN** a saved budget and unsaved budget input exist, and the Clear dialog is open
- **WHEN** the user cancels or dismisses the dialog
- **THEN** no `PUT` is sent; saved budget and all unsaved section input are unchanged

#### Scenario: A rejected confirmed clear preserves the saved budget

- **GIVEN** Alice has a saved budget and confirms clearing it
- **WHEN** the clear request fails or returns a non-2xx response
- **THEN** the page shows an error, preserves the saved budget and does not show it as cleared

#### Scenario: A rejected budget save keeps the previous values

- **GIVEN** Alice's saved budget is 4000 SGD with `limitType = "hard"`
- **WHEN** the budget save returns 400 with `code = BUDGET_AMOUNT_INVALID` or `BUDGET_FIELDS_INCOMPLETE`
- **THEN** the section shows the response `message`
- **AND** the saved value stays the server's value, so the rejected input is not shown as saved
- **AND** the controls keep the user's typed input so it can be corrected

#### Scenario: Switching identity reloads for the new identity

- **GIVEN** Ben sees his own interests, items and budget on the preferences page
- **WHEN** the identity selector in the top bar switches to Chloe
- **THEN** the page fetches all three sections again
- **AND** the page shows Chloe's state, with none of Ben's state retained

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

- **GIVEN** the interest section shows `摄影` selected but not yet saved, and a budget is saved
- **WHEN** the user adds a must-do item
- **THEN** no interest or budget `PUT` is sent
- **AND** the interest selection is still `摄影` and the budget section is unchanged

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
