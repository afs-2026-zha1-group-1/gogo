import { expect, test, type Page } from '@playwright/test'
import { DatabaseSync } from 'node:sqlite'

function persistedState() {
  const path = process.env.GOGO_E2E_DB_PATH
  if (!path) throw new Error('Missing isolated browser database')
  const database = new DatabaseSync(path, { readOnly: true })
  try {
    const tables = [
      'trip', 'trip_member', 'trip_invitation', 'member_preference',
      'main_plan_draft', 'main_plan_stop', 'plan_node', 'split_draft',
    ]
    return JSON.stringify([
      database.prepare('SELECT id, current_trip_id FROM app_user ORDER BY id').all(),
      ...tables.map((table) => database.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()),
    ])
  } finally {
    database.close()
  }
}

async function login(page: Page, email: string) {
  await page.goto('/')
  await page.getByLabel('邮箱').fill(email)
  await page.getByLabel('密码').fill('gogo-demo-2026')
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.getByRole('button', { name: '登录', exact: true }).click(),
  ])
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible()
}

test('shows saved summary, readiness, stale plan and absent split', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9001' })
  await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
  await expect(page.getByText('Penang', { exact: true })).toBeVisible()
  await expect(page.getByText('2026-12-10 – 2026-12-12')).toBeVisible()
  await expect(page.getByText('Penang Station')).toBeVisible()
  await expect(page.getByText('Airport')).toBeVisible()
  await expect(page.getByRole('region', { name: '成员', exact: true })).toContainText('4')
  await expect(page.getByRole('region', { name: '偏好就绪' })).toContainText('3/4')
  await expect(page.getByRole('region', { name: '主线方案' })).toContainText('草稿已过期')
  await expect(page.getByRole('region', { name: '智能分队' })).toContainText('未发起')
})

test('organizer can prepare the main plan while waiting for member preferences', async ({ page }) => {
  const db = new DatabaseSync(process.env.GOGO_E2E_DB_PATH!)
  db.exec('PRAGMA busy_timeout = 5000')
  try {
    db.prepare(`INSERT INTO trip
      (id, name, destination, start_date, end_date, organizer_id)
      VALUES (9011, 'Waiting for preferences', 'Singapore', '2026-12-10', '2026-12-12', 1)`).run()
    db.prepare('INSERT INTO trip_member (trip_id, user_id, ready) VALUES (9011, 1, 1), (9011, 2, 0)').run()
    await login(page, 'alice@example.com')
    await page.goto('/#/dashboard/trips/9011')
    const progress = page.getByRole('region', { name: '旅程进度' }).locator('li')
    await expect(progress.nth(1)).toHaveAttribute('data-state', 'done')
    await expect(progress.nth(1)).toContainText('本人已就绪')
    await expect(progress.nth(2)).toHaveAttribute('data-state', 'done')
    await expect(progress.nth(3)).toHaveAttribute('data-state', 'active')
    const before = persistedState()
    const next = page.getByRole('region', { name: '下一步' })
    await expect(next).toContainText('还有 1 位成员未提交偏好')
    await next.getByRole('link', { name: '准备主线方案' }).click()
    await expect(page).toHaveURL(/#\/dashboard\/trips\/9011\/main-plan\/inputs\?from=dashboard$/)
    await expect(page.getByText('生成主线方案', { exact: true })).toBeVisible()
    await expect(page.getByText('共同兴趣', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '一键生成主线方案' }).click()
    await expect(page.getByRole('alert')).toContainText('请等所有成员提交偏好后再试')
    expect(persistedState()).toBe(before)
  } finally {
    db.prepare('DELETE FROM trip_member WHERE trip_id = 9011').run()
    db.prepare('DELETE FROM trip WHERE id = 9011').run()
    db.close()
  }
})

test('shows a confirmed plan and active split from the owning reads', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.goto('/#/dashboard/trips/9002')
  await expect(page.getByRole('heading', { name: 'Active split trip' })).toBeVisible()
  await expect(page.getByRole('region', { name: '主线方案' })).toContainText('已确认')
  await expect(page.getByRole('region', { name: '智能分队' })).toContainText('进行中')
})

