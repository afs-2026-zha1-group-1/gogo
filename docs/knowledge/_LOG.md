# Knowledge log

Append-only timeline of KB changes.

| date | id | change | author |
|---|---|---|---|
| 2026-11-16 | us-031-037-main-itinerary | Added §13 landed reconciliation: main-plan data model (V5 draft/stop + trip_member ready/revision), four `/main-plan*` endpoints, fake provider + TS Screens 9/10; §5/§6/§7 plan placeholders annotated as divergences. No other section changed. | SDD P5 archive |
| 2026-11-16 | us-067-qr-scanner | Added §14 pre-archive landed reconciliation: scanner keeps hash-router + custom fetch + CSS tokens (no React Router / TanStack Query / AntD import), `jsqr` promoted to production dependency, single-source `parseJoinHash` matcher enforcing `#/join/<32-lowercase-hex>` + same-origin per G1 C3, `InAppPage` excludes `'scan'`. Backend impact: none. Will fold into §7 at G3 living-merge. | SDD P4 apply |
