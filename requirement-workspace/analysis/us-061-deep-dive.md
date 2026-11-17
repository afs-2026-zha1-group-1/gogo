# US-061 - Dashboard deep-dive

Date: 2026-11-16. Inputs: `requirements/US-061.md`,
`impact-brief.md` section US-061, current code and US-058 issue #24.
This is a requirement-level contract, not an implementation design.

> Historical analysis: the active-only list and seven-stage projection below
> were superseded for the interim change on 2026-11-17. See the current scope
> in [US-061](../requirements/US-061.md) and its dashboard and shell deltas.
> US-058 integration remains a separately planned follow-up.

## Data contract

| Concept | Grain and fields | State / transition | Source |
|---|---|---|---|
| Member trip card | One per non-completed trip for which the signed-in user is a member: trip identifier, name, destination, start and end dates. | Card enters/leaves the active list with membership or authoritative completion; selecting it opens its per-trip dashboard. | Trip and membership data; new member-scoped read; US-058 completion state. |
| Trip summary | One selected, authorized trip: identifier, name, destination, start/end dates and existing start/end locations. | Reads current saved values; missing or denied trips are not represented as a successful summary. | Existing trip detail/member boundary. |
| Readiness | Per selected trip: member count and ready count; member readiness follows the source's ready predicate. | Reflect current source values; missing or failed reads are not zero counts. | Main-plan generation inputs read and owning preference rules. |
| Main plan | Per selected trip: no draft, draft or confirmed; display stale state when the source reports it. | Existing plan generation/confirmation owns transitions; dashboard reads only. | Main-plan read and existing `NO_DRAFT` outcome. |
| Split | Per selected trip: no draft or saved draft status (`active`, `confirmed`, `cancelled`). | Existing split workflows own transitions. A successful null draft means no draft; an error is not null/absence. | Authorized split-draft read; `SplitDraftService.getDraftDetail`. |
| Completion | Per trip: active/not completed versus completed. US-058 also owns the original completion timestamp, which the active dashboard need not display. | Only US-058 determines completion; completion removes the trip from the active list. Never infer it from dates or split state. | US-058 issue #24; delivered read contract is a prerequisite. |
| Progress | Seven stages for the selected active trip, each completed/current/upcoming. | Use the confirmed table in `requirements/US-061.md`; no separate persisted progress state or writes. | Joining/main-plan state and split status, with US-058 completion filter. |

## Boundary attribution

| Rule / branch | In or out | Behavior |
|---|---|---|
| Signed-in member, active trips | In | Show all and only their non-completed trips and allow selection. |
| Signed-in member, no active trips | In | Show an honest empty state; do not fabricate trip information. |
| Signed-out or expired session | In | Use the existing authentication boundary; disclose no private trip data. |
| Non-member, unknown selected trip | In | Respect the owning read's denied or missing outcome; disclose no private trip data. |
| Initial reads pending | In | Show loading rather than fabricated values. |
| Read fails, invalid or incomplete response, or completion unavailable | In | Show an error/unavailable state; do not treat failure as zero, no draft, or active status. |
| Successful no-main-plan or no-split response | In | Render actual absent status and apply the confirmed progress rules. |
| Cancelled split | In | Main plan current when confirmed; dashboard does not restart the split. |
| Completed trip | In | Exclude it from the active list; archive access belongs to the separate archive. |
| Navigation to an available destination | In | Navigate only; neither dashboard nor navigation changes persisted state. Enforce existing destination authorization. |
| Destination not developed | In | Show that it is coming soon, without a broken link. |
| Trip details before separate no-write fix | In | Show coming soon; dashboard links and tabs must not trigger the organizer's existing automatic invitation POST. |
| Invitation issuance, preferences, planning, split, reunion, completion and archive operations | Out | Owning pages and stories define and execute these operations. No dashboard-side mutations or new permission rules. |
| Malformed trip identifier | In | Treat as invalid/missing navigation; never substitute another trip or reveal private data. |

## Cross-requirement consistency

| Capability / anchor | Alignment |
|---|---|
| Trip and membership: US-002/US-013 | Existing member-only boundaries remain authoritative; the new list is filtered by membership. |
| Preferences/readiness: US-026/US-027 and main-itinerary | Reuse existing readiness semantics and counts, including the generation-inputs projection. |
| Main itinerary: US-037 | Plan confirmation closes joining. The dashboard's progress matrix does not alter confirmation. |
| Split: US-049/US-050 | Read existing active/confirmed/cancelled status; cancellation maps the display back to main plan current. |
| Completion: US-058 | US-058 owns the completed transition and timestamp; dashboard consumes completed state and does not complete trips. |
| App shell: US-064 and auth: US-066 | Keep the authenticated shell and navigation; replace the no-aggregation dashboard contract. Resolve older scaffold/spec drift in the appropriate delta, not by weakening identity. |
| Invitation page: US-008/US-010/US-012 | Current organizer page load may issue an invitation. A separately delivered fix is required before dashboard navigation can expose this destination without a write. |
| Original US-061 issue #26 | Next-action and completed-trip display criteria conflict with later user decisions. User deferred tracker reconciliation to its owner; this document uses the confirmed decisions and does not silently edit the issue. |

## Display contract

| Surface / trigger | Recipient | Content and cardinality | Channel |
|---|---|---|---|
| Active dashboard after login | Signed-in traveler | One card per active member trip: name, destination, dates; all matching trips, or a no-active-trips state. | Application dashboard. |
| Selected trip dashboard | Authorized member | Trip summary, member and ready counts, main-plan and split statuses, seven-stage progress as confirmed in the requirement. No next-action recommendation. | Application dashboard. |
| Dashboard navigation | Authorized member | Existing destination links; not-yet-developed or separately blocked destinations show coming soon. Navigation itself does not mutate state. | Dashboard links and shell tabs. |
| Loading, error, missing and permission states | Viewer | Explicit applicable status without fabricated counts or trip data; denied/signed-out states expose no private data. | Application dashboard / existing auth boundary. |

No email, push notification, or background action is in scope. Exact display
copy and API wire names are design details; no unsupported completion endpoint
is assumed. Prerequisite delivery remains necessary for end-to-end acceptance.