test('successful missing drafts are displayed as absent', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.goto('/#/dashboard/trips/1')
  await expect(page.getByRole('region', { name: '主线方案' })).toContainText('未生成')
  await expect(page.getByRole('region', { name: '智能分队' })).toContainText('未发起')
})

test('solo organizer completes preferences before inviting friends', async ({ page }) => {
  const db = new DatabaseSync(process.env.GOGO_E2E_DB_PATH!)
  db.exec('PRAGMA busy_timeout = 5000')
  try {
    db.prepare(`INSERT INTO trip
      (id, name, destination, start_date, end_date, organizer_id)
      VALUES (9010, 'Solo organizer', 'Singapore', '2026-12-10', '2026-12-12', 1)`).run()
    db.prepare('INSERT INTO trip_member (trip_id, user_id, ready) VALUES (9010, 1, 0)').run()
    await login(page, 'alice@example.com')
    await page.goto('/#/dashboard/trips/9010')
    const next = page.getByRole('region', { name: '下一步' })
    await expect(next.getByRole('link', { name: '查看我的偏好' })).toBeVisible()
    db.prepare('UPDATE trip_member SET ready = 1 WHERE trip_id = 9010 AND user_id = 1').run()
    await page.reload()
    await expect(next.getByRole('link', { name: '邀请朋友' })).toHaveAttribute('href', '#/dashboard/trips/9010/invite')
    const progress = page.getByRole('region', { name: '旅程进度' })
    await expect(progress.locator('li').nth(1)).toContainText('偏好')
    await expect(progress.locator('li').nth(2)).toContainText('邀请')
    await next.getByRole('link', { name: '邀请朋友' }).click()
    await expect(page).toHaveURL(/#\/dashboard\/trips\/9010\/invite$/)
    await expect(page.getByText('扫码或分享链接加入')).toBeVisible()
    await expect(page.getByLabel('Invitation URL')).toBeVisible()
    await expect(page.getByText('行程信息', { exact: true })).toHaveCount(0)
    await page.getByRole('link', { name: 'Back' }).click()
    await expect(page).toHaveURL(/#\/dashboard\/trips\/9010$/)
    await page.getByRole('region', { name: '快捷入口' }).getByRole('link', { name: /邀请朋友/ }).click()
    await expect(page.getByText('扫码或分享链接加入')).toBeVisible()
    await expect(page.getByLabel('Invitation URL')).toBeVisible()
  } finally {
    db.prepare('DELETE FROM trip_invitation WHERE trip_id = 9010').run()
    db.prepare('DELETE FROM trip_member WHERE trip_id = 9010').run()
    db.prepare('DELETE FROM trip WHERE id = 9010').run()
    db.close()
  }
})

for (const email of ['alice@example.com', 'ben@example.com']) {
  test(`unplanned trip opens member preferences from the dashboard for ${email}`, async ({ page }) => {
    await login(page, email)
    await page.goto('/#/dashboard/trips/1')
    const before = persistedState()
    const next = page.getByRole('region', { name: '下一步' })
    const organizer = email === 'alice@example.com'
    await expect(next).toContainText(organizer ? '全员偏好已就绪，可以生成主线方案。' : '全员偏好已就绪，等待组织者生成主线方案。')
    await next.getByRole('link', { name: organizer ? '生成主线方案' : '查看成员偏好' }).click()
    await expect(page).toHaveURL(/#\/dashboard\/trips\/1\/main-plan\/inputs\?from=dashboard$/)
    await expect(page.getByText('共同兴趣')).toBeVisible()
    await expect(page.getByText('采用 4 位就绪成员偏好')).toBeVisible()
    expect(persistedState()).toBe(before)
    await page.reload()
    await expect(page.getByText('共同兴趣')).toBeVisible()
    await page.getByRole('link', { name: 'Back' }).click()
    await expect(page).toHaveURL(/#\/dashboard\/trips\/1$/)
    expect(persistedState()).toBe(before)
  })
}

test('rejects inconsistent active split and unconfirmed main plan', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.route('**/api/trips/9001/split-draft', async (route) => {
    const active = await page.request.get('/api/trips/9002/split-draft')
    await route.fulfill({ response: active })
  })
  await page.goto('/#/dashboard/trips/9001')
  await expect(page.getByRole('alert')).toContainText('数据不一致')
  await expect(page.getByRole('region', { name: '下一步' })).toHaveCount(0)
})

test('shows independent milestones and suggests a read-only main-plan view', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.goto('/#/dashboard/trips/9001')
  const progress = page.getByRole('region', { name: '旅程进度' })
  await expect(progress.locator('li')).toHaveCount(5)
  await expect(progress.locator('li').nth(0)).toContainText('3/4')
  await expect(progress.locator('li').nth(1)).toContainText('草稿已过期')
  await expect(progress.locator('li').nth(2)).toContainText('未发起')
  await expect(progress.locator('li').nth(3)).toContainText('未知')
  await expect(progress.locator('li').nth(4)).toContainText('未知')
  const writes: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/trips/') && request.method() !== 'GET') writes.push(request.method())
  })
  await page.getByRole('link', { name: '查看主线方案' }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9001\/main-plan$/)
  await expect(page.getByText('草稿', { exact: false }).first()).toBeVisible()
  expect(writes).toEqual([])
})

