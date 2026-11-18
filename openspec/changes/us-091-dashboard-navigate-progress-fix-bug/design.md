# Design

## Context

See [proposal](proposal.md). Dashboard context currently directs the Trips tab
to an empty guard. Invitation issuance is restricted in both the panel and API.

## Goals / Non-Goals

**Goals:** reuse the account-scoped saved trip and existing invitation token;
enforce invitation authorization on the server.

**Non-Goals:** changing join cutoff, plan permissions or data model.

## Decisions

1. Route the Trips tab to the existing current-trip flow from every origin.
   Unlike using the dashboard route ID, this respects the saved selection and
   preserves explicit dashboard deep links without a write.
2. Remove only the two unsupported progress entries; retain existing
   role-specific order and state derivation.
3. Use trip membership for issuance authorization, including organizer
   membership, and reuse the per-trip token and existing UI flows. A frontend-only
   change would leave the API restriction in place; unrestricted issuance would
   expose tokens to outsiders.

## Risks / Trade-offs

- Direct dashboard trip differs from saved trip → test both IDs and ensure no
  navigation write occurs.
- Member UI changes could expose invitations to outsiders → verify server denial
  independently of UI and retain closed-joining behavior.

## Migration Plan

No schema migration. Deploy frontend and backend together; revert both if
necessary. Existing invitation tokens and saved selections remain unchanged.
