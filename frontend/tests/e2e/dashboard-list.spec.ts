import { expect, test, type Page } from '@playwright/test'
import { DatabaseSync } from 'node:sqlite'

function isolatedDatabase() {
  const path = process.env.GOGO_E2E_DB_PATH
  if (!path) throw new Error('Missing isolated browser database')
  const database = new DatabaseSync(path)
  database.exec('PRAGMA busy_timeout = 5000')
  return database
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

async function createTrip(page: Page, name: string, destination: string) {
  return page.evaluate(async ({ name, destination }) => {
    const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='))
    if (!cookie) throw new Error('Missing CSRF cookie')
    const response = await fetch('/api/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)),
      },
      body: JSON.stringify({ name, destination, startDate: '2026-12-10', endDate: '2026-12-12' }),
    })
    if (!response.ok) throw new Error(`Trip creation failed: HTTP ${response.status}`)
    return (await response.json()) as { id: number }
  }, { name, destination })
}

test('picker lists member trips and hides other trips', async ({ browser, page }) => {
  const aliceContext = await browser.newContext()
  const alicePage = await aliceContext.newPage()
  try {
    await login(alicePage, 'alice@example.com')
    await createTrip(alicePage, 'Private D', 'Private destination')
  } finally {
    await aliceContext.close()
  }

  await login(page, 'ben@example.com')
  await createTrip(page, 'Trip B', 'Penang')
  await createTrip(page, 'Trip C', 'Malacca')
  await page.goto('/#/my-trips')
  await expect(page.getByText('Singapore Friends Day')).toBeVisible()
  const cardB = page.getByRole('button', { name: /Trip B/ })
  await expect(cardB).toContainText('Penang')
  await expect(cardB).toContainText('2026-12-10')
  await expect(cardB).toContainText('2026-12-12')
  await expect(page.getByRole('button', { name: /Trip C/ })).toBeVisible()
  await expect(page.getByText('Private D')).toHaveCount(0)
  await expect(page.getByText('Private destination')).toHaveCount(0)
  await expect(page.getByText('进行中', { exact: true })).toHaveCount(0)
})

test('signed-out visitors cannot see member trip cards', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  await expect(page.getByText('Singapore Friends Day')).toHaveCount(0)
})

test('shows an honest empty state for a member with no trips', async ({ page }) => {
  await login(page, 'eve@example.com')
  await expect(page.getByText('当前还没有行程')).toBeVisible()
  await expect(page.getByText('Singapore Friends Day')).toHaveCount(0)
})

test('shows loading and errors rather than an empty dashboard when the current trip read fails', async ({ page }) => {
  await login(page, 'eve@example.com')
  let release: (() => void) | undefined
  const paused = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/trips/current', async (route) => {
    await paused
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"UNAVAILABLE"}' })
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('正在加载当前行程…')).toBeVisible()
  release?.()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText('当前还没有行程')).toHaveCount(0)
})