test('selected dashboard fits the mobile shell', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, 'ben@example.com')
  await page.goto('/#/dashboard/trips/9001')
  await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
  await expect(page.getByRole('region', { name: '旅程进度' }).locator('li')).toHaveCount(5)
  await expect(page.getByRole('navigation', { name: '主导航' }).getByRole('link')).toHaveCount(5)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('mobile-dashboard.png') })
})

test('suggests preferences for an unready member without saving on navigation', async ({ page }) => {
  await login(page, 'daniel@example.com')
  await page.goto('/#/dashboard/trips/9001')
  const progress = page.getByRole('region', { name: '旅程进度' })
  await expect(progress.locator('li').first()).toContainText('偏好')
  await expect(progress.getByText('建局', { exact: true })).toHaveCount(0)
  await expect(progress.getByText('邀请', { exact: true })).toHaveCount(0)
  const writes: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/trips/') && request.method() !== 'GET') writes.push(request.method())
  })
  await page.getByRole('link', { name: '查看我的偏好' }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9001\/preferences$/)
  await expect(page.locator('.appbar .title').getByText('我的偏好', { exact: true })).toBeVisible()
  expect(writes).toEqual([])
})

test('returning from dashboard preferences does not open unsafe trip details', async ({ page }) => {
  await login(page, 'daniel@example.com')
  await page.goto('/#/dashboard/trips/9001')
  await page.getByRole('link', { name: '查看我的偏好' }).click()
  await expect(page.locator('.appbar .title').getByText('我的偏好', { exact: true })).toBeVisible()
  await page.route('**/api/trips/**', async (route) => {
    if (route.request().method() !== 'GET') await route.abort()
    else await route.continue()
  })
  await page.getByRole('link', { name: '返回行程', exact: true }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9001$/)
  await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
})

test('a dashboard main-plan view does not offer unsafe trip details', async ({ page }) => {
  await login(page, 'alice@example.com')
  await page.goto('/#/dashboard/trips/9001')
  const before = persistedState()
  await page.getByRole('link', { name: '查看主线方案' }).click()
  await expect(page.getByText('草稿', { exact: false }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: '行程详情' })).toHaveCount(0)
  await expect(page.getByText('行程详情即将推出')).toBeVisible()
  await page.getByRole('link', { name: 'Back' }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9001$/)
  await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
  expect(persistedState()).toBe(before)
})

