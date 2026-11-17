# US-061 ATDD design

This design describes verification of the current working-tree behavior. It
does not constitute approval, acceptance, or proof that every case passed.
The [earlier G1 decision](g1-decision.md) and accepted test baseline covered a
different scope; renewed human alignment is outstanding.

| Case | Layer | Observable checks |
|---|---|---|
| Current trip | API + browser | Explicit selection in My Trips persists; `#/` displays it after reload. Null, malformed and failed current-trip responses show appropriate states. |
| Membership and access | API + browser | My Trips lists only member trips; signed-out, non-member, malformed and missing direct trip routes do not disclose another trip. |
| Overview sources | Browser | Saved summary, readiness, stale/absent/confirmed plan and split states use authorized reads; inconsistent or failed sources are not fabricated. |
| Role-specific progress | Unit + browser | Organizer sees seven milestones in setup, preferences, invitations, plan, split, reunion, completion order; member sees five without setup and invitations. Unknown reunion/completion are not trip-completion claims. |
| Recommendations | Unit + browser | Exercise preferences, solo-organizer invitation, plan inputs, draft/stale plan and confirmed-plan split branches, including role-specific hints. |
| Destination routes | Browser | Check invitation, preferences, main-plan, inputs and split links, return paths, trip-ID lookup and five-tab behavior where the shell is rendered. |
| Invitation side effect | Browser + persisted state | Organizer invitation and details pages invoke the owning invitation POST on load; non-organizers cannot issue an invitation. Verify authorization and state effects explicitly rather than asserting every navigation is write-free. |
| Selection and races | Browser | Direct overview does not persist current trip; picker writes, account changes, delayed reads and retries do not expose stale private trip data. |

Use the isolated browser harness and synthetic accounts and database fixtures.
Do not run acceptance mutations against a shared development database. The
dashboard itself does not own completion or progress state. US-058
completion filtering, archive, non-functional testing and independent human
gate decisions remain outside this test design.

Local and remote results must identify the tested working tree or commit.
CI on an older PR head does not establish a pass for later uncommitted changes.
