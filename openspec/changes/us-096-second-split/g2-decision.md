# G2 Decision — us-096-second-split

- Date: 2026-11-18
- Change: `us-096-second-split`
- VL: Leo
- IO: Emily
- SA: Johnson

## Decision

**Pass.**

## Evidence

- Backend `mvn -B test`: 555/555 green (includes US-095 FROM_START tests and 8 new round tests).
- Frontend `npm run typecheck`, `npm run test:unit` 88/88, `npm run build` green.
- Browser: login as Ben, trip 2; round 1 confirmed → start round 2 → boundaries 15:15 → 16:55 → generate → preview (two-round graph, join-fork at 铜锣湾时代广场) → confirm → overview shows two confirmed rounds; personal route concatenates both rounds.
- Budget aggregate and provider exclusion covered by `SplitRoundApiTest`:
  - second-round confirmation blocked when two-round total exceeds a hard budget;
  - second-round B activity differs from round 1.

## Notes

- US-095 and US-096 are integrated in one branch; both story docs are included.
- Role names were supplied by the user on 2026-11-18.
