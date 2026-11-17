import { expect, test, type Page } from '@playwright/test'
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
  await page.getByRole('link', { name: '行程', exact: true }).click()
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

test('trip-number lookup preserves missing and forbidden trip responses', async ({ page }) => {
  await login(page, 'eve@example.com')
  await page.getByRole('link', { name: '行程', exact: true }).click()
  await page.getByLabel('按编号打开行程').fill('9001')
  await page.getByRole('button', { name: '打开行程' }).click()
  await expect(page.getByText('没有访问权限', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: '仪表盘', exact: true }).click()
  await page.getByRole('link', { name: '行程', exact: true }).click()
  await page.getByLabel('按编号打开行程').fill('999999')
  await page.getByRole('button', { name: '打开行程' }).click()
  await expect(page.getByText('行程不存在', { exact: true })).toBeVisible()
})

test('dashboard quick links use existing pages without unavailable actions', async ({ page }) => {
  await login(page)
  await page.goto('/#/dashboard/trips/9001')
  const quick = page.getByRole('region', { name: '快捷入口' })
  await expect(quick.getByRole('link', { name: /邀请朋友/ })).toHaveAttribute('href', '#/dashboard/trips/9001/invite')
  await expect(quick.getByRole('link', { name: /我的偏好/ })).toHaveAttribute('href', '#/dashboard/trips/9001/preferences')
  await expect(quick.getByRole('link', { name: /主线方案/ })).toHaveAttribute('href', '#/dashboard/trips/9001/main-plan')
  await expect(page.getByRole('button', { name: /会合导航/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /完成行程/ })).toHaveCount(0)
  await quick.getByRole('link', { name: /我的偏好/ }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9001\/preferences$/)
})

test('invitation page keeps member and non-member access restrictions', async ({ page }) => {
  await login(page)
  await page.goto('/#/dashboard/trips/9001')
  await page.getByRole('region', { name: '快捷入口' }).getByRole('link', { name: /邀请朋友/ }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9001\/invite$/)
  await expect(page.getByText('只有组织者可以分享邀请链接')).toBeVisible()
  await expect(page.getByLabel('Invitation URL')).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('只有组织者可以分享邀请链接')).toBeVisible()
  await page.getByRole('link', { name: 'Back' }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trips\/9001$/)
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
  await expect(nodes.nth(2)).toHaveAttribute('data-state', 'active')
  await expect(nodes.nth(3)).toHaveAttribute('data-state', 'pending')
  await expect(nodes.nth(1)).toHaveAccessibleName('主线：已确认，已完成')
  const colors = await nodes.evaluateAll((items) => items.map((item) =>
    getComputedStyle(item.querySelector('.dashboard-progress-icon')!).backgroundColor))
  expect(colors[0]).not.toBe(colors[2])
  expect(colors[2]).not.toBe(colors[3])
  const next = page.getByRole('region', { name: '下一步' })
  await expect(next).toContainText('分队规划进行中')
  await expect(next.getByRole('link', { name: '查看分队规划' })).toHaveAttribute('href', '/trips/9002/split?from=dashboard')
  const quick = page.getByRole('region', { name: '快捷入口' })
  const first = await quick.getByRole('link', { name: /邀请朋友/ }).boundingBox()
  const second = await quick.getByRole('link', { name: /我的偏好/ }).boundingBox()
  const third = await quick.getByRole('link', { name: /主线方案/ }).boundingBox()
  expect(first).not.toBeNull()
  expect(second).not.toBeNull()
  expect(third).not.toBeNull()
  expect(second!.x).toBeGreaterThan(first!.x)
  expect(second!.y).toBe(first!.y)
  expect(third!.y).toBeGreaterThan(first!.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await next.getByRole('link', { name: '查看分队规划' }).click()
  await expect(page).toHaveURL(/\/trips\/9002\/split\?from=dashboard$/)
  await expect(page.getByText('分队草稿进行中')).toBeVisible()
})
