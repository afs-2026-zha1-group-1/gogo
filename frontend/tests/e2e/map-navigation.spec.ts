import { expect, test, type Page } from '@playwright/test'
import { DatabaseSync } from 'node:sqlite'

// US-079 E2E（DOM 层）：E1–E3、E5–E10、E12–E14；E4/E11（confirmed split 个人路线）
// 与外部高德页观察行 X1–X5 记 docs/feedback/e2e-us-079.md（不自动化外部站点）。
const TODAY = (() => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
})()

test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

function seedTrip(db: DatabaseSync, id: number, name: string, stops: Array<[string, string, string]>, withDraft = true) {
  // 幂等：worker 重启时 beforeAll 会重跑，先清依赖再插。
  db.prepare('UPDATE app_user SET current_trip_id = NULL WHERE current_trip_id = ?').run(id)
  db.prepare('DELETE FROM split_draft WHERE trip_id = ?').run(id)
  db.prepare('DELETE FROM plan_node WHERE trip_id = ?').run(id)
  db.prepare('DELETE FROM trip_invitation WHERE trip_id = ?').run(id)
  db.prepare('DELETE FROM main_plan_stop WHERE draft_id IN (SELECT id FROM main_plan_draft WHERE trip_id = ?)').run(id)
  db.prepare('DELETE FROM main_plan_draft WHERE trip_id = ?').run(id)
  db.prepare('DELETE FROM trip_member WHERE trip_id = ?').run(id)
  db.prepare('DELETE FROM trip WHERE id = ?').run(id)
  db.prepare(
    'INSERT INTO trip (id, name, destination, start_date, end_date, organizer_id) VALUES (?, ?, ?, ?, ?, 1)',
  ).run(id, name, 'Singapore', TODAY, TODAY)
  db.prepare('INSERT INTO trip_member (trip_id, user_id, ready, preference_revision) VALUES (?,1,1,1),(?,2,1,1)').run(id, id)
  if (!withDraft) return
  db.prepare(
    "INSERT INTO main_plan_draft (trip_id, version, status, cost_per_person_cents, input_revisions_json) " +
    "VALUES (?, 1, 'confirmed', 0, '[{\"userId\":1,\"revision\":1},{\"userId\":2,\"revision\":1}]')",
  ).run(id)
  const draftId = db.prepare('SELECT id FROM main_plan_draft WHERE trip_id = ? AND version = 1').get(id)!.id as number
  const insert = db.prepare(
    'INSERT INTO main_plan_stop (draft_id, seq, name, start_local, end_local, travel_minutes_to_next, interests_json, address, lat, lng) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)',
  )
  stops.forEach(([stopName, start, end], i) => {
    insert.run(draftId, i + 1, stopName, start, end, i < stops.length - 1 ? 1 : null, '[]')
  })
}

async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel('邮箱').fill('alice@example.com')
  await page.getByLabel('密码').fill('gogo-demo-2026')
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.getByRole('button', { name: '登录', exact: true }).click(),
  ])
}

test.beforeAll(() => {
  const db = new DatabaseSync(process.env.GOGO_E2E_DB_PATH!)
  try {
    // during 态（当前站 00:00–23:57），下一站已收录 → E12/E14
    seedTrip(db, 9003, 'Map nav booked trip', [
      ['西九文化区 M+ 博物馆', '00:00', '23:57'],
      ['天星小轮（尖沙咀 → 中环）', '23:57', '23:58'],
      ['太平山顶与凌霄阁', '23:58', '23:59'],
    ])
    // 下一站未收录 → E6/E9/E13
    seedTrip(db, 9004, 'Map nav unbooked trip', [
      ['City Hall MRT', '00:00', '23:57'],
      ['Penang Hill Funicular', '23:57', '23:58'],
    ])
    // 无草稿 → E1 旧版详情页无入口
    seedTrip(db, 9005, 'Map nav no plan trip', [], false)
  } finally {
    db.close()
  }
})

test('E1 no main plan renders legacy detail without map entry', async ({ page }) => {
  await login(page)
  await page.goto('/#/trips/9005')
  await expect(page.getByText('查看主线方案')).toBeVisible()
  await expect(page.locator('.map-btn')).toHaveCount(0)
})

