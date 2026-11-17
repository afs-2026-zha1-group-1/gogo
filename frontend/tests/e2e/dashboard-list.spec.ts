import { expect, test, type Page } from '@playwright/test'
import { DatabaseSync } from 'node:sqlite'

function isolatedDatabase() {
  const path = process.env.GOGO_E2E_DB_PATH
  if (!path) throw new Error('Missing isolated browser database')
  return new DatabaseSync(path)
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

test('lists member trips, hides other trips and opens the selected dashboard', async ({ browser, page }) => {
  const aliceContext = await browser.newContext()
  const alicePage = await aliceContext.newPage()
  try {
    await login(alicePage, 'alice@example.com')
    await createTrip(alicePage, 'Private D', 'Private destination')
  } finally {
    await aliceContext.close()
  }

  await login(page, 'ben@example.com')
  const tripB = await createTrip(page, 'Trip B', 'Penang')
  await createTrip(page, 'Trip C', 'Malacca')
  await page.reload()
  await expect(page.getByText('Singapore Friends Day')).toBeVisible()
  const cardB = page.getByRole('link', { name: /Trip B/ })
  await expect(cardB).toContainText('Penang')
  await expect(cardB).toContainText('2026-12-10')
  await expect(cardB).toContainText('2026-12-12')
  await expect(page.getByRole('link', { name: /Trip C/ })).toBeVisible()
  await expect(page.getByText('Private D')).toHaveCount(0)
  await expect(page.getByText('Private destination')).toHaveCount(0)
  await expect(page.getByText('进行中', { exact: true })).toHaveCount(0)
  await cardB.click()
  await expect(page).toHaveURL(new RegExp(`#/dashboard/trips/${tripB.id}$`))
  await expect(page.getByRole('link', { name: '仪表盘' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('你好，Ben')).toBeVisible()
})

test('signed-out visitors cannot see member trip cards', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible()
  await expect(page.getByText('Singapore Friends Day')).toHaveCount(0)
})

test('shows an honest empty state for a member with no trips', async ({ page }) => {
  await login(page, 'eve@example.com')
  await expect(page.getByText('暂无行程')).toBeVisible()
  await expect(page.getByText('Singapore Friends Day')).toHaveCount(0)
})

test('shows loading and errors rather than an empty list when the list read fails', async ({ page }) => {
  await login(page, 'eve@example.com')
  let release: (() => void) | undefined
  const paused = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/api/trips', async (route) => {
    await paused
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"code":"UNAVAILABLE"}' })
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('正在加载行程…')).toBeVisible()
  release?.()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText('暂无行程')).toHaveCount(0)
})

for (const [startDate, endDate] of [
  ['2026-02-30', '2026-03-01'],
  ['2026-12-12', '2026-12-10'],
]) {
  test(`rejects invalid trip card dates ${startDate} to ${endDate}`, async ({ page }) => {
    await login(page, 'eve@example.com')
    await page.route('**/api/trips', (route) => route.fulfill({
      json: { trips: [{ id: 1, name: 'Invalid trip', destination: 'Somewhere', startDate, endDate }] },
    }))
    await page.reload()
    await expect(page.getByRole('alert')).toContainText('行程列表数据无效')
    await expect(page.getByText('Invalid trip')).toHaveCount(0)
  })
}

test('rejects a malformed trip-list envelope', async ({ page }) => {
  await login(page, 'eve@example.com')
  await page.route('**/api/trips', (route) => route.fulfill({ json: [] }))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('行程列表数据无效')
  await expect(page.getByText('暂无行程')).toHaveCount(0)
})

test('opening a trip by id from the dock is unavailable while details are unsafe', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.getByRole('link', { name: '行程', exact: true }).click()
  await expect(page.getByLabel('按编号打开行程')).toBeDisabled()
  await expect(page.getByRole('button', { name: '即将推出' })).toBeDisabled()
  await expect(page).toHaveURL(/#\/dashboard\/trip-entry$/)
})

test('trip tab from dashboard shows the coming-soon details state even with a remembered trip', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.evaluate(() => { window.location.hash = '#/trips/9001/main-plan' })
  await expect(page.getByText('草稿', { exact: false }).first()).toBeVisible()
  await page.getByRole('link', { name: '仪表盘', exact: true }).click()
  await page.getByRole('link', { name: /Stale draft trip/ }).click()
  await page.getByRole('link', { name: '行程', exact: true }).click()
  await expect(page).toHaveURL(/#\/dashboard\/trip-entry$/)
  await expect(page.getByText('行程详情即将推出', { exact: false })).toBeVisible()
})