test('dashboard main plan keeps split return safe after refresh', async ({ page }) => {
  await login(page, 'alice@example.com')
  const before = persistedState()
  await page.goto('/#/dashboard/trips/9002')
  await page.getByRole('region', { name: '快捷入口' }).getByRole('link', { name: /主线方案/ }).click()
  await page.getByRole('button', { name: '进入智能分队' }).click()
  await page.reload()
  await page.getByRole('button', { name: '返回' }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9002$/)
  expect(persistedState()).toBe(before)
})

test('dashboard main-plan inputs return to the dashboard without opening details', async ({ page }) => {
  await login(page, 'alice@example.com')
  const before = persistedState()
  await page.goto('/#/dashboard/trips/1/main-plan')
  await page.getByRole('link', { name: '去生成主线方案' }).click()
  await expect(page.getByText('生成主线方案', { exact: true }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Back' }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/1$/)
  expect(persistedState()).toBe(before)
})

test('pending dashboard main-plan deep link does not select an unvalidated trip', async ({ page }) => {
  await login(page, 'ben@example.com')
  let release: (() => void) | undefined
  const paused = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/trips/999999', async (route) => {
    await paused
    await route.continue()
  })
  try {
    await page.goto('/#/dashboard/trips/999999/main-plan')
    await expect(page.getByText('正在加载主线方案…')).toBeVisible()
    await expect(page.getByRole('link', { name: '分队', exact: true })).toHaveAttribute('href', '#/my-trips')
  } finally {
    release?.()
  }
})

test('account change does not restore a saved trip in dashboard-origin context', async ({ page }) => {
  await login(page, 'alice@example.com')
  await page.goto('/#/dashboard/trips/9001')
  await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
  await page.getByRole('link', { name: '我的', exact: true }).click()
  await page.route('**/api/auth/me', (route) => route.request().method() === 'PATCH'
    ? route.fulfill({ json: { id: 2, name: 'Ben', email: 'ben@example.com' } })
    : route.continue())
  await page.route('**/api/trips/current', (route) => route.fulfill({ json: { tripId: 9002 } }))
  await page.getByRole('button', { name: '编辑名字' }).click()
  await page.getByLabel('名字', { exact: true }).fill('Ben')
  await page.getByRole('button', { name: '保存名字' }).click()
  await expect(page.getByRole('status')).toContainText('已保存')
  await expect(page.getByRole('link', { name: '分队', exact: true })).toHaveAttribute('href', '#/my-trips')
})

test('does not reuse cached preferences when the authenticated account changes', async ({ page }) => {
  await login(page, 'ben@example.com')
  let release: (() => void) | undefined
  const paused = new Promise<void>((resolve) => { release = resolve })
  let reads = 0
  await page.route('**/api/trips/9001/preferences', async (route) => {
    reads += 1
    if (reads === 1) {
      await route.fulfill({ json: { members: [{ userId: 77, interests: ['冒险'] }] } })
    } else {
      await paused
      await route.fulfill({ status: 403, json: { code: 'FORBIDDEN' } })
    }
  })
  await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9001/preferences' })
  await expect(page.getByRole('button', { name: /冒险/ })).toBeVisible()
  await page.evaluate(() => { window.location.hash = '#/account' })
  await page.route('**/api/auth/me', (route) => {
    if (route.request().method() === 'PATCH') {
      return route.fulfill({ json: { id: 77, name: 'Other', email: 'other@example.com' } })
    }
    return route.continue()
  })
  await page.getByRole('button', { name: '编辑名字' }).click()
  await page.getByLabel('名字', { exact: true }).fill('Other')
  await page.getByRole('button', { name: '保存名字' }).click()
  await expect(page.getByRole('status')).toContainText('已保存')
  try {
    await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9001/preferences' })
    await expect(page.getByText('正在加载你的选择…')).toBeVisible()
    await expect(page.getByRole('button', { name: /冒险/ })).toHaveCount(0)
  } finally {
    release?.()
  }
  await expect(page.getByRole('alert')).toContainText('没有访问权限')
})

