import { expect, test } from '@playwright/test'

/**
 * US-087/US-088 browser acceptance: inline A/B route editing, the save-then-check Next action, the blocking timing
 * dialog, the read-only preview hand-off, the old Screen 14 redirect and the terminal read-only state. The fixture
 * trips come from tests/fixtures/split-route-edit.sql (9101 active, 9102 confirmed) on an isolated database.
 */
test.describe.configure({ mode: 'serial' })

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/')
  await page.getByLabel('邮箱').fill(email)
  await page.getByLabel('密码').fill('gogo-demo-2026')
  await page.getByRole('button', { name: '登录', exact: true }).click()
}

async function login(page: import('@playwright/test').Page) {
  await loginAs(page, 'ben@example.com')
  await expect(page.getByText('嗨，Ben')).toBeVisible()
}

test('step-2 editing validates the window and hands off to the preview', async ({ page }) => {
  await login(page)
  await page.goto('/trips/9101/split/routes')

  await expect(page.getByText('National Gallery Singapore').first()).toBeVisible()
  await expect(page.getByText('主线·National Gallery Singapore')).toHaveCount(0)
  // Time and budget share one card: the separate activity card and its (unimplemented) AI button are gone.
  await expect(page.getByText(/组活动与费用/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: /AI 推荐活动/ })).toHaveCount(0)
  await expect(page.getByText(/人均/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'A 组 编辑第 2 站' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'A 组 编辑路程 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'A 组 编辑路程 3' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'B 组 编辑路程 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'B 组 编辑路程 2' })).toBeVisible()

  // Adding a station opens a blank editor (placeholder only), so the user never has to delete a prefilled name.
  await page.getByRole('button', { name: '添加站点' }).last().click()
  const newStation = page.getByLabel('B 组 第 2 站名称')
  await expect(newStation).toHaveValue('')
  await expect(newStation).toHaveAttribute('placeholder', '新站点')
  await page.getByLabel('B 组 删除第 2 站').click()
  await expect(page.getByLabel('B 组 第 2 站名称')).toHaveCount(0)

  await page.getByRole('button', { name: 'A 组 编辑第 2 站' }).click()
  const step2 = page.getByLabel('A 组 第 2 站名称')
  await expect(step2).toHaveValue('National Gallery Singapore')
  await step2.fill('National Gallery (edited)')
  await page.getByLabel('A 组 第 2 站停留分钟').fill('20')
  await page.getByRole('button', { name: 'A 组 完成编辑第 2 站' }).click()
  await expect(page.getByText('National Gallery (edited)').first()).toBeVisible()
  await expect(page.getByText('合计 140 分').first()).toBeVisible()

  await page.getByRole('button', { name: 'A 组 编辑第 3 站' }).click()
  const step3 = page.getByLabel('A 组 第 3 站停留分钟')
  await step3.fill('40')
  await page.getByRole('button', { name: 'A 组 完成编辑第 3 站' }).click()
  await page.getByRole('button', { name: /下一步/ }).click()

  const dialog = page.getByRole('dialog', { name: '时间窗校验未通过' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('超窗 15 分')).toBeVisible()
  await expect(page).toHaveURL(/\/split\/rounds\/1\/routes$/)
  await dialog.getByRole('button', { name: '关闭' }).last().click()
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'A 组 编辑第 3 站' }).click()
  await page.getByLabel('A 组 第 3 站停留分钟').fill('15')
  await page.getByRole('button', { name: 'A 组 完成编辑第 3 站' }).click()
  await page.getByRole('button', { name: /下一步/ }).click()
  await expect(page).toHaveURL(/\/split\/rounds\/1\/preview$/)
  await expect(page.getByText('队伍路线预览')).toBeVisible()
  await expect(page.getByText('只读预览 · 不能在此编辑路线')).toBeVisible()
  await expect(page.getByText('A 组 2 人')).toBeVisible()

  await page.getByRole('button', { name: /下一步/ }).click()
  await expect(page).toHaveURL(/\/split\/rounds\/1\/confirm$/)
  await expect(page.getByText('复核并确认分队')).toBeVisible()

  // N2: with no local changes the Next action skips the save request entirely.
  await page.goto('/trips/9101/split/routes')
  await page.getByRole('button', { name: 'A 组 编辑第 2 站' }).click()
  await expect(page.getByLabel('A 组 第 2 站停留分钟')).toHaveValue('20')
  await page.getByRole('button', { name: 'A 组 完成编辑第 2 站' }).click()
  let saves = 0
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().endsWith('/split-draft/rounds/1/routes')) saves += 1
  })
  await page.getByRole('button', { name: /下一步/ }).click()
  await expect(page).toHaveURL(/\/split\/rounds\/1\/preview$/)
  expect(saves).toBe(0)

  // N10: a cleared minute is rejected by the save endpoint and keeps the user on step 2.
  await page.goto('/trips/9101/split/routes')
  await page.getByRole('button', { name: 'A 组 编辑第 2 站' }).click()
  await page.getByLabel('A 组 第 2 站停留分钟').fill('')
  await page.getByRole('button', { name: 'A 组 完成编辑第 2 站' }).click()
  await page.getByRole('button', { name: /下一步/ }).click()
  await expect(page.getByText(/路线输入非法/)).toBeVisible()
  await expect(page).toHaveURL(/\/split\/rounds\/1\/routes$/)

  // N8: the retired Screen 14 URL lands on the preview instead of a timing form.
  await page.goto('/trips/9101/split/timing')
  await expect(page).toHaveURL(/\/split\/rounds\/1\/preview$/)
  await expect(page.getByText('队伍路线预览')).toBeVisible()
})

test('the per-stop cost is edited on the same card and persisted through the activity write', async ({ page }) => {
  // Only the initiator may write costed activities (backend gate), so this flow runs as alice.
  await loginAs(page, 'alice@example.com')
  await expect(page.getByText(/嗨/)).toBeVisible()
  await page.goto('/trips/9101/split/routes')

  const activityWrites: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().endsWith('/split-draft/rounds/1/activities')) activityWrites.push(request.url())
  })

  await page.getByRole('button', { name: 'A 组 编辑第 1 站' }).click()
  await page.getByLabel('A 组 第 1 站人均费用').fill('8')
  await page.getByRole('button', { name: 'A 组 完成编辑第 1 站' }).click()
  await expect(page.getByText('S$8').first()).toBeVisible()

  await page.getByRole('button', { name: /下一步/ }).click()
  await expect(page).toHaveURL(/\/split\/rounds\/1\/preview$/)
  expect(activityWrites).toHaveLength(1)

  // Reloading shows the saved cost in the same row, matched to the stop by name.
  await page.goto('/trips/9101/split/routes')
  await page.getByRole('button', { name: 'A 组 编辑第 1 站' }).click()
  await expect(page.getByLabel('A 组 第 1 站人均费用')).toHaveValue('8')
})

test('confirmed draft shows the preview and route cards read-only', async ({ page }) => {
  await login(page)
  await page.goto('/trips/9102/split/routes')
  await expect(page.getByLabel('A 组 第 2 站名称')).toHaveCount(0)
  await expect(page.getByText('City Hall MRT → Gardens by the Bay').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /下一步/ })).toHaveCount(0)

  await page.goto('/trips/9102/split/preview')
  await expect(page.getByText('队伍路线预览')).toBeVisible()
  await expect(page.getByText('已确认', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /下一步/ })).toHaveCount(0)
})
