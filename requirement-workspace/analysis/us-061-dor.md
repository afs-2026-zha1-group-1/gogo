# US-061 - Definition of Ready self-check

Date: 2026-11-16. This is an entry self-check, not a gate decision.

| Item | Status | Evidence |
|---|---|---|
| 1. Intent | Pass | `requirements/US-061.md`: display authorized trip information and link to other pages. |
| 2. Actors | Pass | Member, organizer, non-member and signed-out traveler are identified. |
| 3. Scope | Pass | Dashboard reads and navigation only; actions, completion, archive and other-page fixes are excluded. |
| 4. Scenarios | Pass | Cards, progress matrix, counts, links, coming-soon destinations and completion exclusion have observable outcomes. |
| 5. Exceptions | Pass | Loading, empty, missing, read error and access-denied states are identified. |
| 6. Verifiability | Pass | Compare displayed values and progress against authorized persisted state; verify navigation produces no writes. |
| 7. Dependencies | Pass | Existing trip, readiness, main-plan and split reads are identified. US-058 completion, archive and the trip-details no-write fix remain separately delivered prerequisites; the active-trip list read is not yet implemented. |
| 8. Blocking questions | Pass | BQ-1 through BQ-5 are resolved in the requirement. Delivery and wire details of external prerequisites are not represented as already available. |
| 9. Data contract | Pass | `analysis/us-061-deep-dive.md` defines business grain, fields, source and lifecycle for cards, summary, readiness, plan, split, completion and progress. US-058's wire contract remains a delivery prerequisite. |
| 10. Boundaries | Pass | Deep-dive enumerates authorization, empty/missing/error, absent and cancelled state, unavailable navigation and excluded writes. |
| 11. Cross-requirement | Pass | Deep-dive anchors each dependency and records the tracker discrepancy and independently delivered details-page fix. |
| 12. Display | Pass | Deep-dive defines recipients, surfaces, contents and cardinality. No notifications are in scope. |

## Advisory

The user chose to leave these follow-ups to their respective owners on
2026-11-16. Deferral does not waive the delivery prerequisites.

- US-061 issue #26 still contains the original next-action and completed-trip
  dashboard criteria. The current user decisions supersede them for this draft;
  the issue owner must reconcile the tracker before final acceptance.
- Current `app-shell`, `trips`, and `splits` Living Specs contain historical
  statements that differ from the current authenticated implementation.
  Treat these as existing drift, not an instruction to restore older identity
  or storage behavior.
- US-058 issue #24 specifies completed state and an original timestamp, but no
  completion implementation or read contract was found in the current checkout.
  Its delivery is a prerequisite; do not guess a field or infer completion.
- `frontend/src/pages/InvitationPanel.tsx` posts on organizer page load.
  The user selected a separately delivered fix; trip-details dashboard
  navigation must not reach it until then.
