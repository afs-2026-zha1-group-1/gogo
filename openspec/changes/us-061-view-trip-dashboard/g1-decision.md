# G1 decision — us-061-view-trip-dashboard

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
requester; the signatures below are intentionally blank and do not claim
that either approver has signed this record.

| Role | Name | Signature | Date |
|---|---|---|---|
| IO | Emily Li | Emily |2026-11-17 |
| SA | Sammi Ng | Sammi | 2026-11-17 |