test('rejects a malformed current-trip response on the dashboard', async ({ page }) => {
  await login(page, 'eve@example.com')
  await page.route('**/api/trips/current', (route) => route.fulfill({ json: [] }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('当前行程数据无效')
  await expect(page.getByText('当前还没有行程')).toHaveCount(0)
})

test('opening a trip by id remains available through the dashboard guard', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.goto('/#/dashboard/trip-entry')
  await expect(page.getByLabel('按编号打开行程')).toBeEnabled()
  await expect(page.getByRole('button', { name: '打开行程' })).toBeEnabled()
  await expect(page).toHaveURL(/#\/dashboard\/trip-entry$/)
})

test('trip tab from dashboard opens the current-trip route', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.goto('/#/dashboard/trips/9001')
  await page.getByRole('link', { name: '行程', exact: true }).click()
  await expect(page).toHaveURL(/#\/trips$/)
})

test('refreshing a dashboard-origin dock page retains saved current-trip navigation', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 1').get()
  try {
    db.prepare('UPDATE app_user SET current_trip_id = 9002 WHERE id = 1').run()
    await login(page, 'alice@example.com')
    await page.goto('/#/dashboard/trips/9001')
    await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
    await page.getByRole('link', { name: '成员', exact: true }).click()
    await expect(page.getByRole('region', { name: '成员列表' })).toBeVisible()
    await page.reload()
    await page.getByRole('link', { name: '行程', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Active split trip' })).toBeVisible()
  } finally {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 1').run(previous?.current_trip_id ?? null)
    db.close()
  }
})

test('the existing direct trip-details route remains available to a member', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.evaluate(() => { window.location.hash = '#/trips/9001' })
  await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
  await expect(page.getByRole('link', { name: '行程', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('a dashboard selection becomes the trip used by members and split tabs', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.goto('/#/dashboard/trips/9001')
  await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
  await page.getByRole('link', { name: '成员', exact: true }).click()
  await expect(page.getByRole('region', { name: '成员列表' })).toBeVisible()
  await page.getByRole('link', { name: '分队', exact: true }).click()
  await expect(page).toHaveURL(/\/trips\/9001\/split\?from=dashboard$/)
})

test('dashboard selection does not overwrite the account current trip', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()
  try {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(9002)
    await login(page, 'ben@example.com')
    await page.goto('/#/dashboard/trips/9001')
    await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
    await page.getByRole('link', { name: '分队', exact: true }).click()
    await expect(page).toHaveURL(/\/trips\/9001\/split\?from=dashboard$/)
    expect(db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()?.current_trip_id).toBe(9002)
  } finally {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(previous?.current_trip_id ?? null)
    db.close()
  }
})

test('a late current-trip response cannot replace a dashboard selection', async ({ page }) => {
  await login(page, 'ben@example.com')
  let release: (() => void) | undefined
  let started: (() => void) | undefined
  const paused = new Promise<void>((resolve) => { release = resolve })
  const requested = new Promise<void>((resolve) => { started = resolve })
  await page.route('**/api/trips/current', async (route) => {
    started?.()
    await paused
    await route.fulfill({ json: { tripId: 9002 } })
  })
  try {
    await page.reload()
    await requested
    await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9001' })
    await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
    const response = page.waitForResponse('**/api/trips/current')
    release?.()
    await response
    await page.getByRole('link', { name: '分队', exact: true }).click()
    await expect(page).toHaveURL(/\/trips\/9001\/split\?from=dashboard$/)
  } finally {
    release?.()
  }
})

test('dashboard trip tab opens the saved current trip without changing it or issuing an invitation', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 1').get()
  try {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 1').run(9002)
    await login(page, 'alice@example.com')
    const before = db.prepare('SELECT COUNT(*) AS count FROM trip_invitation').get()?.count
    await page.goto('/#/dashboard/trips/9001')
    await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
    await page.getByRole('link', { name: '行程', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Active split trip' })).toBeVisible()
    expect(db.prepare('SELECT COUNT(*) AS count FROM trip_invitation').get()?.count).toBe(before)
    expect(db.prepare('SELECT current_trip_id FROM app_user WHERE id = 1').get()?.current_trip_id).toBe(9002)
  } finally {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 1').run(previous?.current_trip_id ?? null)
    db.close()
  }
})

test('direct current-trip route retains the main-branch behavior', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()
  try {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(9002)
    await login(page, 'ben@example.com')
    await page.goto('/#/trips')
    await expect(page.getByRole('heading', { name: 'Active split trip' })).toBeVisible()
  } finally {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(previous?.current_trip_id ?? null)
    db.close()
  }
})

test('the explicit trip picker persists selection and the non-dashboard trip tab opens it', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()
  try {
    await login(page, 'ben@example.com')
    await page.goto('/#/my-trips')
    await page.getByRole('button', { name: /Active split trip/ }).click()
    await expect(page.getByRole('button', { name: /Active split trip/ })).toHaveAttribute('aria-pressed', 'true')
    expect(db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()?.current_trip_id).toBe(9002)
    await page.getByRole('link', { name: '行程', exact: true }).click()
    await expect(page).toHaveURL(/#\/trips$/)
    await expect(page.getByRole('heading', { name: 'Active split trip' })).toBeVisible()
  } finally {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(previous?.current_trip_id ?? null)
    db.close()
  }
})

test('picker waits for the saved current trip before showing selected cards', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()
  let release: (() => void) | undefined
  const paused = new Promise<void>((resolve) => { release = resolve })
  try {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(9002)
    await login(page, 'ben@example.com')
    await page.route('**/api/trips/current', async (route) => {
      if (route.request().method() === 'GET') await paused
      await route.continue()
    })
    const listResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/trips' && response.request().method() === 'GET')
    await page.evaluate(() => { window.location.hash = '#/my-trips' })
    await listResponse
    await expect(page.getByText(/\d+ 个行程/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Active split trip/ })).toHaveCount(0)
    release?.()
    const selected = page.getByRole('button', { name: /Active split trip/ })
    await expect(selected).toHaveAttribute('aria-pressed', 'true')
    await expect(selected).toContainText('已选择')
    await expect(page.locator('.qcard.selected')).toHaveCount(1)
  } finally {
    release?.()
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(previous?.current_trip_id ?? null)
    db.close()
  }
})

test('picker changes cannot leave the previous trip active while current-trip refresh fails', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()
  let release: (() => void) | undefined
  try {
    await login(page, 'ben@example.com')
    await page.goto('/#/trips/9001')
    await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
    await page.evaluate(() => { window.location.hash = '#/my-trips' })
    await page.getByRole('button', { name: /Active split trip/ }).click()
    await expect(page.getByRole('button', { name: /Active split trip/ })).toHaveAttribute('aria-pressed', 'true')
    const paused = new Promise<void>((resolve) => { release = resolve })
    await page.route('**/api/trips/current', async (route) => {
      await paused
      await route.fulfill({ status: 503, json: { code: 'UNAVAILABLE' } })
    })
    await expect(page.getByRole('link', { name: '分队', exact: true })).toHaveAttribute('href', '#/trips')
    release?.()
    await expect(page.getByRole('link', { name: '分队', exact: true })).toHaveAttribute('href', '#/trips')
  } finally {
    release?.()
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(previous?.current_trip_id ?? null)
    db.close()
  }
})

test('a pending picker write cannot expose the previous trip in split', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()
  let release: (() => void) | undefined
  let started: (() => void) | undefined
  const paused = new Promise<void>((resolve) => { release = resolve })
  const requested = new Promise<void>((resolve) => { started = resolve })
  try {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(9001)
    await login(page, 'ben@example.com')
    await page.goto('/#/my-trips')
    await page.route('**/api/trips/current', async (route) => {
      if (route.request().method() === 'PUT') {
        started?.()
        await paused
      }
      await route.continue()
    })
    await page.getByRole('button', { name: /Active split trip/ }).click()
    await requested
    await expect(page.getByRole('link', { name: '分队', exact: true })).toHaveAttribute('href', '#/trips')
    await page.getByRole('link', { name: '行程', exact: true }).click()
    const response = page.waitForResponse((response) =>
      response.url().endsWith('/api/trips/current') && response.request().method() === 'PUT')
    release?.()
    await (await response).finished()
    await expect(page.getByRole('link', { name: '分队', exact: true })).toHaveAttribute('href', '/trips/9002/split')
  } finally {
    release?.()
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(previous?.current_trip_id ?? null)
    db.close()
  }
})

test('an invalid current-trip response does not become an active trip', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.route('**/api/trips/current', (route) => route.fulfill({ json: { tripId: '9002' } }))
  await page.evaluate(() => { window.location.hash = '#/my-trips' })
  await expect(page.getByRole('button', { name: /Stale draft trip/ })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('无法读取当前行程')
  await expect(page.getByRole('link', { name: '分队', exact: true })).toHaveAttribute('href', '#/trips')
})

test('picker reports a current-trip read failure even when the trip list is empty', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.route('**/api/trips', (route) => route.fulfill({ json: { trips: [] } }))
  await page.route('**/api/trips/current', (route) => route.fulfill({ status: 503, json: { message: '服务不可用' } }))
  await page.evaluate(() => { window.location.hash = '#/my-trips' })
  await expect(page.getByRole('alert')).toContainText('无法读取当前行程')
  await expect(page.locator('.empty').getByText('还没有行程', { exact: true })).toBeVisible()
})

