# Requirement registry

Current B-chain status for REQ-004~007: P2 review corrections prepared, G1
Conditional: IO Emily approved 2026-11-15; SA Leo revised-contract re-review pending. Five
requirements / 34 scenarios include member-only draft GET. Timing entry guards
may read identity/trip/membership; only the snapshot calculator has zero database
I/O. This status supersedes the historical P1 labels below.

| id | title | status | openspec change | notes |
|---|---|---|---|---|
| REQ-001 | Hello World home page | Archived; G1/G2/G3 signed (Johnson) | `openspec/changes/archive/2026-11-13-req-001-hello-world/` | H2 substituted for SQLite per the 2026-11-13 instruction (OQ-1). OQ-2/OQ-3/OQ-4 were carried as G1 conditions and closed the same day by IO rulings; the JSON and SQLite rulings are delivered by REQ-002, not by editing this archive. DoR BLOCKER = 0, A0 Pass. |
| REQ-002 | JSON greeting contract and SQLite storage | P4 implemented and locally verified; P5 artifacts authored; G1/G2/G3 NOT RECORDED; archive and push pending | `openspec/changes/req-002-greeting-json-sqlite/` | IO ruling 2026-11-13: keep Flyway, JSON body `{"message":"Hello World"}`, engine back to SQLite. One MODIFIED requirement in `greeting`. DoR BLOCKER = 0, A0 Pass. Local-verify Overall Partial (no CI run for this change, E3 unsigned); 6/6 scenarios and 7/7 reverse checks observed; D16 directory fix found by verification. Tasks 30/33 — open 3.5 push, 3.6 fresh CI confirmation, 5.5 merge-ready. REQ-001's signatures and CI confirmation are not inherited. |
| REQ-004 | 从已确认主线发起唯一拆分草稿（US-038, issue #17） | P1 完成（proposal G1 评审稿）；待 G1 | `openspec/changes/req-004-split-planning-chain/`（与 REQ-005~007 同包） | 用户 2026-11-15 裁决：夹具自包含、X-Member-Id、一个 B 链 change、REQ-003 遗留保留不提交。技术基准 = 4 表版 tech-stack-plan；OQ-N2 严格 4 表，草稿 = trip.split_draft JSON 文档。 |
| REQ-005 | 选择拆分边界并强制正时间窗口（US-039, issue #18） | P1 完成（proposal G1 评审稿）；待 G1 | 同 REQ-004（B 链 change） | draft_version 任何变更递增（用户裁决）；边界仅主线 stop，scheduled end/start 语义；OQ-N4 成对保存不开放半边界。 |
| REQ-006 | 按分组偏好成对生成分组路线（US-042, issue #19） | P1 完成（proposal G1 评审稿）；待 G1 | 同 REQ-004（B 链 change） | 可替换候选提供者 + MVP 夹具实现（用户裁决）；成对原子 + stale 拒绝；分组存草稿内 JSON（OQ-N5）；分组移动控件可选不实现。 |
| REQ-007 | 校验会合时间窗口（US-043, issue #20） | P2 correction; G1 Conditional | 同 REQ-004（B 链 change） | Explicit snapshot; entry-guard reads allowed, calculator database-free; no result persistence. Confirmation US-049 remains out of scope. |
