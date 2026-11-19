import { expect, test, type Page, type Request } from '@playwright/test'
import { DatabaseSync } from 'node:sqlite'

async function login(page: Page, email = 'ben@example.com') {
  await page.goto('/')
  await page.getByLabel('邮箱').fill(email)
  await page.getByLabel('密码').fill('gogo-demo-2026')
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.getByRole('button', { name: '登录', exact: true }).click(),
  ])
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible()
}

test('dashboard follows the trip selected in my trips and keeps it after reload', async ({ page }) => {
  const db = new DatabaseSync(process.env.GOGO_E2E_DB_PATH!)
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()?.current_trip_id
  try {
    await login(page)
    await page.goto('/#/my-trips')
    await page.getByRole('button', { name: /Active split trip/ }).click()
    await expect(page.getByRole('button', { name: /Active split trip/ })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('link', { name: '仪表盘', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Active split trip' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Stale draft trip/ })).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Active split trip' })).toBeVisible()
  } finally {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(previous ?? null)
    db.close()
  }
})

test('the invitation page marks itself expired once joining is closed', async ({ page }) => {
  await login(page)
  await page.goto('/#/dashboard/trips/9002/invite')
  await expect(page.getByLabel('Invitation URL')).toBeVisible()
  // 9002 has joining_closed = 1: the badge must follow that state instead of always saying 生效中.
  const appbar = page.locator('.appbar')
  await expect(appbar.getByText('已失效')).toBeVisible()
  await expect(appbar.getByText('生效中')).toHaveCount(0)
  await expect(page.getByText('加入已关闭：新成员不能再通过邀请链接加入。')).toBeVisible()
})

