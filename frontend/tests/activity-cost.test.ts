import test from 'node:test'
import assert from 'node:assert/strict'
import { activityCostCents, currencySymbol, formatActivityCost } from '../src/lib/activity-cost.ts'

test('A1 a stored per-stop amount always wins over the mock book', () => {
  assert.equal(activityCostCents('日月贝（珠海大剧院）', 9900), 9900)
  assert.equal(activityCostCents('太平山顶与凌霄阁', 0), 0)
})

test('A2 the simulated Zhuhai and Hong Kong itineraries carry their own prices', () => {
  assert.equal(activityCostCents('日月贝（珠海大剧院）'), 4000)
  assert.equal(activityCostCents('珠海长隆海洋王国'), 35000)
  assert.equal(activityCostCents('西九文化区 M+ 博物馆'), 12000)
  assert.equal(activityCostCents('天星小轮（尖沙咀 → 中环）'), 400)
  assert.equal(activityCostCents('香港迪士尼乐园'), 63900)
})

test('A3 genuinely free stops stay free, unknown stops claim nothing', () => {
  assert.equal(activityCostCents('情侣路'), 0)
  assert.equal(activityCostCents('尖沙咀'), 0)
  // 未收录的站不能凭空报「免费」
  assert.equal(activityCostCents('Kyoto Station'), null)
  assert.equal(formatActivityCost(activityCostCents('Kyoto Station')), null)
})

test('A4 cost labels follow the trip currency and drop trailing zeros', () => {
  assert.equal(formatActivityCost(0, '香港'), '免费')
  assert.equal(formatActivityCost(12000, '香港'), 'HK$120')
  assert.equal(formatActivityCost(400, '香港'), 'HK$4')
  assert.equal(formatActivityCost(35000, '珠海'), '¥350')
  assert.equal(formatActivityCost(9500, '伦敦'), '£95')
  assert.equal(formatActivityCost(1500, 'Singapore'), 'S$15')
  assert.equal(formatActivityCost(10550, '珠海'), '¥105.50')
  assert.equal(formatActivityCost(null, '珠海'), null)
})

test('A5 currency falls back to CNY for unmatched destinations', () => {
  assert.equal(currencySymbol('重庆'), '¥')
  assert.equal(currencySymbol(null), '¥')
  assert.equal(currencySymbol('Hong Kong'), 'HK$')
})