# Proposal: submit preferences and mark readiness (US-026 + US-027)

- Change id: `req-026-submit-preferences`
- Requirement: `requirement-workspace/requirements/REQ-026.md`
- Capability touched: `preferences` (modify)
- Priority: Must
- Layers: Frontend / Backend / Database (read + write)

## Why

Main-plan generation needs to know two things before it can use a member's input: whether that
member has handed their input over, and whether they explicitly said they do not want a say.
Today neither exists. `trip_member` carries only `(trip_id, user_id)`, and `member_preference`
holds four preference kinds with no submission state at all.

The stories make three rules non-negotiable:

1. **Saving is not submitting.** US-026 states that Ben "has saved Art and a National Gallery
   visit but is pending". Readiness therefore cannot be derived from "does this member have a
   preference row"; it must be its own persisted state, written by its own explicit action.
2. **Readiness follows persistence, not a click.** When the save fails the member stays pending.
   An optimistic client-side badge would let a failed submission look successful.
3. **Silence is not consent.** A member who neither submitted nor chose "no preference" must stay
   pending and must not be treated as accepting the defaults. That rules out "hide the form and
   assume nothing was wanted".

## What Changes

**Storage (no migration).** A fifth `kind` value `submission` on the existing
`member_preference` table, one row per member, `payload` a single object:

```json
{"status":"ready","noPreference":false,"submittedAt":"2026-11-15T10:12:00+08:00"}
{"status":"ready","noPreference":true,"submittedAt":"2026-11-15T10:12:00+08:00","defaults":{"transport":"walking","pace":"standard"}}
```

Pending means the row does not exist. There is no "empty submission" row, unlike `budget`, whose
cleared state keeps `{}`. `submittedAt` is generated server-side as an ISO-8601 instant with the
`Asia/Singapore` offset; the caller cannot set it.

**Endpoints.**

- `PUT /api/trips/{tripId}/preferences/submission` with `{"noPreference": false|true}`. Unknown
  keys are ignored. Idempotent overwrite; exactly one row per member.
- `GET /api/trips/{tripId}/preferences/readiness` for the roster: every member, including pending
  ones, ordered by `userId`, plus `readyCount`, `memberCount` and `allReady`.
- `GET /api/trips/{tripId}/preferences/effective` for the generation-side projection: **ready
  members only**. A member with `noPreference = true` contributes no personal values at all and
  appears with `defaults` instead; pending members do not appear.

**Empty submission is rejected.** With `noPreference = false` and no content in any of the four
preference kinds, the request fails with `400 PREFERENCE_EMPTY`. "All four are empty" is defined
per kind: `interest` has no row or empty `codes`; `must_do` has no row or empty `items`; `budget`
has no row or no `amount` key; `constraint` has no row. A `budget` of `0` counts as content.

**Error mapping.** `PREFERENCE_EMPTY` (400) and `INTERNAL_ERROR` (500) are added to the existing
`com.gogo.preference` advice. The 500 mapping is required because the framework default body
carries no `code`/`message`, and both the failed-save acceptance criterion and the page's error
state need one.

**Frontend.** The preferences page gains a submission section: submit button, no-preference
switch, readiness pill, inline error area, and the "save something first or choose no preference"
guard. The no-preference switch disables the form fields rather than hiding them, and it no
longer performs a save. The members view (screen 7) renders its readiness ring and its three pill
variants from `readiness`.

## Capabilities

`preferences` — modified.

- **ADDED** `Submit member preference readiness`: the write contract, the pending/ready state
  machine, the empty-submission rejection, and the stored payload shape.
- **ADDED** `Read preference readiness`: the roster contract, its ordering, and the `allReady`
  aggregate that reports submission only.
- **ADDED** `Read effective preference inputs`: the projection contract, ready-only membership,
  and the replacement rule for explicit no-preference.
- **MODIFIED** `Preferences page`: fourth revision of the page requirement. The page now has four
  sections with four different persistence moments — interests (section save), must-dos (per
  action), budget (section save), and readiness (page-level submit).

`greeting`, `trips`, `invitations` — unchanged. No endpoint, response shape or migration of those
capabilities is touched.

## Impact