test('Trips opens the saved trip instead of a different direct dashboard trip and survives reload', async ({ page }) => {
  const db = new DatabaseSync(process.env.GOGO_E2E_DB_PATH!)
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()?.current_trip_id
  db.prepare('UPDATE app_user SET current_trip_id = 9001 WHERE id = 2').run()
  try {
    await login(page)
    await page.goto('/#/dashboard/trips/9002')
    await expect(page.getByRole('heading', { name: 'Active split trip' })).toBeVisible()
    await page.getByRole('link', { name: '行程', exact: true }).click()
    await expect(page).toHaveURL(/#\/trips$/)
    await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
    expect(db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()?.current_trip_id).toBe(9001)
  } finally {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(previous ?? null)
    db.close()
  }
})

test('Trips shows empty current-trip guidance from the dashboard', async ({ page }) => {
  const db = new DatabaseSync(process.env.GOGO_E2E_DB_PATH!)
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 5').get()?.current_trip_id
  db.prepare('UPDATE app_user SET current_trip_id = NULL WHERE id = 5').run()
  try {
    await login(page, 'eve@example.com')
    await page.getByRole('link', { name: '行程', exact: true }).click()
    await expect(page).toHaveURL(/#\/trips$/)
    await expect(page.getByText('还没有当前行程')).toBeVisible()
    await expect(page.getByRole('link', { name: '去我的行程选择' })).toHaveAttribute('href', '#/my-trips')
  } finally {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 5').run(previous ?? null)
    db.close()
  }
})

test('Split shares the Trips empty state without a current trip outside dashboard context', async ({ page }) => {
  const db = new DatabaseSync(process.env.GOGO_E2E_DB_PATH!)
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 5').get()?.current_trip_id
  db.prepare('UPDATE app_user SET current_trip_id = NULL WHERE id = 5').run()
  try {
    await login(page, 'eve@example.com')
    await page.goto('/#/trips')
    await expect(page.getByText('还没有当前行程')).toBeVisible()
    const navigation = page.getByRole('navigation', { name: '主导航' })
    await expect(navigation.getByRole('link', { name: '分队', exact: true })).toHaveAttribute('href', '#/trips')
    await navigation.getByRole('link', { name: '分队', exact: true }).click()
    await expect(page).toHaveURL(/#\/trips$/)
    await expect(navigation.getByRole('link', { name: '行程', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(navigation.getByRole('link', { name: '分队', exact: true })).not.toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('还没有当前行程')).toBeVisible()
    await expect(page.getByRole('link', { name: '去我的行程选择' })).toHaveAttribute('href', '#/my-trips')
    expect(db.prepare('SELECT current_trip_id FROM app_user WHERE id = 5').get()?.current_trip_id).toBeNull()
  } finally {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 5').run(previous ?? null)
    db.close()
  }
})

test('Trips reports current-trip read failure and retries', async ({ page }) => {
  await login(page)
  await page.goto('/#/dashboard/trips/9001')
  await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
  await page.route('**/api/trips/current', (route) => route.fulfill({ status: 503, json: { message: '服务不可用' } }))
  await page.getByRole('link', { name: '行程', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('服务不可用')
  await expect(page.getByText('还没有当前行程')).toHaveCount(0)
  await page.unroute('**/api/trips/current')
  await page.getByRole('button', { name: '重试' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('dashboard offers selection when no current trip exists and reports lookup errors', async ({ page }) => {
  await login(page, 'eve@example.com')
  await expect(page.getByText('尚未选择行程')).toBeVisible()
  await expect(page.getByRole('link', { name: '去我的行程选择' })).toHaveAttribute('href', '#/my-trips')
  await page.route('**/api/trips/current', (route) => route.fulfill({ status: 503, json: { message: '服务不可用' } }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('服务不可用')
})

test('trip-number lookup opens member details and validates invalid input', async ({ page }) => {
  await login(page)
  await page.goto('/#/dashboard/trip-entry')
  const input = page.getByLabel('按编号打开行程')
  await expect(input).toBeEnabled()
  await input.fill('0')
  await page.getByRole('button', { name: '打开行程' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await input.fill('9001')
  await page.getByRole('button', { name: '打开行程' }).click()
  await expect(page).toHaveURL(/#\/trips\/9001$/)
  await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
})

test('deep-linked missing and forbidden trips keep their states', async ({ page }) => {
  await login(page, 'eve@example.com')
  await page.goto('/#/dashboard/trip-entry')
  await page.getByLabel('按编号打开行程').fill('9001')
  await page.getByRole('button', { name: '打开行程' }).click()
  await expect(page.getByText('没有访问权限', { exact: true })).toBeVisible()
  await page.goto('/#/dashboard/trip-entry')
  await page.getByLabel('按编号打开行程').fill('999999')
  await page.getByRole('button', { name: '打开行程' }).click()
  await expect(page.getByText('行程不存在', { exact: true })).toBeVisible()
})

test('members tab falls back to the current trip when no trip context is set', async ({ page }) => {
  const db = new DatabaseSync(process.env.GOGO_E2E_DB_PATH!)
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()?.current_trip_id
  try {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(9001)
    await login(page, 'ben@example.com')
    await page.goto('/#/members')
    await expect(page.getByRole('region', { name: '成员列表' })).toBeVisible()
  } finally {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(previous ?? null)
    db.close()
  }
})

test('dashboard quick links use existing pages without unavailable actions', async ({ page }) => {
  await login(page)
  await page.goto('/#/dashboard/trips/9001')
  const quick = page.getByRole('region', { name: '快捷入口' })
  await expect(quick.getByRole('link', { name: /创建行程/ })).toHaveAttribute('href', '#/create')
  await expect(quick.getByRole('link', { name: /邀请朋友/ })).toHaveAttribute('href', '#/dashboard/trips/9001/invite')
  await expect(quick.getByRole('link', { name: /我的偏好/ })).toHaveAttribute('href', '#/dashboard/trips/9001/preferences')
  await expect(quick.getByRole('link', { name: /主线方案/ })).toHaveAttribute('href', '#/dashboard/trips/9001/main-plan')
  await expect(page.getByRole('button', { name: /会合导航/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /完成行程/ })).toHaveCount(0)
  await quick.getByRole('link', { name: /我的偏好/ }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9001\/preferences$/)
})

test('dashboard create trip quick link opens the same creation page as my trips', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await page.goto('/#/dashboard/trips/9001')
  const quick = page.getByRole('region', { name: '快捷入口' })
  const create = quick.getByRole('link', { name: /创建行程/ })
  const invite = quick.getByRole('link', { name: /邀请朋友/ })
  const createBox = await create.boundingBox()
  const inviteBox = await invite.boundingBox()
  expect(createBox).not.toBeNull()
  expect(inviteBox).not.toBeNull()
  expect(createBox!.x).toBeLessThan(inviteBox!.x)
  expect(createBox!.y).toBe(inviteBox!.y)
  await create.click()
  await expect(page).toHaveURL(/#\/create$/)
  await expect(page.getByText('创建行程', { exact: true }).first()).toBeVisible()
})

test('member can share an invitation from the dashboard', async ({ page }) => {
  await login(page)
  await page.goto('/#/dashboard/trips/9001')
  await page.getByRole('region', { name: '快捷入口' }).getByRole('link', { name: /邀请朋友/ }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9001\/invite$/)
  await expect(page.getByLabel('Invitation URL')).toBeVisible()
  await expect(page.getByLabel('Invitation QR code')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Invitation URL')).toBeVisible()
  await page.getByRole('link', { name: 'Back' }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9001$/)
})

test('organizer and member share one invitation in detail and dedicated views while outsiders are denied', async ({ page, browser }) => {
  const db = new DatabaseSync(process.env.GOGO_E2E_DB_PATH!)
  db.exec('PRAGMA busy_timeout = 5000')
  const memberContext = await browser.newContext()
  const outsiderContext = await browser.newContext()
  try {
    db.prepare(`INSERT INTO trip (id, name, destination, start_date, end_date, organizer_id)
      VALUES (9015, 'Invitation sharing trip', 'Singapore', '2026-12-10', '2026-12-12', 1)`).run()
    db.prepare('INSERT INTO trip_member (trip_id, user_id, ready) VALUES (9015, 1, 0), (9015, 2, 0)').run()
    const member = await memberContext.newPage()
    const outsider = await outsiderContext.newPage()
    await login(page, 'alice@example.com')
    await login(member)
    await login(outsider, 'eve@example.com')
    let sharedUrl = ''
    for (const viewer of [member, page]) {
      await viewer.goto('/#/trips/9015')
      await expect(viewer.getByLabel('Invitation QR code')).toBeVisible()
      const url = await viewer.getByLabel('Invitation URL').inputValue()
      expect(url).toContain('#/join/')
      if (sharedUrl) expect(url).toBe(sharedUrl)
      sharedUrl = url
      await viewer.locator('.appbar').getByRole('link', { name: '邀请朋友' }).click()
      await expect(viewer).toHaveURL(/#\/trips\/9015\/invitation$/)
      await expect(viewer.getByRole('navigation', { name: '主导航' })).toHaveCount(0)
      await expect(viewer.getByLabel('Invitation URL')).toHaveValue(sharedUrl)
      await expect(viewer.getByLabel('Invitation QR code')).toBeVisible()
      await viewer.context().grantPermissions(['clipboard-read', 'clipboard-write'])
      const writes: string[] = []
      const recordWrite = (request: Request) => {
        if (request.url().includes('/api/trips/') && request.method() !== 'GET') writes.push(request.method())
      }
      viewer.on('request', recordWrite)
      await viewer.getByRole('button', { name: 'Copy invitation link' }).click()
      await expect.poll(() => viewer.evaluate(() => navigator.clipboard.readText())).toBe(sharedUrl)
      viewer.off('request', recordWrite)
      expect(writes).toEqual([])
      await viewer.getByRole('link', { name: 'Back' }).click()
      await expect(viewer).toHaveURL(/#\/trips\/9015$/)
      await expect(viewer.getByRole('heading', { name: 'Invitation sharing trip' })).toBeVisible()
      await viewer.locator('.appbar').getByRole('link', { name: '邀请朋友' }).click()
      await expect(viewer.getByLabel('Invitation URL')).toHaveValue(sharedUrl)
      await viewer.goto('/#/dashboard/trips/9015/invite')
      await expect(viewer.getByLabel('Invitation URL')).toHaveValue(sharedUrl)
    }
    expect(db.prepare('SELECT COUNT(*) AS count FROM trip_invitation WHERE trip_id = 9015').get()?.count).toBe(1)
    for (const path of ['/#/trips/9015', '/#/trips/9015/invitation', '/#/dashboard/trips/9015/invite']) {
      await outsider.goto(path)
      await expect(outsider.getByText('没有访问权限', { exact: true })).toBeVisible()
      await expect(outsider.getByLabel('Invitation URL')).toHaveCount(0)
      await expect(outsider.getByLabel('Invitation QR code')).toHaveCount(0)
    }
  } finally {
    await memberContext.close()
    await outsiderContext.close()
    db.prepare('DELETE FROM trip_invitation WHERE trip_id = 9015').run()
    db.prepare('DELETE FROM trip_member WHERE trip_id = 9015').run()
    db.prepare('DELETE FROM trip WHERE id = 9015').run()
    db.close()
  }
})

test('invitation page denies access to non-members', async ({ page }) => {
  await login(page, 'eve@example.com')
  await page.goto('/#/dashboard/trips/9001/invite')
  await expect(page.getByText('没有访问权限', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Invitation URL')).toHaveCount(0)
})

test('dashboard colors milestones from saved progress and arranges quick entries in two columns', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await page.goto('/#/dashboard/trips/9002')
  const progress = page.getByRole('region', { name: '旅程进度' })
  const nodes = progress.locator('li')
  await expect(nodes.nth(0)).toHaveAttribute('data-state', 'done')
  await expect(nodes.nth(1)).toHaveAttribute('data-state', 'done')
  await expect(nodes.nth(1)).toHaveAccessibleName('邀请：已关闭，已完成')
  await expect(nodes.nth(2)).toHaveAttribute('data-state', 'done')
  await expect(nodes.nth(3)).toHaveAttribute('data-state', 'active')
  await expect(nodes).toHaveCount(4)
  await expect(nodes.nth(2)).toHaveAccessibleName('主线：已确认，已完成')
  const colors = await nodes.evaluateAll((items) => items.map((item) =>
    getComputedStyle(item.querySelector('.dashboard-progress-icon')!).backgroundColor))
  expect(colors[0]).not.toBe(colors[3])
  const next = page.getByRole('region', { name: '下一步' })
  await expect(next).toContainText('分队规划进行中')
  await expect(next.getByRole('link', { name: '查看分队规划' })).toHaveAttribute('href', '/trips/9002/split?from=dashboard')
  const quick = page.getByRole('region', { name: '快捷入口' })
  const first = await quick.getByRole('link', { name: /创建行程/ }).boundingBox()
  const second = await quick.getByRole('link', { name: /邀请朋友/ }).boundingBox()
  const third = await quick.getByRole('link', { name: /我的偏好/ }).boundingBox()
  expect(first).not.toBeNull()
  expect(second).not.toBeNull()
  expect(third).not.toBeNull()
  expect(second!.x).toBeGreaterThan(first!.x)
  expect(second!.y).toBe(first!.y)
  expect(third!.y).toBeGreaterThan(first!.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await next.getByRole('link', { name: '查看分队规划' }).click()
  await expect(page).toHaveURL(/\/trips\/9002\/split\?from=dashboard$/)
  await expect(page.getByText('分队进行中')).toBeVisible()
})