test('E2/E3/E5/E7/E8 map entries carry per-stop coords, fixed first origin, semantic icons, new tab', async ({ page }) => {
  await login(page)
  await page.goto('/#/trips/9003')
  const buttons = page.locator('.act-card .map-btn')
  await expect(buttons).toHaveCount(3)
  const first = buttons.nth(0)
  const second = buttons.nth(1)
  await expect(first).toHaveAttribute('target', '_blank')
  await expect(first).toHaveAttribute('rel', 'noopener')
  await expect(page.locator('iframe')).toHaveCount(0)
  const href1 = await first.getAttribute('href')
  const href2 = await second.getAttribute('href')
  expect(href1).toContain('https://www.amap.com/dir?')
  const p1 = new URLSearchParams(href1!.split('?')[1])
  const p2 = new URLSearchParams(href2!.split('?')[1])
  // E3：首站固定出发点
  expect(p1.get('from[name]')).toBe('珠海南方软件园')
  // E2：第二站起点=上一站
  expect(p2.get('from[name]')).toBe('西九文化区 M+ 博物馆')
  // E5：不串站
  expect(p1.get('to[lnglat]')).not.toBe(p2.get('to[lnglat]'))
  expect(p1.get('to[name]')).toBe('西九文化区 M+ 博物馆')
  // E7：语义图标（landmark/ship/mountain 路径首段；ship 含两条 path，按卡取首条）
  const iconOf = (i: number) => page.locator('.act-card').nth(i).locator('.act-ic svg path').first()
  await expect(iconOf(0)).toHaveAttribute('d', /^M3 10l9-6/)
  await expect(iconOf(1)).toHaveAttribute('d', /^M4 14l1\.5-4/)
  await expect(iconOf(2)).toHaveAttribute('d', /^M3 19h18/)
})

test('E6/E9 unbooked stop falls back to search page without error state', async ({ page }) => {
  await login(page)
  await page.goto('/#/trips/9004')
  const unbooked = page.locator('.act-card', { hasText: 'Penang Hill Funicular' }).locator('.map-btn')
  const href = await unbooked.getAttribute('href')
  expect(href).toContain('https://www.amap.com/search?')
  expect(new URLSearchParams(href!.split('?')[1]).get('query')).toBe('Penang Hill Funicular Singapore')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('E10 countdown renders during state and ticks', async ({ page }) => {
  await login(page)
  await page.goto('/#/trips/9003')
  const timer = page.getByRole('timer')
  await expect(timer).toBeVisible()
  const a = await timer.textContent()
  await page.waitForTimeout(1500)
  const b = await timer.textContent()
  expect(a).not.toBe(b)
  await expect(page.getByText('活动剩余')).toBeVisible()
})

test('E12/E14 next-stop address copy gives transient feedback with stable size; origin = current stop', async ({ page }) => {
  await login(page)
  await page.goto('/#/trips/9003')
  const nextStop = page.locator('.next-stop')
  await expect(nextStop).toContainText('天星小轮（尖沙咀 → 中环）')
  // E14：下一站导航起点=当前活动站
  const nextHref = await nextStop.locator('.map-btn').getAttribute('href')
  expect(new URLSearchParams(nextHref!.split('?')[1]).get('from[name]')).toBe('西九文化区 M+ 博物馆')
  // E12：复制按钮瞬时反馈、文案与尺寸恒定
  const copy = page.locator('.act-card', { hasText: '西九文化区 M+ 博物馆' }).locator('.addr-copy')
  const before = await copy.boundingBox()
  await copy.click()
  await expect(copy).toHaveClass(/copied/)
  await expect(copy).toContainText('复制地址')
  const during = await copy.boundingBox()
  expect(during!.width).toBeCloseTo(before!.width, 1)
  await expect(copy).not.toHaveClass(/copied/, { timeout: 3000 })
  await expect(copy).toContainText('复制地址')
})

test('E13 next-stop without address renders pending and disables copy', async ({ page }) => {
  await login(page)
  await page.goto('/#/trips/9004')
  const nextStop = page.locator('.next-stop')
  await expect(nextStop).toContainText('地址待确认')
  const unbookedCopy = page.locator('.act-card', { hasText: 'Penang Hill Funicular' }).locator('.addr-copy')
  await expect(unbookedCopy).toBeDisabled()
})
