# Design

## Context

See [proposal](proposal.md). Dashboard context currently directs the Trips tab
to an empty guard. Invitation issuance is restricted in both the panel and API.

## Goals / Non-Goals

**Goals:** reuse the account-scoped saved trip, creation page and invitation
token; enforce member authorization on the server; permit members to generate
drafts while keeping confirmation organizer-only.

**Non-Goals:** changing the join cutoff, plan confirmation or split permissions,
or the data model.

## Decisions

1. Route the Trips tab to the existing current-trip flow from every origin.
   Unlike using the dashboard route ID, this respects the saved selection and
   preserves explicit dashboard deep links without a write. When no trip is
   available, preserve the existing split fallback: non-dashboard context may
   share the Trips empty state, while dashboard context retains its trip-entry
   guard.
2. Remove the two unsupported progress entries and show invitations after
   preferences for every member. With ready preferences and no draft, retain
   invitation as active, recommend generation and expose both generation and
   invitation actions. A generated draft completes that milestone; joining
   status separately follows the persisted `joiningClosed` value.
3. Use trip membership for issuance authorization, including organizer
   membership, and reuse the per-trip token and existing UI flows. A frontend-only
   change would leave the API restriction in place; unrestricted issuance would
   expose tokens to outsiders.
4. Route the upper-left create quick entry to the existing `#/create` page.
5. Apply the existing membership check to generation and regeneration, keeping
   readiness and confirmed-plan guards. Confirmation and manual stop editing
   retain their organizer-only checks; warn all members that regeneration
   replaces the current draft and its manual edits.

## Risks / Trade-offs

- Direct dashboard trip differs from saved trip → test both IDs and ensure no
  navigation write occurs.
- Member UI changes could expose invitations to outsiders → verify server denial
  independently of UI and retain closed-joining behavior.
- Regeneration can replace organizer edits → make the warning visible to members;
  verify non-members are denied and only the organizer can confirm.

## Migration Plan

No schema migration. Deploy frontend and backend together; revert both if
necessary. Existing invitation tokens and saved selections remain unchanged.
