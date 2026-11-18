import { expect, test } from '@playwright/test'

test('a seeded member can authenticate against the isolated backend', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('邮箱').fill('ben@example.com')
  await page.getByLabel('密码').fill('gogo-demo-2026')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByText('你好，Ben')).toBeVisible()
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible()
})