test('refreshing a dashboard-origin dock page does not expose current-trip details', async ({ page }) => {
  await login(page, 'alice@example.com')
  await page.getByRole('link', { name: /Stale draft trip/ }).click()
  await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
  await page.getByRole('link', { name: '成员', exact: true }).click()
  await expect(page.getByRole('region', { name: '成员列表' })).toBeVisible()
  await page.reload()
  await page.getByRole('link', { name: '行程', exact: true }).click()
  await expect(page.getByText('行程详情即将推出', { exact: false })).toBeVisible()
})

test('the existing direct trip-details route remains available to a member', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.evaluate(() => { window.location.hash = '#/trips/9001' })
  await expect(page.getByRole('heading', { name: 'Stale draft trip' })).toBeVisible()
  await expect(page.getByRole('link', { name: '行程', exact: true })).toHaveAttribute('aria-current', 'page')
})

test('a dashboard selection becomes the trip used by members and split tabs', async ({ page }) => {
  await login(page, 'ben@example.com')
  await page.getByRole('link', { name: /Stale draft trip/ }).click()
  await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
  await page.getByRole('link', { name: '成员', exact: true }).click()
  await expect(page.getByRole('region', { name: '成员列表' })).toBeVisible()
  await page.getByRole('link', { name: '分队', exact: true }).click()
  await expect(page.getByText('当前行程（#9001）', { exact: false })).toBeVisible()
})

test('dashboard selection does not overwrite the account current trip', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 2').get()
  try {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 2').run(9002)
    await login(page, 'ben@example.com')
    await page.getByRole('link', { name: /Stale draft trip/ }).click()
    await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
    await page.getByRole('link', { name: '分队', exact: true }).click()
    await expect(page.getByText('当前行程（#9001）', { exact: false })).toBeVisible()
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
    await page.getByRole('link', { name: /Stale draft trip/ }).click()
    await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
    const response = page.waitForResponse('**/api/trips/current')
    release?.()
    await response
    await page.getByRole('link', { name: '分队', exact: true }).click()
    await expect(page.getByText('当前行程（#9001）', { exact: false })).toBeVisible()
  } finally {
    release?.()
  }
})

test('dashboard trip tab does not open the saved current trip or issue an invitation', async ({ page }) => {
  const db = isolatedDatabase()
  const previous = db.prepare('SELECT current_trip_id FROM app_user WHERE id = 1').get()
  try {
    db.prepare('UPDATE app_user SET current_trip_id = ? WHERE id = 1').run(9002)
    await login(page, 'alice@example.com')
    const before = db.prepare('SELECT COUNT(*) AS count FROM trip_invitation').get()?.count
    await page.getByRole('link', { name: /Stale draft trip/ }).click()
    await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
    await page.getByRole('link', { name: '行程', exact: true }).click()
    await expect(page.getByText('行程详情即将推出', { exact: false })).toBeVisible()
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
    await page.getByRole('link', { name: '分队', exact: true }).click()
    await expect(page.getByText('请先在「行程」页打开一个行程', { exact: false })).toBeVisible()
    release?.()
    await expect(page.getByText('当前行程（#9001）', { exact: false })).toHaveCount(0)
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
    await page.getByRole('link', { name: '分队', exact: true }).click()
    await expect(page.getByText('请先在「行程」页打开一个行程', { exact: false })).toBeVisible()
    release?.()
    await expect(page.getByText('当前行程（#9002）', { exact: false })).toBeVisible()
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
  await page.getByRole('link', { name: '分队', exact: true }).click()
  await expect(page.getByText('请先在「行程」页打开一个行程', { exact: false })).toBeVisible()
  await expect(page.getByText('当前行程（#9002）', { exact: false })).toHaveCount(0)
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
    await page.evaluate(() => { window.location.hash = '#/split' })
    await expect(page.getByText('分队规划', { exact: true })).toBeVisible()
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
  await page.getByRole('link', { name: /Stale draft trip/ }).click()
  await expect(page.getByRole('region', { name: '旅程进度' })).toBeVisible()
  await page.getByRole('link', { name: '分队', exact: true }).click()
  await expect(page.getByText('当前行程（#9001）', { exact: false })).toBeVisible()
  await page.evaluate(() => { window.location.hash = '#/dashboard/trips/999999' })
  await expect(page.getByRole('alert')).toContainText('未找到行程')
  await page.getByRole('link', { name: '分队', exact: true }).click()
  await expect(page.getByText('请先在「行程」页打开一个行程', { exact: false })).toBeVisible()
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
    await expect(page.getByText('请先在「行程」页打开一个行程', { exact: false })).toBeVisible()
    await expect(page.getByText('当前行程（#9002）', { exact: false })).toHaveCount(0)
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
    await page.getByRole('link', { name: '分队', exact: true }).click()
    await expect(page.getByText('请先在「行程」页打开一个行程', { exact: false })).toBeVisible()
  } finally {
    release?.()
  }
})
