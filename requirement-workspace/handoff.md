# Handoff — requirement workspace → OpenSpec

- **Workdir path:** `requirement-workspace/` (override if relocated)
- **OpenSpec changes root:** `openspec/changes/`
- **Rule:** Copy or link stabilized requirements into a change package. This
  workdir is never the long-term Living Spec authority (`openspec/specs/`).

| Artifact | Destination | Notes |
|---|---|---|
| `requirements/` entries | `openspec/changes/<id>/` proposal inputs | After `/sdd:pre-spec-req` |
| Ready / analysis packs | change package or archive | Project convention |

## B 拆分主链 handoff（2026-11-15）

- REQ-004~007 → `openspec/changes/req-004-split-planning-chain/proposal.md`
  （G1 评审稿；用户裁决 OQ-4 四 story 同包）。
- 输入证据：`requirements/REQ-004~007.md`、`deep-dive.md` B 链段（⑨–⑫）、
  `analysis/req-004-007-dor.md`（BLOCKER = 0）、`impact-brief.md` B 链段
  （critical blockers = 0）、`acceptance-test-fixtures.md` B 链段、
  `intents/2026-11-15-req-004-007-split-planning.md`。
- A0 Pass；残留 stub `req-004-split-draft-start` 已移除。
- 下一步仅 /sdd:*：G1 评审（显式 `/sdd:g1-decision-record`）→ P2
  `/sdd:delta-craft`；本 handoff 不启动 P2。
- 夹具提交边界已澄清（用户 2026-11-15，impact brief R6 resolved）：B 链权威夹具
  `acceptance-test-fixtures.md` 随 P1 提交；REQ-003 草稿拆至
  `acceptance-test-fixtures.req003-draft.md`（untracked 保留不提交）。
