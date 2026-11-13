# Requirement registry

| id | title | status | openspec change | notes |
|---|---|---|---|---|
| REQ-001 | Hello World home page | Archived; G1/G2/G3 signed (Johnson) | `openspec/changes/archive/2026-11-13-req-001-hello-world/` | H2 substituted for SQLite per the 2026-11-13 instruction (OQ-1). OQ-2/OQ-3/OQ-4 were carried as G1 conditions and closed the same day by IO rulings; the JSON and SQLite rulings are delivered by REQ-002, not by editing this archive. DoR BLOCKER = 0, A0 Pass. |
| REQ-002 | JSON greeting contract and SQLite storage | P1 complete (proposal authored) | `openspec/changes/req-002-greeting-json-sqlite/` | IO ruling 2026-11-13: keep Flyway, JSON body `{"message":"Hello World"}`, engine back to SQLite. One MODIFIED requirement in `greeting`. DoR BLOCKER = 0, A0 Pass. |