- **Backend**: `com.gogo.preference` (created by REQ-019) gains one write endpoint, two read
  endpoints, the empty-submission check, and the 500 mapping. Reuses `TripRepository.findUserId`
  and `isMember`. No new package, no ORM, no new dependency.
- **Database**: no migration. `V4` (`member_preference`) belongs to REQ-019 and must already be on
  `main`; this change only writes `kind = 'submission'` rows.
- **Frontend**: preferences page gains the submission section; `TripDetails.jsx` member area
  consumes `readiness`. No new route, no component library, no new dependency.
- **Docs**: `README.md` (submission and readiness sections), verification matrix rows, and
  `requirement-workspace/{registry,handoff}.md`.
- **Unchanged**: the `/preferences`, `/preferences/must-dos` and `/preferences/budget` payloads
  of REQ-019/020/024; `V1`–`V3`; plan generation itself (`effective` only supplies inputs;
  `allReady` deliberately excludes the main-plan precondition, which belongs to US-031).
- **No breaking change**: the only consumer is this repository's frontend, updated in the same
  change.

## Effort and ordering

Effort: medium-small. One write endpoint, two read endpoints, one validation branch, one error
mapping, one page section, one members-view binding; zero migration.

**Merge order REQ-019 → REQ-020 → REQ-024 → REQ-026 must not be inverted.** `effective` reads the
payloads of the other three kinds, and the page contract is modified a fourth time on top of the
third revision. Each change also needs the preceding change's G1 record and P4 landing before its
own P4, in line with the per-change gate records used so far.

## A0 deep-dive gate

`deep-dive.md` §REQ-026: data contract Pass, boundary enumeration Pass (34 branches),
cross-requirement consistency Pass, display contract Pass (12 states) → **A0 Pass**.
DoR self-check: BLOCKER = 0, blocking open questions unresolved = 0, 40 scenarios
(4 direct AC mappings plus 36 derived).

`/sdd:story-split` is skipped: one requirement (US-026 + US-027 merged by the product owner),
one capability, no story backlog needed.

## Known deviations

- **Fifth `kind` value.** `tech-stack-plan.md` §5 lists four preference kinds and no readiness
  table; `submission` is not preference content but a submission state. REQ-019's DoV already
  decided that later stories extend the value domain, so the deviation is confined to that
  domain; the plan document's §5 line still needs correcting (REQ-019 OQ-16).
- **Plan §6 has no such endpoints.** It describes a single `PUT /preferences` that submits all
  four preference kinds. This change keeps the per-kind sub-resource route that REQ-019/020/024
  already established, and submits readiness separately.
- **Prototype `submitPref()` is redefined.** In the prototype one click saves all four field
  groups and flips the badge to "ready"; here it only submits readiness. The four groups keep
  their own persistence moments. This removes the conflict recorded as R8 by REQ-024.
- **Prototype `noPrefSw` only hides fields.** The implementation must disable the fields and write
  the server-side flag, because hiding a form does not stop saved values from contributing.
- **Empty submission rejection is new.** No acceptance criterion states it; it is the direct
  consequence of "silence is not consent" and is listed as an explicit G1 decision.
- **`INTERNAL_ERROR` is a new code.** No existing advice maps 500, and the failed-save criterion
  needs a displayable error body.
- **No unsubmit.** `ready → pending` has no product path; choosing a different option overwrites
  the same row instead.
- **Readiness is not revoked by later saves.** Changing interests, must-dos or budget after
  submitting leaves the member ready. Draft staleness and regeneration belong to US-031/US-037.
- **Two time sources.** `submittedAt` inside the payload is the contractual field; the table's
  `updated_at` remains a housekeeping column and is not required to match.
- **Reference screenshot amounts and currencies** are illustrative; the page shows real values
  from the API and distinguishes "pending", "ready" and "ready without preference" by text.
- **Error-code drift retracted (2026-11-15)**: an earlier draft of this proposal claimed
  REQ-020's DoR and proposal name `UNAUTHENTIC`/`TRIP_FORBIDDEN`. A P2 re-check found those
  strings only in this change's own P1 documents (`git log -S` traces them to `16e201f`);
  REQ-020 uses the merged `TripController` codes (`USER_REQUIRED`/`NOT_A_MEMBER`). This
  change follows the code, and REQ-026 OQ-10 is closed as resting on a false premise.