test('direct current-trip navigation reports a malformed response', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.route('**/api/trips/current', (route) => route.fulfill({ json: { tripId: '9002' } }))
  await page.goto('/#/trips')
  await expect(page.getByText('当前行程加载失败')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Active split trip' })).toHaveCount(0)
})

test('a pending picker write prevents another selection after returning to the picker', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()
  const releases: Array<() => void> = []
  let requests = 0
  try {
    await login(page, 'ben@example.com')
    await page.goto('/#/my-trips')
    await page.route('**/api/trips/current', async (route) => {
      if (route.request().method() === 'PUT') {
        requests += 1
        await new Promise<void>((resolve) => releases.push(resolve))
      }
      await route.continue()
    })
    await page.getByRole('button', { name: /Active split trip/ }).click()
    await expect.poll(() => requests).toBe(1)
    await page.getByRole('link', { name: '行程', exact: true }).click()
    await expect(page).toHaveURL(/#\/trips$/)
    await page.evaluate(() => { window.location.hash = '#/my-trips' })
    await expect(page.getByRole('button', { name: /Stale draft trip/ })).toBeDisabled()
    expect(requests).toBe(1)
    const firstResponse = page.waitForResponse((response) =>
      response.url().endsWith('/api/trips/current') && response.request().method() === 'PUT')
    releases[0]()
    await (await firstResponse).finished()
    await expect.poll(() => db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()?.current_trip_id).toBe(9002)
    await expect(page.getByRole('button', { name: /Stale draft trip/ })).toBeEnabled()
  } finally {
    for (const release of releases) release()
    await page.unrouteAll({ behavior: 'wait' })
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(previous?.current_trip_id ?? null)
    db.close()
  }
})

