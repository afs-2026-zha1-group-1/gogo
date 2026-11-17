import assert from 'node:assert/strict'
import test from 'node:test'
import { dashboardMilestones, dashboardNextStep } from '../src/pages/dashboardProgress.ts'

const sources = {
  mainPlanConfirmed: false,
  readyCount: 3,
  memberCount: 4,
  viewerReady: false,
  isOrganizer: true,
  plan: 'stale',
  split: 'absent',
}

test('milestones represent independent facts and retain unknown reunion and completion', () => {
  assert.deepEqual(dashboardMilestones(sources), [
    { label: '建局', detail: '已创建', state: 'done' },
    { label: '偏好', detail: '本人待填写 · 3/4', state: 'active' },
    { label: '邀请', detail: '已有成员加入', state: 'done' },
    { label: '主线', detail: '草稿已过期', state: 'pending' },
    { label: '分队', detail: '未发起', state: 'pending' },
    { label: '会合', detail: '未知', state: 'pending' },
    { label: '完成', detail: '未知', state: 'pending' },
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
  assert.equal(dashboardMilestones({ ...sources, mainPlanConfirmed: true })[2].detail, '已关闭')
})

test('completed and active milestones follow saved readiness, plan and split state', () => {
  const completed = dashboardMilestones({
    ...sources, mainPlanConfirmed: true, readyCount: 4, viewerReady: true, plan: 'confirmed', split: 'confirmed',
  })
  assert.deepEqual(completed.map((item) => item.state),
    ['done', 'done', 'done', 'done', 'done', 'pending', 'pending'])
  const active = dashboardMilestones({ ...sources, split: 'active' })
  assert.equal(active[4].state, 'active')
  assert.equal(dashboardMilestones({ ...sources, split: 'cancelled' })[4].state, 'pending')
})

test('organizer completes preferences before inviting, and invited members start at preferences', () => {
  const solo = { ...sources, memberCount: 1, readyCount: 0, viewerReady: false, plan: 'absent' }
  assert.equal(dashboardNextStep(solo).destination, 'preferences')
  const ready = { ...solo, readyCount: 1, viewerReady: true }
  assert.deepEqual(dashboardNextStep(ready), {
    destination: 'invite', label: '邀请朋友', hint: '偏好已完成，邀请朋友加入行程。',
  })
  assert.equal(dashboardMilestones(ready)[2].state, 'active')
  assert.equal(dashboardNextStep({ ...ready, memberCount: 2 }).destination, 'main-plan/inputs')
  assert.equal(dashboardNextStep({ ...ready, plan: 'draft' }).destination, 'main-plan')
  const invited = { ...solo, isOrganizer: false }
  assert.equal(dashboardNextStep(invited).destination, 'preferences')
  assert.deepEqual(dashboardMilestones(invited).map((milestone) => milestone.label),
    ['偏好', '主线', '分队', '会合', '完成'])
})

test('recommendation reflects preferences, draft, confirmation and split progress', () => {
  assert.deepEqual(dashboardNextStep(sources), {
    destination: 'preferences', label: '查看我的偏好', hint: '先查看并完善你的兴趣偏好。',
  })
  assert.deepEqual(dashboardNextStep({ ...sources, viewerReady: true, plan: 'absent' }), {
    destination: 'main-plan/inputs',
    label: '准备主线方案',
    hint: '还有 1 位成员未提交偏好；可先查看成员偏好，为生成主线做准备。',
  })
  for (const [plan, hint] of [
    ['draft', '主线草稿已生成，可以查看并审阅方案。'],
    ['stale', '主线草稿已过期，请查看并联系组织者重新生成。'],
  ]) {
    assert.deepEqual(dashboardNextStep({ ...sources, viewerReady: true, plan }), {
      destination: 'main-plan', label: '查看主线方案', hint,
    })

  }
  for (const [split, hint] of [
    ['absent', '主线方案已确认，可以查看分队规划。'],
    ['cancelled', '分队草稿已取消，可以查看分队规划。'],
    ['active', '分队规划进行中，可以继续查看和调整。'],
    ['confirmed', '分队方案已确认，可以查看分队详情。'],
  ]) {
    assert.deepEqual(dashboardNextStep({
      ...sources, mainPlanConfirmed: true, plan: 'confirmed', split,
    }), { destination: 'split', label: '查看分队规划', hint })
  }
})

test('personal preference, group readiness and main-plan guidance stay consistent', () => {
  const waiting = {
    ...sources, viewerReady: true, readyCount: 1, memberCount: 3, plan: 'absent',
  }
  const milestones = dashboardMilestones(waiting)
  assert.deepEqual(milestones[1], { label: '偏好', detail: '本人已就绪 · 1/3', state: 'done' })
  assert.equal(milestones[2].state, 'done')
  assert.equal(milestones[3].state, 'active')
  assert.deepEqual(dashboardNextStep(waiting), {
    destination: 'main-plan/inputs',
    label: '准备主线方案',
    hint: '还有 2 位成员未提交偏好；可先查看成员偏好，为生成主线做准备。',
  })
  assert.deepEqual(dashboardNextStep({ ...waiting, readyCount: 3 }), {
    destination: 'main-plan/inputs',
    label: '生成主线方案',
    hint: '全员偏好已就绪，可以生成主线方案。',
  })
  assert.deepEqual(dashboardNextStep({ ...waiting, isOrganizer: false }), {
    destination: 'main-plan/inputs',
    label: '查看成员偏好',
    hint: '还有 2 位成员未提交偏好；全员就绪后由组织者生成主线方案。',
  })
  assert.deepEqual(dashboardNextStep({ ...waiting, isOrganizer: false, readyCount: 3 }), {
    destination: 'main-plan/inputs',
    label: '查看成员偏好',
    hint: '全员偏好已就绪，等待组织者生成主线方案。',
  })
})
