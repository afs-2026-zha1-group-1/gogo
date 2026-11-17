# G1 decision — us-061-view-trip-dashboard

## Current decision — revised milestone scope

- **Gate:** G1 (Align)
- **Decision:** Conditional
- **Recorded:** 2026-11-17 11:21:33 +08:00
- **Approvers:** IO Emily Li; SA Sammi Ng. The requester reported that both
  approved a Conditional decision for the revised scope; this is reported
  approval, not a direct signature.

### Inputs and findings

- [Proposal](proposal.md), [trip-dashboard delta](specs/trip-dashboard/spec.md),
  [app-shell delta](specs/app-shell/spec.md), [design](design.md), and
  [ATDD design](atdd-design.md).
- The revised scope displays source-backed planning milestones and safe,
  source-backed recommendations. Reunion and completion remain unknown
  without authoritative reads; trip completion is not inferred.
- `openspec validate us-061-view-trip-dashboard --strict` reports three
  app-shell modified-requirement errors involving omitted existing scenarios.
  The earlier [AC / DoV review](dov-ac-review.md), [alignment self-check](alignment-self-check.md),
  and [local requirement](../../../requirement-workspace/requirements/US-061.md)
  describe the superseded interim scope and need reconciliation.
- The previous Pass below applies only to the earlier interim scope. The
  revised scope has not passed G1 and is not authorized by that earlier Pass.

### Conditions and owner

| Remediation | Owner | Required outcome |
|---|---|---|
| Reconcile the app-shell delta with the current shell specification and resolve strict validation errors. | Sammi Ng | A coherent, validated shell delta preserving the intended four-tab behavior and explicitly addressing affected existing scenarios. |
| Reconcile the requirement, AC / DoV review, alignment check and ATDD with the revised scope. | Sammi Ng | Consistent, reviewable acceptance and test artifacts covering verified milestones, unknown states and safe recommendations. |
| Return the revised change to the named IO and SA for G1 reassessment. | Sammi Ng | Record a new human decision after the conditions are resolved; do not treat this Conditional decision as a Pass. |

No remediation deadline was supplied. Implementation and acceptance remain
subject to the applicable gate and test prerequisites.

## Earlier decision — interim scope

- **Gate:** G1 (Align)
- **Decision:** Pass
- **Recorded:** 2026-11-17 09:37:24 +08:00
- **Approvers:** IO Emily Li; SA Sammi Ng. The requester reported that both
  approved Pass on the updated interim scope and recorded follow-ups on
  2026-11-17; this is reported approval, not a new direct signature.

### Inputs and findings

- [Proposal](proposal.md), [trip-dashboard delta](specs/trip-dashboard/spec.md),
  [app-shell delta](specs/app-shell/spec.md), [interim AC / DoV review](dov-ac-review.md),
  [alignment self-check](alignment-self-check.md), [ATDD design](atdd-design.md),
  and [local requirement](../../../requirement-workspace/requirements/US-061.md).
- The interim scope lists all member trips and shows completion-dependent
  progress as unavailable. US-058 integration and archive are deferred; unsafe
  details navigation remains blocked. Existing session authentication is reused.
- The [earlier consistency lint](consistency-lint.md) remains Partial. Its
  warnings are not represented as fixed: the US-066 shell overlap and historical
  scenario headings require follow-up, and the original external tracker still
  differs from the interim scope.
- US-061 proceeds before the later US-066 shell reconciliation; Sammi Ng
  coordinates preservation of dashboard behavior and separate external tracker
  reconciliation. The member-list API deviation is documented in design and
  must be reconciled with the binding plan at archive.
- No unresolved scope ambiguity is carried into this interim decision. The
  follow-ups above remain open; Pass does not claim implementation, completion
  integration, tracker update, or successful end-to-end acceptance.
  Acceptance still requires actual authentication and owning reads, browser
  verification and no-write evidence.

**Conditions for G1 Pass:** None. The named follow-ups and acceptance checks
above remain required in their respective later workflows.

## Earlier decision — active-only scope (superseded)

- **Gate:** G1 (Align)
- **Decision:** Conditional
- **Recorded:** 2026-11-16 23:31:03 +08:00

## Inputs

- [Proposal](proposal.md)
- Delta specs: [trip-dashboard](specs/trip-dashboard/spec.md) and
  [app-shell](specs/app-shell/spec.md)
- [AC / DoV review](dov-ac-review.md): Partial; the completion-read contract
  and dependency and tracker questions remain open.
- [Consistency lint](consistency-lint.md): Partial, with 0 blockers and 3
  warnings; the report also identifies tracker and API-plan drift.
- [US-061 requirement](../../../requirement-workspace/requirements/US-061.md)

## Findings

- **Scope:** The dashboard is a read-only active-member-trip list and
  overview. Completion writes, archive delivery and destination-page actions
  are out of scope. Completed trips are excluded using US-058's authoritative
  state; unsafe trip-details navigation remains unavailable until its
  separate fix is delivered.
- **Ambiguity:** The concrete US-058 completion-read contract and its
  delivery are not yet established. Availability, ownership and sequencing
  of the separate authentication, archive and trip-details dependencies
  must be confirmed.
- **Conflict:** The original US-061 tracker criteria differ from the
  confirmed scope. US-066 also modifies overlapping app-shell requirements,
  and historical scenario headings do not match their updated assertions.
  The new member-scoped list read is outside the binding plan's API list.

## Conditions and owners

| Remediation | Owner | Required outcome |
|---|---|---|
| Establish and document the US-058 completion-read contract and verify its delivery. | Sammi Ng | Authoritative completion state can be consumed without inferring active status on a failed or invalid read; confirm before implementation. |
| Confirm owners, delivery and integration sequencing for authentication, archive and the separately owned trip-details no-write fix. | Sammi Ng | Record dependency contracts and owners; verify applicable prerequisites before end-to-end acceptance. |
| Sequence US-066 and US-061 and reconcile overlapping app-shell requirement blocks; address historical scenario headings through a supported follow-up. | Sammi Ng | Avoid restoring scaffold identity or conflicting shell behavior; reconcile before archive. |
| Reconcile the original US-061 tracker criteria with the confirmed dashboard scope. | Sammi Ng | Record the agreed scope and resolve tracker drift. |
| Record the member-scoped list API deviation during design and reconcile the binding tech-stack plan at archive. | Sammi Ng | The plan reflects the API actually delivered by the archived change. |

No deadlines were supplied. This Conditional decision is not a Pass; the
conditions remain open until their outcomes are verified and the gate decision
is revisited.

## Approvers and signatures

The requester reported that both named approvers approved. The Conditional
decision and remediation ownership were subsequently supplied by the
requester. The signature cells below are preserved as previously recorded;
they are not evidence of direct signatures on the newer decision.

| Role | Name | Signature | Date |
|---|---|---|---|
| IO | Emily Li | Emily |2026-11-17 |
| SA | Sammi Ng | Sammi | 2026-11-17 |