test('non-dashboard main-plan back returns to trip details', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.goto('/#/trips/9001/main-plan')
  await expect(page.getByText('草稿', { exact: false }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Back' }).click()
  await expect(page).toHaveURL(/#\/trips\/9001$/)
  await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
})

test('a new or failed dashboard selection cannot retain an older trip', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.evaluate(() => { window.location.hash = '#/trips/9002/main-plan' })
  await expect(page.getByText('已确认', { exact: false }).first()).toBeVisible()
  await page.getByRole('link', { name: '仪表盘', exact: true }).click()
  await page.goto('/#/dashboard/trips/9001')
  await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
  await page.getByRole('link', { name: '分队', exact: true }).click()
  await expect(page).toHaveURL(/\/trips\/9001\/split\?from=dashboard$/)
  await page.goto('/#/dashboard/trips/999999')
  await expect(page.getByRole('alert')).toContainText('未找到行程')
  await expect(page.getByRole('link', { name: '分队', exact: true })).toHaveAttribute('href', '#/dashboard/trip-entry')
})

test('refresh after a failed dashboard selection does not restore a saved current trip', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()
  try {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(9002)
    await login(page, 'ben@example.com')
    await page.evaluate(() => { window.location.hash = '#/dashboard/trips/999999' })
    await expect(page.getByRole('alert')).toContainText('未找到行程')
    await page.getByRole('link', { name: '分队', exact: true }).click()
    await page.reload()
    await expect(page).toHaveURL(/#\/dashboard\/trip-entry$/)
    await expect(page.getByRole('link', { name: '分队', exact: true })).toHaveAttribute('href', '#/dashboard/trip-entry')
  } finally {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(previous?.current_trip_id ?? null)
    db.close()
  }
})

test('a pending dashboard selection cannot use an older trip in the split tab', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.evaluate(() => { window.location.hash = '#/trips/9002/main-plan' })
  await expect(page.getByText('已确认', { exact: false }).first()).toBeVisible()
  let release: (() => void) | undefined
  const paused = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/trips/9001/main-plan/inputs', async (route) => {
    await paused
    await route.continue()
  })
  try {
    await page.evaluate(() => { window.location.hash = '#/dashboard/trips/9001' })
    await expect(page.getByText('正在加载行程概览…')).toBeVisible()
    await expect(page.getByRole('link', { name: '分队', exact: true })).toHaveAttribute('href', '#/dashboard/trip-entry')
  } finally {
    release?.()
  }
})
