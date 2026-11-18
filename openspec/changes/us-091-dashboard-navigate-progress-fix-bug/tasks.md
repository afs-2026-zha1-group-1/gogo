# Tasks

## 1. P4 handoff

- [ ] 1.1 Push the change branch and open a PR, never push to main; verify its branch and PR exist. Do not merge main merely to stay current.

## 2. Current-trip navigation

- [ ] 2.1 Add failing browser coverage for dashboard → Trips, reload, distinct saved/dashboard IDs, empty selection and read failure; confirm the regression is reproduced.
- [ ] 2.2 Route the Trips tab through the current-trip flow and pass the focused browser tests without changing the saved selection.

## 3. Dashboard progress

- [ ] 3.1 Update progress unit and browser tests for both roles and source-backed states; remove reunion and completion and pass those tests.

## 4. Member invitations

- [ ] 4.1 Add API tests for member-first issuance, shared token reuse, non-member/anonymous denial and joining cutoff; implement membership authorization and pass them.
- [ ] 4.2 Enable member sharing in embedded and dedicated invitation views; pass browser tests for both roles and denied outsiders.

## 5. Integration and pre-archive

- [ ] 5.1 Run focused frontend and backend tests and the frontend build; record results and any failures.
- [ ] 5.2 Before archive, reconcile shipped capabilities, API and data model with `docs/knowledge/architecture/tech-stack-plan.md`; update only completed archived features and append `docs/knowledge/_LOG.md` if the plan changes. Record the reconciliation result.
