# Requirement registry

| id | title | status | openspec change | notes |
|---|---|---|---|---|
| REQ-001 | Hello World home page | Archived; G1/G2/G3 signed (Johnson) | `openspec/changes/archive/2026-11-13-req-001-hello-world/` | H2 substituted for SQLite per the 2026-11-13 instruction (OQ-1). OQ-2/OQ-3/OQ-4 were carried as G1 conditions and closed the same day by IO rulings; the JSON and SQLite rulings are delivered by REQ-002, not by editing this archive. DoR BLOCKER = 0, A0 Pass. |
| REQ-002 | JSON greeting contract and SQLite storage | P4 implemented and locally verified; P5 artifacts authored; G1/G2/G3 NOT RECORDED; archive and push pending | `openspec/changes/req-002-greeting-json-sqlite/` | IO ruling 2026-11-13: keep Flyway, JSON body `{"message":"Hello World"}`, engine back to SQLite. One MODIFIED requirement in `greeting`. DoR BLOCKER = 0, A0 Pass. Local-verify Overall Partial (no CI run for this change, E3 unsigned); 6/6 scenarios and 7/7 reverse checks observed; D16 directory fix found by verification. Tasks 30/33 — open 3.5 push, 3.6 fresh CI confirmation, 5.5 merge-ready. REQ-001's signatures and CI confirmation are not inherited. |
