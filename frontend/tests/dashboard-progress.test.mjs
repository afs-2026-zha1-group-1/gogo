import assert from 'node:assert/strict'
import test from 'node:test'
import { dashboardMilestones, dashboardNextStep } from '../src/pages/dashboardProgress.ts'

const sources = {
  mainPlanConfirmed: false,
  readyCount: 3,
  memberCount: 4,
  viewerReady: false,
  plan: 'stale',
  split: 'absent',
}

test('milestones represent independent facts and retain unknown reunion and completion', () => {
  assert.deepEqual(dashboardMilestones(sources), [
    { label: '建局', detail: '已创建' },
    { label: '邀请', detail: '开放' },
    { label: '偏好', detail: '3/4' },
    { label: '主线', detail: '草稿已过期' },
    { label: '分队', detail: '未发起' },
    { label: '会合', detail: '未知' },
    { label: '完成', detail: '未知' },
  ])
})

test('plan and split statuses remain distinct', () => {
  for (const [plan, detail] of [
    ['absent', '未生成'], ['draft', '草稿'], ['stale', '草稿已过期'], ['confirmed', '已确认'],
  ]) {
    assert.equal(dashboardMilestones({ ...sources, plan })[3].detail, detail)
  }
  for (const [split, detail] of [
    ['absent', '未发起'], ['active', '进行中'], ['confirmed', '已确认'], ['cancelled', '已取消'],
  ]) {
    assert.equal(dashboardMilestones({ ...sources, split })[4].detail, detail)
  }
  assert.equal(dashboardMilestones({ ...sources, mainPlanConfirmed: true })[1].detail, '已关闭')
})

test('recommendation uses viewer readiness or confirmed main plan', () => {
  assert.equal(dashboardNextStep(sources), 'preferences')
  assert.equal(dashboardNextStep({ ...sources, viewerReady: true }), 'main-plan')
  assert.equal(dashboardNextStep({ ...sources, mainPlanConfirmed: true }), 'main-plan')
})
