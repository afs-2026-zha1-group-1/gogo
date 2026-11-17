# G1 decision — us-083-085-trip-details

- Gate: G1 (Align)
- 性质：**追记**（retroactive record）。对齐裁决在 P1/P2 期间由用户逐条拍板（R1–R8，2026-11-17 上午），R9 于 2026-11-17 下午修订；正式 Gate 记录按用户「签署并归档」指令于归档前补记入档，不虚构当时的签署时间。
- Inputs:
  - Delta Specs：`specs/trips/spec.md`（3 ADDED + 1 MODIFIED）、`specs/invitations/spec.md`（1 MODIFIED）、`specs/app-shell/spec.md`（1 MODIFIED）
  - 需求条目：`requirement-workspace/requirements/US-083-085.md`（R1–R9 已钉死）
  - DoR：`requirement-workspace/analysis/us-083-085-dor.md`（12 项全 Pass，BLOCKER=0，blocking OQ=0）
  - 夹具：`requirement-workspace/acceptance-test-fixtures.md` §US-083-085（含 R9 分流派生行）
  - AC/DoV：atdd-design.md §二 AT 矩阵（083-1…8/MOD-1/084-1…5/085-1…6+N1/N2/INV-1…5/SHELL-1/2）；openspec validate --strict 0 ERROR（4 个 >500 字符 WARNING 非阻塞）
- Findings:
  - 范围：三合一单 change（R2），同屏同读组合垂直切片；后端零新增；仪表盘生成入口（US-061）/主线确认（US-081）明确范围外。无 scope creep（local-verify V8 Pass）。
  - 歧义：全部由用户裁决闭合——R1 版式权威（看板两张截图）、R3 读真实 confirmed 快照、R4 邀请全屏页、R5 移除清单、R6 数据源优先级、R7 倒计时口径（D-2 时区=设备本地经用户确认）、R8 下一站缺失不伪造、**R9 无方案保留旧版/有方案才显新版（2026-11-17 修订 R6 第 3 条）**。残留 D-1（邀请 extras 不做）/D-3（HH:mm 拼 startDate）为已登记 non-blocking 偏离。
  - 冲突：US-072 已签「查看主线方案」入口 requirement 与内嵌直显冲突 → MODIFIED 取代（有方案内嵌、无方案旧版链接保留，R9 后口径）；与 splits/main-itinerary/members/invitations 既有读契约一致，不改对方 spec。
- Decision: **Pass**
- Conditions + owners: 无（Pass）。non-blocking 残留：D-1/D-2/D-3 已登记于需求条目与 design 残留风险节，owner=Dev，随后续 change 跟踪。
- Approvers: IO=Emily；SA=Lumi（用户 2026-11-17「签署并归档」指令代传，按近期惯例署名）
- Timestamp: 2026-11-17T17:10+08:00（追记时间）