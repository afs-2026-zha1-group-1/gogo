# Knowledge log

Append-only timeline of KB changes.

| date | id | change | author |
|---|---|---|---|
| 2026-11-16 | us-031-037-main-itinerary | Added §13 landed reconciliation: main-plan data model (V5 draft/stop + trip_member ready/revision), four `/main-plan*` endpoints, fake provider + TS Screens 9/10; §5/§6/§7 plan placeholders annotated as divergences. No other section changed. | SDD P5 archive |
| 2026-11-16 | architecture/tech-stack-plan | UI row corrected from Ant Design 5 to shadcn/ui + Tailwind CSS v4 (components in `frontend/src/components/ui/`, tokens in `src/index.css` `@theme`), and `AGENTS.md` §Reference follows it. This is the KB half of the C4/R7 sync owed by the archived splits change (tasks 9.4); that archive is frozen and not edited retroactively. | SDD stack sync |
| 2026-11-16 | us-013-view-trip-members | Added §15 landed reconciliation: member roster endpoint `GET /api/trips/{id}/members` (session principal, read-only), no migration, Screen 7 app-shell tab content; split `MEMBER_REQUIRED` divergence tracked as F2. No other section changed. | SDD P5 archive |
| 2026-11-16 | us-067-qr-scanner | Added §14 pre-archive landed reconciliation: scanner keeps hash-router + custom fetch + CSS tokens (no React Router / TanStack Query / AntD import), `jsqr` promoted to production dependency, single-source `parseJoinHash` matcher enforcing `#/join/<32-lowercase-hex>` + same-origin per G1 C3, `InAppPage` excludes `'scan'`. Backend impact: none. Will fold into §7 at G3 living-merge. | SDD P4 apply |
