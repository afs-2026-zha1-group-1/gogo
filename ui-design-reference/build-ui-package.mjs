// 构建单文件 UI 设计包：把原型 + 设计令牌 + 组件样例 + 18 节点规格 + 截图(base64) 合并为一个自包含 HTML。
// 运行: node ui-design-reference/build-ui-package.mjs  →  产出 ui-design-reference/gogo-ui-design-package.html
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const proto = readFileSync(join(here, 'gogo-mvp-prototype.html'), 'utf8');
const rootCss = (proto.match(/:root\{[\s\S]*?\}/) || [''])[0];
const shots = join(here, 'screenshots');
const IMAGES = {};
for (const f of readdirSync(shots)) {
  if (f.endsWith('.png')) IMAGES[f.replace('.png', '')] = 'data:image/png;base64,' + readFileSync(join(shots, f)).toString('base64');
}
const srcdoc = proto.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const NODES = [
  { n: 1, cat: 'overview', title: '仪表盘 Dashboard', stories: ['Dashboard 首页'], img: 'screen-01-dashboard', purpose: '一眼看到旅行到哪一步、下一步做什么，并快捷跳转任意功能。', layout: ['hero 青绿渐变大卡：日期/行程名/目的地/起终点/人数', 'journey 七节点进度（建局→邀请→偏好→主线→分队→会合→完成），可点跳屏', 'stat-grid 2×2：成员/就绪/主线已确认/分队待确认', '下一步引导卡 + quick 两列 8 快捷入口 + tabbar 四 tab'], interact: ['点进度节点/统计引导/快捷入口/tab 跳屏', '当前节点高亮「分队」'], rules: ['把就绪门控、主线已确认、分队待确认浓缩为可读信号', '始终给出唯一下一步'] },
  { n: 2, cat: 'setup', title: '创建行程', stories: ['US-001'], img: 'screen-02-create', purpose: '建立共享旅行空间：名称/目的地/有效日期/起终点。', layout: ['单列表单 field：名称、目的地(带图标)、日期两列、起终点两列', '底部灰卡说明创建者=组织者', 'actionbar 主按钮'], interact: ['createTrip() 校验结束≥开始', '违反时字段 .invalid 红描边+err-msg+toast', '通过 toast 并跳详情'], rules: ['有效日期约束做成字段级即时错误'] },
  { n: 3, cat: 'setup', title: '行程详情', stories: ['US-002'], img: 'screen-03-detail', purpose: '全员查看已保存的行程基本信息。', layout: ['复用 hero 大卡', 'valid 只读四行：日期/出发地/返程地/组织者', '同行成员 avstack + 查看按钮', '邀请更多朋友 ghost 按钮'], interact: ['查看→成员、邀请→分享、编辑→创建'], rules: ['全员可见，仅公开信息不含私有偏好'] },
  { n: 4, cat: 'invite', title: '分享邀请', stories: ['US-008'], img: 'screen-04-invite', purpose: '组织者获取并分享邀请链接/二维码。', layout: ['pill ok 生效中', 'qr 132px 伪二维码 + 加入时机/去重小字', 'linkbox 等宽链接 + 复制', '微信/复制两列', '有效期 switch-row + 撤销 danger 按钮'], interact: ['copyInvite() 写剪贴板+toast', '撤销→失效页'], rules: ['链接可分享/可撤销/有有效期', '主线确认前加入、每人仅一次'] },
  { n: 5, cat: 'invite', title: '加入行程', stories: ['US-010'], img: 'screen-05-join', purpose: '被邀请者接受邀请、以昵称身份加入一次。', layout: ['邀请卡：组织者头像+行程名+公开信息', 'joinForm：昵称输入+隐私说明+接受按钮', 'joinDone：成功环+填偏好/看仪表盘'], interact: ['joinTrip() 昵称空则提示', '成功隐藏表单显示成功态+toast', '引导去填偏好'], rules: ['确认前可加入/仅一次/昵称即身份', '接受前仅公开信息'] },
  { n: 6, cat: 'invite', title: '邀请失效', stories: ['US-012'], img: 'screen-06-invalid', purpose: '告知链接不可用且不泄露任何行程隐私。', layout: ['红色 checkring(alert)+失效文案+原因', '隐私保护灰卡', '提醒重发 dark + 返回 ghost'], interact: ['提醒 toast 演示', '返回→仪表盘'], rules: ['失效但不泄密：整屏无具体行程数据'] },
  { n: 7, cat: 'members', title: '成员与就绪', stories: ['US-013'], img: 'screen-07-members', purpose: '看谁已加入、谁是组织者、谁已就绪。', layout: ['就绪环 SVG 4/4 + 可生成主线', 'member-row×4：头像/名字/组织者 pill/摘要/状态 pill', '小美=灰色无偏好 pill', '说明卡 + 生成主线按钮'], interact: ['加号→邀请', '生成→生成主线'], rules: ['只采用就绪成员', '无偏好=显式就绪，沉默≠同意'] },
  { n: 8, cat: 'prefs', title: '我的偏好', stories: ['US-019', 'US-020', 'US-024', 'US-026', 'US-027'], img: 'screen-08-preferences', purpose: '填兴趣/必做项/预算或显式无偏好，提交标记就绪。', layout: ['noPrefSw 开关 + noPrefNote 青绿卡', 'interestChips 10 预设 emoji 标签(不重复)', 'mustdoList + 折叠表单(名称+地点/时间二选一)+增删改', '预算卡：金额/币种/软硬 seg', 'readyPill + 提交按钮'], interact: ['toggleNoPref 切换字段与文案', 'addMustdo 校验名称+地点或时间', 'submitPref 变绿就绪+跳成员'], rules: ['可选预算/显式无偏好/提交即就绪', '硬上限严格过滤、软上限尽量'] },
  { n: 9, cat: 'main', title: '生成主线', stories: ['US-031'], img: 'screen-09-generate', purpose: '组织者基于就绪成员偏好一键生成带时间主线草稿。', layout: ['采用成员卡 avstack+4/4', '生成输入卡：共同兴趣/必做汇总/约束预算', '生成规则编号 1/2/3 可解释', 'genProgress：logo+进度条+三条逐项打勾'], interact: ['generatePlan() 进度 8→38→70→100%', '三条校验依次 pass', '约 2s 自动跳审阅'], rules: ['仅组织者、仅就绪成员', '生成过程可解释非黑盒'] },
  { n: 10, cat: 'main', title: '主线审阅与确认', stories: ['US-037'], img: 'screen-10-review', purpose: '审阅主线草稿，校验通过后才允许确认。', layout: ['planStatus pill 草稿v1→已确认', '过期提示卡', 'Day1 timeline 六活动 + 13:30 split-cta 虚线可分队卡', '确认前校验 pv1-3', 'actionbar 重新生成+确认(初始 disabled)'], interact: ['进入跑 validatePlan()', '三条 pass 后确认解禁', 'confirmPlan 变绿+跳发起分队'], rules: ['校验通过才能确认', '不确认过期草稿'] },
  { n: 11, cat: 'split', title: '发起分队草稿', stories: ['US-038'], img: 'screen-11-split-start', purpose: '从已确认主线发起本次行程唯一一次分队。', layout: ['前提卡：主线已确认', 'forkjoin SVG：主线→蓝A/橙B→绿会合', '文案「谈不拢？分头玩，到点会合」', '规则卡：仅一次/出发前或行程中'], interact: ['发起→边界', '返回→审阅'], rules: ['单次、从已确认主线', '出发前或行程中均可'] },
  { n: 12, cat: 'split', title: '选择分队边界', stories: ['US-039'], img: 'screen-12-boundary', purpose: '选分头与会合节点，确定固定地点与正时间窗。', layout: ['stepbar 1/4', 'depChips/reuChips 单选 chip', '时间窗卡：起点/截止/连线/winDur pill', 'help 截止为硬性时间'], interact: ['bindBoundary 随选随算窗口', '窗口≤0 pill 变红'], rules: ['固定地点+正时间窗+明确截止'] },
  { n: 13, cat: 'split', title: '分组与生成路线', stories: ['US-042'], img: 'screen-13-routes', purpose: '自动按偏好分两组、可手动调整，再为每组各生成一条路线。', layout: ['stepbar 2/4 + 自动分组提示', 'two 两列分组卡(A蓝/B橙+成员 chip)', '生成按钮→routesResult 两条 route 卡', 'route：双色头+mini 时间行(路程/缓冲斜体)+rfoot 会合'], interact: ['点成员 chip 在 A/B 互换', 'genRoutes 显示路线', '下一步→校验'], rules: ['每组一条路线', '用该组偏好+固定边界'] },
  { n: 14, cat: 'split', title: '会合时间窗校验', stories: ['US-043'], img: 'screen-14-window-check', purpose: '校验两条路线活动+全部路程+缓冲是否装进时间窗。', layout: ['stepbar 3/4 + 210分钟窗+图例', 'A/B 各卡：堆叠条三段+三行校验+210≤210 pill+抵达时间', '底部绿卡：通过、基于快照不写库'], interact: ['只读校验展示', '下一步→确认'], rules: ['活动+路程+缓冲≤窗口', '不写数据库'] },
  { n: 15, cat: 'split', title: '确认 / 取消分队', stories: ['US-049', 'US-050'], img: 'screen-15-confirm', purpose: '组织者一次性确认路线对+分组(再校验后锁边界)，或取消未确认草稿。', layout: ['stepbar 4/4 + 锁定边界卡(起迄+A/B avstack)', 'splitActions：说明+确认+取消+help', 'splitReval 三条再校验', 'splitDone 成功环+进入行程中'], interact: ['confirmSplit 跑 rv1-3→成功态', 'cancelSplit toast+回审阅不改主线'], rules: ['路线对+分组一起确认、服务端再校验、锁边界', '可取消、不改主线'] },
  { n: 16, cat: 'during', title: '分队进行中 · 我的路线', stories: ['执行视图'], img: 'screen-16-during', purpose: '分队生效后看自己路线的实时进度与会合倒计时。', layout: ['蓝色渐变 appbar + live 进行中', '倒计时卡 cd16 + cdBar + 分头/会合', 'seg 三段：我的/另一条/会合导航', 'viewMine 时间轴 / viewOther RouteB+隐私卡', 'tabbar'], interact: ['tick 每秒递减', '分段切换我的/另一条', '会合导航→导航'], rules: ['只给我的进度+对方计划', '不追踪他人位置'] },
  { n: 17, cat: 'during', title: '会合导航', stories: ['US-054'], img: 'screen-17-navigation', purpose: '打开外部地图导航去会合点，不追踪其他成员。', layout: ['mapcard SVG：你的路线虚线+起点你+终点灯塔 pin', '会合点卡：checkring+截止+距离/步行/剩余', 'openMap dark 按钮', '隐私卡 + 我已到达'], interact: ['openMap toast 演示外部地图', '到达→完成'], rules: ['外部地图/不追踪/无后端', '复用已加载会合详情'] },
  { n: 18, cat: 'done', title: '完成行程', stories: ['US-058'], img: 'screen-18-complete', purpose: '组织者在分队解决后标记行程完成并归档。', layout: ['confetti 彩带层', 'completeIdle：成功环+分队已解决绿卡+旅程回顾+完成按钮', 'completeDone：星形环+归档卡+返回'], interact: ['completeTrip 切成功态+48 片彩带+toast'], rules: ['仅组织者', '分队解决后才能完成'] },
];
const CATS = [['all', '全部'], ['overview', '总览'], ['setup', '行程创建'], ['invite', '邀请加入'], ['members', '成员就绪'], ['prefs', '个人偏好'], ['main', '主线'], ['split', '分队'], ['during', '行程中'], ['done', '完成']];
const TOKENS = [
  ['--bg', '#f4f3ef', '页面底'], ['--surface', '#ffffff', '卡片面'], ['--surface-2', '#faf9f7', '次级面'], ['--surface-3', '#f5f4f1', '输入底'],
  ['--ink', '#1c1917', '主文字'], ['--ink-2', '#57534e', '次文字'], ['--ink-3', '#a8a29e', '弱提示'], ['--line', '#e9e7e2', '描边'],
  ['--brand', '#0d9488', '品牌主色'], ['--brand-2', '#06b6d4', '品牌渐变'], ['--brand-ink', '#0f766e', '品牌文字'], ['--brand-soft', '#ccfbf1', '品牌浅底'],
  ['--a', '#2563eb', '路线A 蓝'], ['--a-soft', '#e6efff', 'A 浅底'], ['--b', '#ea580c', '路线B 橙'], ['--b-soft', '#fff0e2', 'B 浅底'],
  ['--ok', '#059669', '成功'], ['--warn', '#d97706', '警告'], ['--err', '#dc2626', '危险'], ['--ok-soft', '#d7f5e6', '成功浅底'],
];

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>GoGo · UI 设计包（单文件开发参考）</title>
<style>
:root{--bg:#f4f3ef;--surface:#fff;--surface-2:#faf9f7;--surface-3:#f5f4f1;--ink:#1c1917;--ink-2:#57534e;--ink-3:#a8a29e;--line:#e9e7e2;--line-2:#f0eee9;--brand:#0d9488;--brand-2:#06b6d4;--brand-ink:#0f766e;--brand-soft:#ccfbf1;--a:#2563eb;--a-soft:#e6efff;--b:#ea580c;--b-soft:#fff0e2;--ok:#059669;--ok-soft:#d7f5e6;--warn:#d97706;--warn-soft:#fef3c7;--err:#dc2626;--err-soft:#fee2e2;--r:14px;--r-lg:20px;--sh-1:0 1px 2px rgba(28,25,23,.05),0 1px 3px rgba(28,25,23,.04);--sh-2:0 4px 14px rgba(28,25,23,.06),0 2px 6px rgba(28,25,23,.04);--font:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--font);background:var(--bg);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-track{background:var(--surface-3)}::-webkit-scrollbar-thumb{background:linear-gradient(var(--brand),var(--brand-2));border-radius:99px;border:2px solid var(--surface-3)}::-webkit-scrollbar-thumb:hover{background:var(--brand-ink)}
.wrap{max-width:1180px;margin:0 auto;padding:0 22px}
header.top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.9);backdrop-filter:blur(14px);border-bottom:1px solid var(--line-2)}
header.top .in{display:flex;align-items:center;gap:14px;padding:12px 22px;max-width:1180px;margin:0 auto}
.logo{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--brand),var(--brand-2));display:grid;place-items:center;color:#fff;font-weight:800;flex:none}
header.top h1{font-size:15px;font-weight:750}
header.top .sub{font-size:11px;color:var(--ink-3)}
nav.links{margin-left:auto;display:flex;gap:4px;flex-wrap:wrap}
nav.links a{font-size:12.5px;font-weight:600;color:var(--ink-2);text-decoration:none;padding:7px 11px;border-radius:99px;transition:.15s}
nav.links a:hover{background:var(--surface-3);color:var(--ink)}
nav.links a.on{background:var(--brand-soft);color:var(--brand-ink)}
.hero{position:relative;overflow:hidden;border-radius:0 0 32px 32px;background:linear-gradient(135deg,#0f766e,#0891b2 55%,#0e7490);color:#fff;padding:56px 0 46px;margin-bottom:34px}
.hero::after{content:"";position:absolute;right:-80px;top:-80px;width:340px;height:340px;border-radius:50%;background:rgba(255,255,255,.08)}
.hero .kicker{font-size:12px;font-weight:700;letter-spacing:1px;opacity:.85;text-transform:uppercase}
.hero h2{font-size:34px;font-weight:800;letter-spacing:-.6px;margin:10px 0 8px}
.hero p{max-width:640px;font-size:14px;opacity:.92}
.hero .stats{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}
.hero .st{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:10px 16px;backdrop-filter:blur(6px)}
.hero .st b{display:block;font-size:20px;font-weight:800}
.hero .st span{font-size:11px;opacity:.85}
section{margin:0 0 46px;scroll-margin-top:76px}
.sec-h{display:flex;align-items:baseline;gap:12px;margin-bottom:6px}
.sec-h .no{font-size:12px;font-weight:800;color:var(--brand);background:var(--brand-soft);border-radius:8px;padding:3px 9px}
.sec-h h3{font-size:22px;font-weight:780;letter-spacing:-.3px}
.sec-lead{font-size:13px;color:var(--ink-2);margin-bottom:18px;max-width:760px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);box-shadow:var(--sh-1)}
.pad{padding:18px}
.grid{display:grid;gap:14px}
.swatches{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.sw{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:var(--surface);cursor:pointer;transition:.15s;box-shadow:var(--sh-1)}
.sw:hover{transform:translateY(-2px);box-shadow:var(--sh-2)}
.sw .chip{height:52px}
.sw .meta{padding:9px 11px}
.sw .meta b{display:block;font-size:12px;font-weight:700}
.sw .meta code{font-size:11px;color:var(--ink-3)}
.sw .meta span{display:block;font-size:10.5px;color:var(--ink-2)}
pre.code{background:#1c1917;color:#e7e5e4;border-radius:var(--r);padding:16px;font-size:12px;line-height:1.6;overflow:auto;font-family:ui-monospace,Menlo,Consolas,monospace;max-height:320px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;font-size:13px;font-weight:650;padding:10px 16px;border-radius:12px;border:1px solid transparent;cursor:pointer;transition:.16s}
.btn:active{transform:scale(.98)}
.btn-primary{background:linear-gradient(135deg,var(--brand),#0891b2);color:#fff}
.btn-ghost{background:var(--surface);border-color:var(--line);color:var(--ink-2)}
.btn-ghost:hover{background:var(--surface-3);color:var(--ink)}
.btn-dark{background:var(--ink);color:#fff}
.btn-a{background:linear-gradient(135deg,var(--a),#1d4ed8);color:#fff}
.btn-b{background:linear-gradient(135deg,var(--b),#c2410c);color:#fff}
.btn-danger{background:var(--surface);border-color:#fecaca;color:var(--err)}
.btn.sm{padding:7px 12px;font-size:12px;border-radius:10px}
.pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:650;padding:4px 10px;border-radius:99px;background:var(--surface-3);color:var(--ink-2);border:1px solid var(--line)}
.pill.ok{background:var(--ok-soft);color:#047857;border-color:#a7f3d0}.pill.warn{background:var(--warn-soft);color:#b45309;border-color:#fde68a}.pill.err{background:var(--err-soft);color:#b91c1c;border-color:#fecaca}.pill.a{background:var(--a-soft);color:#1d4ed8;border-color:#c7dbff}.pill.b{background:var(--b-soft);color:#c2410c;border-color:#ffd9b8}.pill.brand{background:var(--brand-soft);color:var(--brand-ink);border-color:#99f6e4}
.chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:7px 12px;border-radius:99px;border:1px solid var(--line);background:var(--surface);color:var(--ink-2);cursor:pointer;transition:.15s;font-family:inherit}
.chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.av{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:12.5px;font-weight:700;color:#fff;flex:none;box-shadow:0 0 0 2px #fff}
.av-teal{background:linear-gradient(135deg,#14b8a6,#0d9488)}.av-blue{background:linear-gradient(135deg,#60a5fa,#2563eb)}.av-amber{background:linear-gradient(135deg,#fbbf24,#ea580c)}.av-rose{background:linear-gradient(135deg,#fb7185,#e11d48)}
.avstack{display:flex}.avstack .av+.av{margin-left:-10px}
.switch{position:relative;width:44px;height:26px;border-radius:99px;background:var(--line);border:0;cursor:pointer;transition:.2s;flex:none}
.switch::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s}
.switch.on{background:var(--brand)}.switch.on::after{transform:translateX(18px)}
.seg{display:inline-flex;background:var(--surface-3);border:1px solid var(--line);border-radius:12px;padding:3px;gap:3px}
.seg button{font-family:inherit;font-size:12px;font-weight:650;padding:7px 12px;border:0;background:transparent;color:var(--ink-2);border-radius:9px;cursor:pointer}
.seg button.on{background:var(--surface);color:var(--ink);box-shadow:var(--sh-1)}
.progress{height:7px;border-radius:99px;background:var(--line-2);overflow:hidden}.progress>i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--brand),var(--brand-2))}
.cmp-grid{grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.cmp{padding:16px}
.cmp h4{font-size:13px;font-weight:700;margin-bottom:4px}
.cmp .desc{font-size:11.5px;color:var(--ink-3);margin-bottom:12px}
.cmp .row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cmp code.cls{font-size:10.5px;color:var(--brand-ink);background:var(--brand-soft);border-radius:6px;padding:2px 7px;margin-top:10px;display:inline-block}
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
.filters input{font-family:inherit;font-size:13px;padding:9px 13px;border:1px solid var(--line);border-radius:12px;background:var(--surface);outline:none;min-width:200px}
.filters input:focus{border-color:var(--brand);box-shadow:0 0 0 3px var(--brand-soft)}
.node{display:grid;grid-template-columns:300px 1fr;gap:0;overflow:hidden;margin-bottom:16px}
.node .shot{background:var(--surface-3);border-right:1px solid var(--line);display:grid;place-items:center;padding:14px}
.node .shot img{width:100%;max-width:270px;border-radius:22px;box-shadow:var(--sh-2);display:block}
.node .spec{padding:18px}
.node .nh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.node .nh .idx{width:26px;height:26px;border-radius:8px;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:800;flex:none}
.node .nh h4{font-size:16px;font-weight:750}
.node .purpose{font-size:13px;color:var(--ink-2);margin:6px 0 12px}
.node h5{font-size:11px;font-weight:800;color:var(--ink-3);letter-spacing:.6px;text-transform:uppercase;margin:12px 0 6px}
.node ul{list-style:none}
.node li{font-size:12.5px;color:var(--ink-2);padding:3px 0 3px 16px;position:relative}
.node li::before{content:"";position:absolute;left:2px;top:10px;width:6px;height:6px;border-radius:2px;background:var(--brand)}
.node li.rule::before{background:var(--ok)}
.node .open{margin-top:14px}
.proto-frame{width:100%;height:900px;border:1px solid var(--line);border-radius:var(--r-lg);background:var(--surface-2);box-shadow:var(--sh-2)}
.proto-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
.proto-bar select{font-family:inherit;font-size:13px;padding:9px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);background:var(--ink);color:#fff;font-size:13px;font-weight:600;padding:10px 18px;border-radius:99px;opacity:0;transition:.25s;z-index:99;pointer-events:none;box-shadow:var(--sh-2)}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
footer{border-top:1px solid var(--line-2);padding:26px 0 40px;color:var(--ink-3);font-size:12px}
.two-col{grid-template-columns:1fr 1fr}
@media(max-width:900px){.node{grid-template-columns:1fr}.node .shot{border-right:0;border-bottom:1px solid var(--line)}.two-col{grid-template-columns:1fr}nav.links{display:none}.hero h2{font-size:26px}}
</style>
</head>
<body>
<header class="top"><div class="in">
  <div class="logo">G</div>
  <div><h1>GoGo · UI 设计包</h1><div class="sub">单文件开发参考 · 共享旅行 MVP</div></div>
  <nav class="links" id="nav">
    <a href="#tokens">设计令牌</a><a href="#components">组件库</a><a href="#nodes">界面节点</a><a href="#motion">交互状态</a><a href="#data">演示数据</a><a href="#live">Live 原型</a><a href="#port">移植</a>
  </nav>
</div></header>

<div class="hero"><div class="wrap">
  <div class="kicker">Frontend Design Handoff · Single File</div>
  <h2>GoGo 共享旅行 · UI 设计包</h2>
  <p>把设计令牌、组件库、18 个界面节点的规格与截图、以及完整可交互原型打包进这一个文件。离线双击即开，供后续开发直接参考与移植。</p>
  <div class="stats">
    <div class="st"><b>18</b><span>界面节点</span></div>
    <div class="st"><b>21</b><span>覆盖 story</span></div>
    <div class="st"><b>20</b><span>核心色彩令牌</span></div>
    <div class="st"><b>40</b><span>内联 SVG 图标</span></div>
    <div class="st"><b>0</b><span>外部依赖</span></div>
  </div>
</div></div>

<div class="wrap">
<section id="tokens">
  <div class="sec-h"><span class="no">01</span><h3>设计令牌</h3></div>
  <p class="sec-lead">海洋青绿做品牌主色，蓝/橙区分两条分队路线，绿/琥珀/红只做语义状态。点击色卡复制色值；下方可复制完整 :root 与 Tailwind 映射。</p>
  <div class="grid swatches" id="swatches"></div>
  <div class="grid two-col" style="margin-top:16px">
    <div class="card pad"><h4 style="font-size:13px;font-weight:700;margin-bottom:10px">完整 :root（点击复制）</h4><pre class="code" id="rootCss"></pre><button class="btn btn-ghost sm" style="margin-top:10px" onclick="copyText(ROOT_CSS,'已复制 :root CSS')">复制 CSS 变量</button></div>
    <div class="card pad"><h4 style="font-size:13px;font-weight:700;margin-bottom:10px">Tailwind theme 映射（点击复制）</h4><pre class="code" id="twCss"></pre><button class="btn btn-ghost sm" style="margin-top:10px" onclick="copyText(TW_CSS,'已复制 Tailwind 映射')">复制 Tailwind 映射</button></div>
  </div>
  <div class="grid two-col" style="margin-top:16px">
    <div class="card pad"><h4 style="font-size:13px;font-weight:700;margin-bottom:10px">圆角 / 阴影 / 字体</h4>
      <div class="row" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <span style="width:44px;height:44px;background:var(--brand-soft);border:1px solid var(--line);border-radius:10px"></span>
        <span style="width:44px;height:44px;background:var(--brand-soft);border:1px solid var(--line);border-radius:14px"></span>
        <span style="width:44px;height:44px;background:var(--brand-soft);border:1px solid var(--line);border-radius:20px"></span>
        <span style="width:44px;height:44px;background:var(--brand-soft);border:1px solid var(--line);border-radius:26px"></span>
        <span style="width:44px;height:44px;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--sh-1)"></span>
        <span style="width:44px;height:44px;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--sh-2)"></span>
      </div>
      <p style="font-size:12px;color:var(--ink-2);margin-top:12px">圆角 10/14/20/26；阴影三级 sh-1/sh-2/sh-3；字体系统栈 + PingFang SC / Microsoft YaHei；数字用 tabular-nums 等宽。</p>
    </div>
    <div class="card pad"><h4 style="font-size:13px;font-weight:700;margin-bottom:10px">字号层级</h4>
      <div style="font-size:23px;font-weight:780;letter-spacing:-.4px">标题 23 / 780</div>
      <div style="font-size:16px;font-weight:700;margin-top:6px">屏标题 16 / 700</div>
      <div style="font-size:14px;font-weight:650;margin-top:6px">正文 14 / 650</div>
      <div style="font-size:12.5px;color:var(--ink-2);margin-top:6px">说明 12.5 / 400</div>
      <div style="font-size:11px;color:var(--ink-3);margin-top:6px">弱提示 11 / 400</div>
    </div>
  </div>
</section>

<section id="components">
  <div class="sec-h"><span class="no">02</span><h3>组件库（可交互样例）</h3></div>
  <p class="sec-lead">与原型同一套视觉语言。开关 / 分段 / 标签可直接点按感受状态；每个样例附原型中的 class 名，便于移植时对应。</p>
  <div class="grid cmp-grid">
    <div class="card cmp"><h4>按钮 Button</h4><div class="desc">主操作渐变青绿；路线 A/B 用蓝/橙；危险用红描边。</div><div class="row"><button class="btn btn-primary sm">主操作</button><button class="btn btn-dark sm">深色</button><button class="btn btn-ghost sm">幽灵</button><button class="btn btn-a sm">A</button><button class="btn btn-b sm">B</button><button class="btn btn-danger sm">危险</button></div><code class="cls">.btn .btn-primary / -dark / -ghost / -a / -b / -danger</code></div>
    <div class="card cmp"><h4>状态徽章 Pill</h4><div class="desc">绿=通过/就绪，橙=待办/草稿，红=错误/失效，蓝橙=路线。</div><div class="row"><span class="pill ok">就绪</span><span class="pill warn">草稿</span><span class="pill err">失效</span><span class="pill a">Route A</span><span class="pill b">Route B</span><span class="pill brand">组织者</span></div><code class="cls">.pill .ok / .warn / .err / .a / .b / .brand</code></div>
    <div class="card cmp"><h4>可选标签 Chip</h4><div class="desc">点击切换选中（反色）。用于兴趣 / 节点 / 分组成员。</div><div class="row" id="cmpChips"><button class="chip on">🌊 水上</button><button class="chip">📷 摄影</button><button class="chip">☕ 咖啡</button></div><code class="cls">.chip (.on)</code></div>
    <div class="card cmp"><h4>头像 Avatar</h4><div class="desc">四色区分成员；叠放表示小组。</div><div class="row"><div class="avstack"><div class="av av-teal">明</div><div class="av av-blue">强</div><div class="av av-amber">红</div><div class="av av-rose">美</div></div></div><code class="cls">.av .av-teal/-blue/-amber/-rose · .avstack</code></div>
    <div class="card cmp"><h4>开关 Switch</h4><div class="desc">点击切换。用于「无偏好」等显式选择。</div><div class="row"><button class="switch" id="cmpSw" onclick="this.classList.toggle('on')"></button><span style="font-size:12px;color:var(--ink-2)">我没有特别偏好</span></div><code class="cls">.switch (.on)</code></div>
    <div class="card cmp"><h4>分段 Segmented</h4><div class="desc">点击切换。用于软/硬上限、我的/另一条路线。</div><div class="row"><div class="seg" id="cmpSeg"><button class="on">软上限</button><button>硬上限</button></div></div><code class="cls">.seg button (.on)</code></div>
    <div class="card cmp"><h4>进度 Progress</h4><div class="desc">生成 / 倒计时进度条，宽度缓动。</div><div class="row" style="width:100%"><div class="progress" style="flex:1"><i style="width:64%"></i></div></div><code class="cls">.progress &gt; i</code></div>
    <div class="card cmp"><h4>校验行 Valid</h4><div class="desc">三态：等待 / 通过 / 失败，图标+主副文案。</div><div class="row"><span class="pill ok">✓ 通过</span><span class="pill">… 等待</span><span class="pill err">✕ 失败</span></div><code class="cls">.valid-item .pass/.fail/.warn</code></div>
  </div>
</section>

<section id="nodes">
  <div class="sec-h"><span class="no">03</span><h3>界面节点（18 屏规格 + 截图）</h3></div>
  <p class="sec-lead">每屏给出对应 story、截图、用途、布局组件、状态交互与业务规则。可按分类筛选或搜索；点「在 Live 原型打开」跳到下方可交互原型对应屏。</p>
  <div class="filters" id="filters"></div>
  <div id="nodeList"></div>
</section>

<section id="motion">
  <div class="sec-h"><span class="no">04</span><h3>交互与全局状态</h3></div>
  <div class="grid two-col">
    <div class="card pad"><h4 style="font-size:13px;font-weight:700;margin-bottom:8px">导航与切屏</h4><ul style="list-style:none;font-size:12.5px;color:var(--ink-2)"><li>· go(n) 统一切屏 + 导航高亮 + 滚动归零 + 重置进入屏状态</li><li>· 键盘 ← → 翻屏、1–9 直达前 9 屏</li><li>· 屏幕骨架：appbar / body / actionbar 或 tabbar；分队加 stepbar 4 段</li></ul></div>
    <div class="card pad"><h4 style="font-size:13px;font-weight:700;margin-bottom:8px">反馈与动效</h4><ul style="list-style:none;font-size:12.5px;color:var(--ink-2)"><li>· 切屏 screenIn 0.38s 位移淡入；成功环 pop 弹性</li><li>· 校验分步 setTimeout 把 wait→pass，配合进度条</li><li>· 倒计时 tick 每秒；完成 confetti 48 片；操作 toast</li><li>· live 圆点 pulse 扩散；进度条宽度 0.6s 缓动</li></ul></div>
    <div class="card pad"><h4 style="font-size:13px;font-weight:700;margin-bottom:8px">隐私一致表达</h4><ul style="list-style:none;font-size:12.5px;color:var(--ink-2)"><li>· 失效页不泄露行程私有信息</li><li>· 进行中只给计划路线，不追踪实时位置</li><li>· 导航只画「你→会合点」，无他人坐标</li><li>· 三处统一灰卡 + shield 图标</li></ul></div>
    <div class="card pad"><h4 style="font-size:13px;font-weight:700;margin-bottom:8px">门控可视化</h4><ul style="list-style:none;font-size:12.5px;color:var(--ink-2)"><li>· 主线确认按钮：校验通过才解禁</li><li>· 分队确认：服务端再校验后锁边界</li><li>· 完成行程：分队解决后才可标记</li><li>· 就绪门控：只采用就绪成员偏好</li></ul></div>
  </div>
</section>

<section id="data">
  <div class="sec-h"><span class="no">05</span><h3>演示数据设定</h3></div>
  <div class="card pad"><p style="font-size:13px;color:var(--ink-2)">行程「周末海边游」· 青岛 · 黄金海岸 · 2026-11-14~15 · 青岛站→青岛北站 · 4 成员：小明（组织者/teal/水上·摄影·潜水/¥1200 软）、阿强（blue/水上·冒险/必做潜水）、小红（amber/咖啡·美食·慢游/¥600 硬）、小美（rose/显式无偏好）。主线 6 活动；分队窗口 13:30 渔人码头→17:00 海崖灯塔（210 分钟）；Route A = 潜水90+摩托艇60+路程40+缓冲20；Route B = 咖啡60+手作60+拍照40+路程35+缓冲15。</p></div>
</section>

<section id="live">
  <div class="sec-h"><span class="no">06</span><h3>Live 可交互原型</h3></div>
  <p class="sec-lead">下方内嵌完整原型（同源 iframe），所有按钮/表单/校验/动画真实可点。可用下拉或节点卡片跳转任意屏；也可导出为独立 .html 文件。</p>
  <div class="proto-bar">
    <select id="jump"></select>
    <button class="btn btn-primary sm" onclick="jumpTo(+document.getElementById('jump').value)">跳转</button>
    <button class="btn btn-ghost sm" onclick="exportProto()">导出独立原型 .html</button>
    <span class="pill brand">离线 · 零依赖</span>
  </div>
  <iframe class="proto-frame" id="proto" title="GoGo 可交互原型" srcdoc="__SRCDOC__"></iframe>
</section>

<section id="port">
  <div class="sec-h"><span class="no">07</span><h3>移植指南</h3></div>
  <div class="card pad"><ul style="list-style:none;font-size:13px;color:var(--ink-2)">
    <li style="padding:4px 0">· 目标栈：React + Vite + shadcn/ui + Tailwind（见 tech-stack.md）。</li>
    <li style="padding:4px 0">· 把 :root 色彩变量映射为 Tailwind theme（上方可复制）。</li>
    <li style="padding:4px 0">· 18 个 .screen 拆为路由/组件；valid-item / route / timeline / chip 对应 shadcn 组件组合。</li>
    <li style="padding:4px 0">· 演示数据替换为 OpenAPI 契约接口；校验/门控逻辑落到服务端 + 前端禁用态。</li>
    <li style="padding:4px 0">· 本包为单文件参考；改设计后运行 build-ui-package.mjs 重新生成以保持图文同源。</li>
  </ul></div>
</section>
</div>
<footer><div class="wrap">GoGo · UI 设计包 · 单文件自包含 · 截图与原型同源采集 · 供后续开发参考</div></footer>
<div class="toast" id="toast"></div>

<script>
const IMAGES = __IMAGES__;
const ROOT_CSS = __ROOTCSS__;
const NODES = __NODES__;
const CATS = __CATS__;
const TOKENS = __TOKENS__;
const TW_CSS = 'theme: { extend: { colors: { brand: {DEFAULT:"#0d9488",2:"#06b6d4",ink:"#0f766e",soft:"#ccfbf1"}, route:{a:"#2563eb",b:"#ea580c"}, ok:"#059669", warn:"#d97706", err:"#dc2626", ink:{DEFAULT:"#1c1917",2:"#57534e",3:"#a8a29e"}, surface:{DEFAULT:"#fff",2:"#faf9f7",3:"#f5f4f1"}, line:"#e9e7e2", bg:"#f4f3ef" }, borderRadius:{ sm:"10px", DEFAULT:"14px", lg:"20px", xl:"26px" } } }';
const $ = id => document.getElementById(id);
let toastT;
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),1800);}
function copyText(txt,msg){ if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(()=>toast(msg)).catch(()=>fallbackCopy(txt,msg));} else fallbackCopy(txt,msg); }
function fallbackCopy(txt,msg){const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast(msg);}catch(e){toast('复制失败，请手动选择');}ta.remove();}
// tokens
$('swatches').innerHTML = TOKENS.map(t=>'<div class="sw" onclick="copyText(\\''+t[1]+'\\',\\'已复制 '+t[0]+'\\')"><div class="chip" style="background:'+t[1]+'"></div><div class="meta"><b>'+t[0]+'</b><code>'+t[1]+'</code><span>'+t[2]+'</span></div></div>').join('');
$('rootCss').textContent = ROOT_CSS;
$('twCss').textContent = TW_CSS;
// components interactivity
$('cmpChips').addEventListener('click',e=>{const c=e.target.closest('.chip');if(c)c.classList.toggle('on');});
$('cmpSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$('cmpSeg').children].forEach(x=>x.classList.remove('on'));b.classList.add('on');});
// nodes filter + render
let curCat='all', curQ='';
$('filters').innerHTML = CATS.map(c=>'<button class="chip'+(c[0]==='all'?' on':'')+'" data-cat="'+c[0]+'">'+c[1]+'</button>').join('') + '<input id="q" placeholder="搜索节点 / story / 关键词…"/>';
$('filters').addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;curCat=c.dataset.cat;[...$('filters').querySelectorAll('.chip')].forEach(x=>x.classList.toggle('on',x===c));renderNodes();});
$('filters').addEventListener('input',e=>{if(e.target.id==='q'){curQ=e.target.value.trim().toLowerCase();renderNodes();}});
function renderNodes(){
  const list = NODES.filter(n=>(curCat==='all'||n.cat===curCat) && (!curQ || (n.title+n.stories.join('')+n.purpose+n.layout.join('')+n.rules.join('')).toLowerCase().includes(curQ)));
  $('nodeList').innerHTML = list.map(n=>{
    const img = IMAGES[n.img]||'';
    return '<article class="card node"><div class="shot"><img src="'+img+'" alt="'+n.title+' 截图" loading="lazy"/></div><div class="spec">'
      +'<div class="nh"><span class="idx">'+n.n+'</span><h4>'+n.title+'</h4>'+n.stories.map(s=>'<span class="pill brand">'+s+'</span>').join('')+'</div>'
      +'<p class="purpose">'+n.purpose+'</p>'
      +'<h5>布局与组件</h5><ul>'+n.layout.map(x=>'<li>'+x+'</li>').join('')+'</ul>'
      +'<h5>状态与交互</h5><ul>'+n.interact.map(x=>'<li>'+x+'</li>').join('')+'</ul>'
      +'<h5>业务规则</h5><ul>'+n.rules.map(x=>'<li class="rule">'+x+'</li>').join('')+'</ul>'
      +'<button class="btn btn-ghost sm open" onclick="jumpTo('+n.n+',true)">在 Live 原型打开 →</button>'
      +'</div></article>';
  }).join('') || '<div class="card pad" style="color:var(--ink-3)">没有匹配的节点。</div>';
}
renderNodes();
// live prototype jump
const PROTO_SRC = $('proto').getAttribute('srcdoc');
$('jump').innerHTML = NODES.map(n=>'<option value="'+n.n+'">'+n.n+' · '+n.title+'</option>').join('');
function jumpTo(n,scroll){ const f=$('proto'); try{ f.contentWindow.go(n); }catch(e){} $('jump').value=n; if(scroll){ f.scrollIntoView({behavior:'smooth',block:'start'}); } toast('已跳转到第 '+n+' 屏'); }
function exportProto(){ const blob=new Blob([PROTO_SRC],{type:'text/html'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='gogo-mvp-prototype.html'; a.click(); URL.revokeObjectURL(a.href); toast('已导出独立原型'); }
// scrollspy
const secs=[...document.querySelectorAll('section[id]')];
const links=[...document.querySelectorAll('nav.links a')];
function spy(){ let cur=secs[0].id; for(const s of secs){ if(s.getBoundingClientRect().top<=90) cur=s.id; } links.forEach(a=>a.classList.toggle('on',a.getAttribute('href')==='#'+cur)); }
document.addEventListener('scroll',spy,{passive:true}); spy();
</script>
</body>
</html>`;

const out = html
  .replace('__SRCDOC__', () => srcdoc)
  .replace('__IMAGES__', () => JSON.stringify(IMAGES))
  .replace('__ROOTCSS__', () => JSON.stringify(rootCss))
  .replace('__NODES__', () => JSON.stringify(NODES))
  .replace('__CATS__', () => JSON.stringify(CATS))
  .replace('__TOKENS__', () => JSON.stringify(TOKENS));
writeFileSync(join(here, 'gogo-ui-design-package.html'), out);
console.log('written ui-design-reference/gogo-ui-design-package.html', (out.length / 1024 / 1024).toFixed(2) + ' MB');