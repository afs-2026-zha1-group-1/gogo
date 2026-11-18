# Change summary — us-067-qr-scanner

- Change: `us-067-qr-scanner`（QR-code invitation scanner UI）
- 归档日期：2026-11-18
- 归档位置：`openspec/changes/archive/2026-11-18-us-067-qr-scanner/`

## Intent（要做什么）

给行程邀请加一个"扫码加入"的全屏页面 `#/scan`：用摄像头扫二维码、从相册选图、或手动粘贴邀请链接，识别出 `#/join/<token>` 后交给现有 Join 页处理；并在首页"我的行程"顶栏加一个扫码入口按钮。纯前端为主，复用 REQ-004 邀请预览/接受接口，不改后端契约。

## What shipped（实际交付）

- 前端：`Scanner.tsx` 全屏扫码流（相机预览 + 开始扫描 + 从相册选择 + 链接输入 + 错误重试），`scan.ts` 的 `parseJoinHash` 单一匹配器（32 位小写 hex token、同源校验、跨源拒绝），`useCamera` 清理 hook + rAF jsQR 解码，`app.css` 扫码样式，`jsqr` 由 devDep 转 dep，`InAppPage` 排除 `scan`；首页 appbar `.iconbtn` 扫码入口（AC S1–S2 已收编进本 change）。
- 2026-11-17 用户裁决修订：扫码器 × 关闭**恒回 `#/`**（取代 restore-origin）；已登录且已是成员者扫码/开链**直接落「已在队伍中」提示页**（组织者专属文案，参与者文案不变）；邀请预览对已登录观察者增量返回 `tripId` / `viewerMember`。记录见 design D11 / tasks group 11 / atdd S-5–S-7 / e2e RV-1–RV-4。
- Living Spec（2026-11-18 living-merge）：`invitations` +1 ADDED「QR-code invitation scanner」/ 11 scenarios；`app-shell` MODIFIED「Mobile shell frame」重基线到当前 Living 的 5 个共有场景正文 + 追加 3 个扫码场景 = 8（纯追加，未回退后续仪表盘/偏好/登录故事的场景）。

## Verify highlights（验证要点）

- `openspec validate --strict`：0 ERROR，仅 1 个非阻塞"需求正文偏长"WARNING。
- E2E `docs/feedback/e2e-us-067.md`：链接/跨源/错误恢复/shell 不变/后端无影响等行 Pass；修订行 RV-1–RV-4 Pass（含用户人工复测 + `InvitationApiTest` 364/364）。相机依赖行（I-2/I-3/I-5/I-7、I-10 移动端）在 headless 环境为 Partial，代码路径已验证，真机摄像头收口未执行（G2 记为人工接受的残余）。
- CI（PR #147）：Backend tests / Browser acceptance / Frontend build 三作业全绿；合并提交 `59179ed`。
- 缺口：无正式 `local-verify-report.md`（本 change 历史上 P4 完成后直接合入，未走 local-verify 技能）；G2 以 E2E + CI + G1 作证据并由 VL 知情接受。

## Residual risks（残余风险，非门条件）

- 相机/相册真机路径未在自动化环境实测（headless 限制），以代码验证 + 手动链接路径覆盖；真机收口为可选跟进。
- spec 正文长度 WARNING（风格类，非阻塞）。
- G2/G3 为归档后补录（代码早已合入 main），决策记录于 2026-11-18 补齐。

## Links

- G1：`g1-decision.md`（SA Lumi + IO Leo，2026-11-16 Pass）
- G2：`g2-decision.md`（VL Elian Jiang，2026-11-18 Pass）
- G3：`g3-decision.md`（SA Lumi，2026-11-18 Pass）
- E2E：`docs/feedback/e2e-us-067.md`
- 合入：PR #147 → `origin/main` `59179ed`
- KB 更新：`kb-lint.sh` → SKIP（教学基线未配置，非阻塞）