for (const [email, linkName] of [
  ['alice@example.com', '查看主线方案'],
  ['ben@example.com', '查看主线方案'],
  ['daniel@example.com', '查看我的偏好'],
]) {
  test(`recommendation navigation does not change persisted state for ${email}`, async ({ page }) => {
    await login(page, email)
    const before = persistedState()
    await page.goto('/#/dashboard/trips/9001')
    await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
    expect(persistedState()).toBe(before)
    await page.getByRole('link', { name: linkName }).click()
    if (linkName === '查看我的偏好') {
      await expect(page).toHaveURL(/#\/dashboard\/trips\/9001\/preferences$/)
      await expect(page.locator('.appbar .title').getByText('我的偏好', { exact: true })).toBeVisible()
      await expect(page.getByText('正在加载你的选择…')).toHaveCount(0)
    } else {
      await expect(page.getByText('草稿', { exact: false }).first()).toBeVisible()
    }
    expect(persistedState()).toBe(before)
  })
}

test('an unready organizer can review preferences without changing persisted state', async ({ page }) => {
  const path = process.env.GOGO_E2E_DB_PATH
  if (!path) throw new Error('Missing isolated browser database')
  const database = new DatabaseSync(path)
  try {
    const changed = database.prepare('UPDATE trip_member SET ready = 0 WHERE trip_id = 9001 AND user_id = 1').run()
    expect(changed.changes).toBe(1)
    await login(page, 'alice@example.com')
    const before = persistedState()
    await page.goto('/#/dashboard/trips/9001')
    await page.getByRole('link', { name: '查看我的偏好' }).click()
    await expect(page.getByRole('button', { name: /冒险/ })).toBeVisible()
    expect(persistedState()).toBe(before)
  } finally {
    database.prepare('UPDATE trip_member SET ready = 1 WHERE trip_id = 9001 AND user_id = 1').run()
    database.close()
  }
})

test('recommendation destinations enforce membership', async ({ page }) => {
  await login(page, 'eve@example.com')
  await page.goto('/#/dashboard/trips/9001/preferences')
  await expect(page.getByRole('alert')).toContainText('没有访问权限')
  await page.goto('/#/trips/9001/main-plan')
  await expect(page.getByText('没有访问权限')).toBeVisible()
  await page.goto('/trips/9001/split')
  await expect(page.getByText('你不是该行程的成员，无法查看或操作其分队草稿。')).toBeVisible()
})

for (const email of ['alice@example.com', 'ben@example.com']) {
  test(`loading the selected dashboard does not change persisted state for ${email}`, async ({ page }) => {
    const before = persistedState()
    await login(page, email)
    await expect(page.getByText('尚未选择行程')).toBeVisible()
    expect(persistedState()).toBe(before)
  })

  test(`dashboard dock navigation preserves data and identity for ${email}`, async ({ page }) => {
    await login(page, email)
    await page.evaluate(() => { window.location.hash = '#/trips/9001/main-plan' })
    await expect(page.getByText('草稿', { exact: false }).first()).toBeVisible()
    await page.getByRole('link', { name: '仪表盘', exact: true }).click()
    const before = persistedState()
    await page.evaluate(() => { (window as Window & { dashboardMarker?: string }).dashboardMarker = 'retained' })
    const navigation = page.getByRole('navigation', { name: '主导航' })
    await expect(navigation.getByRole('link')).toHaveText(['仪表盘', '行程', '分队', '成员', '我的'])
    await expect(navigation.getByRole('link', { name: '仪表盘' })).toHaveAttribute('aria-current', 'page')
    await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9001' })
    await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
    expect(persistedState()).toBe(before)

    for (const [tab, visibleText] of [
      ['行程', '我的行程'],
      ['成员', '成员列表'],
      ['我的', email],
    ]) {
      await navigation.getByRole('link', { name: tab, exact: true }).click()
      await expect(navigation.getByRole('link', { name: tab, exact: true })).toHaveAttribute('aria-current', 'page')
      if (tab === '成员') await expect(page.getByText('谁已加入 · 谁是组织者')).toBeVisible()
      else if (tab === '行程') await expect(page.getByText(visibleText, { exact: true })).toBeVisible()
      else await expect(page.getByText(visibleText, { exact: false }).first()).toBeVisible()
      expect(await page.evaluate(() => (window as Window & { dashboardMarker?: string }).dashboardMarker)).toBe('retained')
      expect(persistedState()).toBe(before)
    }

    await page.goBack()
    await expect(navigation.getByRole('link', { name: '成员', exact: true })).toHaveAttribute('aria-current', 'page')
    await page.goForward()
    await expect(navigation.getByRole('link', { name: '我的', exact: true })).toHaveAttribute('aria-current', 'page')
    expect(persistedState()).toBe(before)

    for (const tab of ['成员', '行程', '仪表盘']) {
      await navigation.getByRole('link', { name: tab, exact: true }).click()
      await expect(navigation.getByRole('link', { name: tab, exact: true })).toHaveAttribute('aria-current', 'page')
      expect(persistedState()).toBe(before)
    }
    await navigation.getByRole('link', { name: '行程', exact: true }).click()
    await page.getByRole('link', { name: '创建行程' }).click()
    await expect(navigation.getByRole('link', { name: '行程', exact: true })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('link', { name: 'Back' }).click()
    await expect(page).toHaveURL(/#\/trips$/)
    expect(persistedState()).toBe(before)
  })

  test(`scanner and split entry do not write persisted state for ${email}`, async ({ page }) => {
    await login(page, email)
    const before = persistedState()
    await page.getByRole('link', { name: '扫码加入行程' }).click()
    await expect(page.getByText('扫码加入行程', { exact: true })).toBeVisible()
    expect(persistedState()).toBe(before)
    await page.getByRole('button', { name: '关闭扫码' }).click()
    await page.goto('/#/dashboard/trips/9001')
    await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
    await page.getByRole('link', { name: '扫码加入行程' }).click()
    await expect(page.getByText('扫码加入行程', { exact: true })).toBeVisible()
    expect(persistedState()).toBe(before)
    await page.getByRole('button', { name: '关闭扫码' }).click()
    await expect(page).toHaveURL(/#\/$/)
    await page.evaluate(() => { window.location.hash = '#/trips/9001/main-plan' })
    await expect(page.getByText('草稿', { exact: false }).first()).toBeVisible()
    await page.getByRole('link', { name: '仪表盘', exact: true }).click()
    await page.goto('/#/dashboard/trips/9001')
    await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
    await page.getByRole('link', { name: '分队', exact: true }).click()
    await expect(page.getByText('主线方案未确认', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /发起分队/ })).toBeDisabled()
    expect(persistedState()).toBe(before)
    await page.getByRole('button', { name: '返回' }).click()
    await expect(page).toHaveURL(/#\/dashboard\/trips\/9001$/)
    await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
    expect(persistedState()).toBe(before)
  })
}

test('dashboard-origin split flow keeps its safe return through nested screens', async ({ page }) => {
  await login(page, 'ben@example.com')
  const before = persistedState()
  await page.goto('/#/dashboard/trips/9002')
  await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
  await page.getByRole('link', { name: '分队', exact: true }).click()
  await page.getByRole('button', { name: /继续分队/ }).click()
  await expect(page).toHaveURL(/\/split\/boundaries\?from=dashboard$/)
  await page.getByRole('button', { name: '返回' }).click()
  await expect(page).toHaveURL(/\/split\?from=dashboard$/)
  await page.getByRole('button', { name: '返回' }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9002$/)
  expect(persistedState()).toBe(before)
})

test('account logout remains available from the dashboard dock', async ({ page }) => {
  await login(page, 'ben@example.com')
  const before = persistedState()
  await page.getByRole('link', { name: '我的', exact: true }).click()
  await expect(page.getByText('ben@example.com')).toBeVisible()
  await page.getByRole('button', { name: '退出登录' }).click()
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  await expect(page.getByText('Singapore Friends Day')).toHaveCount(0)
  expect(persistedState()).toBe(before)
})

for (const suffix of ['', '/main-plan/inputs', '/main-plan', '/split-draft']) {
  test(`fails closed when the ${suffix || 'trip'} read fails`, async ({ page }) => {
    await login(page, 'ben@example.com')
    await page.route(new RegExp(`/api/trips/9001${suffix}$`), (route) =>
      route.fulfill({ status: 503, json: { code: 'UNAVAILABLE' } }),
    )
    await page.goto('/#/dashboard/trips/9001')
    await expect(page.getByRole('alert')).toContainText('无法加载行程概览')
    await expect(page.getByRole('region', { name: '下一步' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toHaveCount(0)
  })

  test(`does not suggest a next step while the ${suffix || 'trip'} read is pending`, async ({ page }) => {
    await login(page, 'ben@example.com')
    let release: (() => void) | undefined
    const paused = new Promise<void>((resolve) => { release = resolve })
    await page.route(new RegExp(`/api/trips/9001${suffix}$`), async (route) => {
      await paused
      await route.continue()
    })
    try {
      await page.goto('/#/dashboard/trips/9001', { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('正在加载行程概览…')).toBeVisible()
      await expect(page.getByRole('region', { name: '下一步' })).toHaveCount(0)
    } finally {
      release?.()
    }
    await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
  })

  test(`rejects an incomplete successful ${suffix || 'trip'} response`, async ({ page }) => {
    await login(page, 'ben@example.com')
    await page.route(new RegExp(`/api/trips/9001${suffix}$`), (route) =>
      route.fulfill({ json: {} }),
    )
    await page.goto('/#/dashboard/trips/9001')
    await expect(page.getByRole('alert')).toContainText('无法加载行程概览')
    await expect(page.getByRole('region', { name: '下一步' })).toHaveCount(0)
  })
}

test('a late response cannot replace the newly selected trip', async ({ page }) => {
  await login(page, 'ben@example.com')
  let release: (() => void) | undefined
  let markDelivered: (() => void) | undefined
  const paused = new Promise<void>((resolve) => { release = resolve })
  const delivered = new Promise<void>((resolve) => { markDelivered = resolve })
  await page.route('**/api/trips/9001/main-plan/inputs', async (route) => {
    const response = await route.fetch()
    await paused
    await route.fulfill({ response })
    markDelivered?.()
  })
  try {
    await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9001' })
    await expect(page.getByText('正在加载行程概览…')).toBeVisible()
    await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9002' })
    await expect(page.getByRole('heading', { name: 'Active split trip' })).toBeVisible()
  } finally {
    release?.()
  }
  await delivered
  await expect(page.getByRole('heading', { name: 'Active split trip' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toHaveCount(0)
})

test('a late response cannot expose a previous account trip after an identity change', async ({ page }) => {
  await login(page, 'ben@example.com')
  let release: (() => void) | undefined
  let markDelivered: (() => void) | undefined
  const paused = new Promise<void>((resolve) => { release = resolve })
  const delivered = new Promise<void>((resolve) => { markDelivered = resolve })
  await page.route('**/api/trips/9001/main-plan/inputs', async (route) => {
    const response = await route.fetch()
    await paused
    await route.fulfill({ response })
    markDelivered?.()
  })
  await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9001' })
  await expect(page.getByText('正在加载行程概览…')).toBeVisible()
  await page.evaluate(() => { window.location.hash = '#/account' })
  await page.evaluate(async () => {
    const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))
    if (!cookie) throw new Error('Missing CSRF cookie')
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)),
      },
      body: JSON.stringify({ email: 'eve@example.com', password: 'gogo-demo-2026' }),
    })
    if (!response.ok) throw new Error(`Account switch failed: HTTP ${response.status}`)
  })
  await page.getByRole('button', { name: '编辑名字' }).click()
  await page.getByLabel('名字', { exact: true }).fill('Eve')
  await page.getByRole('button', { name: '保存名字' }).click()
  await expect(page.getByRole('status')).toContainText('已保存')
  release?.()
  await delivered
  await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9001' })
  await expect(page.getByRole('alert')).toContainText('无权查看此行程')
  await expect(page.getByText('Stale draft trip')).toHaveCount(0)
})

test('an expired session removes the selected dashboard', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.route('**/api/trips/9001/main-plan/inputs', (route) =>
    route.fulfill({ status: 401, json: { code: 'USER_REQUIRED' } }),
  )
  await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9001' })
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  await expect(page.getByText('Stale draft trip')).toHaveCount(0)
  await expect(page.getByRole('region', { name: '下一步' })).toHaveCount(0)
})

test('a signed-out visitor cannot see a selected dashboard', async ({ page }) => {
  await page.goto('/#/dashboard/trips/9001')
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  await expect(page.getByText('Stale draft trip')).toHaveCount(0)
  await expect(page.getByRole('region', { name: '下一步' })).toHaveCount(0)
})

test('rejects malformed, missing and non-member trip identifiers', async ({ page }) => {
  await login(page, 'eve@example.com')
  await page.evaluate(() => { window.location.hash = '#/dashboard/trips/not-an-id' })
  await expect(page.getByRole('alert')).toContainText('无效的行程编号')
  await page.evaluate(() => { window.location.hash = '#/dashboard/trips/999999' })
  await expect(page.getByRole('alert')).toContainText('未找到行程')
  await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9001' })
  await expect(page.getByRole('alert')).toContainText('无权查看此行程')
  await expect(page.getByText('Stale draft trip')).toHaveCount(0)
})

test('rejects malformed split success data instead of suggesting a next step', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.route('**/api/trips/9002/split-draft', async (route) => {
    const response = await route.fetch()
    const body = await response.json()
    body.data.windowMinutes = 'not a duration'
    await route.fulfill({ response, json: body })
  })
  await page.goto('/#/dashboard/trips/9002')
  await expect(page.getByRole('alert')).toContainText('分队数据无效')
  await expect(page.getByRole('region', { name: '下一步' })).toHaveCount(0)
})

test('refresh reads a split status changed by its owner', async ({ browser, page }) => {
  const database = new DatabaseSync(process.env.GOGO_E2E_DB_PATH!)
  database.exec('PRAGMA busy_timeout = 5000')
  const original = database.prepare('SELECT document, draft_version, updated_at FROM split_draft WHERE id = ?').get('us061-active')
  if (!original) throw new Error('Missing active split fixture')
  try {
    await login(page, 'ben@example.com')
    await page.goto('/#/dashboard/trips/9002')
    await expect(page.getByRole('region', { name: '智能分队' })).toContainText('进行中')

    const aliceContext = await browser.newContext()
    const alicePage = await aliceContext.newPage()
    try {
      await login(alicePage, 'alice@example.com')
      await alicePage.evaluate(async () => {
        const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))
        if (!cookie) throw new Error('Missing CSRF cookie')
        const response = await fetch('/api/trips/9002/split-draft:cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)),
          },
          body: JSON.stringify({ draftVersion: 1 }),
        })
        if (!response.ok) throw new Error(`Split cancellation failed: HTTP ${response.status}`)
      })
    } finally {
      await aliceContext.close()
    }
    await page.reload()
    await expect(page.getByRole('region', { name: '智能分队' })).toContainText('已取消')
  } finally {
    database.prepare('UPDATE split_draft SET document = ?, draft_version = ?, updated_at = ? WHERE id = ?')
      .run(original.document, original.draft_version, original.updated_at, 'us061-active')
    database.close()
  }
})
