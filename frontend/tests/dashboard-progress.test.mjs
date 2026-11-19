import assert from 'node:assert/strict'
import test from 'node:test'
import { dashboardMilestones, dashboardNextStep } from '../src/pages/dashboardProgress.ts'

const sources = {
  mainPlanConfirmed: false,
  joiningClosed: false,
  readyCount: 3,
  memberCount: 4,
  viewerReady: false,
  isOrganizer: true,
  plan: 'stale',
  split: 'absent',
}

test('organizer milestones represent independent facts without reunion or completion', () => {
  assert.deepEqual(dashboardMilestones(sources), [
    { label: '建局', detail: '已创建', state: 'done' },
    { label: '偏好', detail: '本人待填写 · 3/4', state: 'active' },
    { label: '邀请', detail: '已有成员加入', state: 'done' },
    { label: '主线', detail: '草稿已过期', state: 'pending' },
    { label: '分队', detail: '未发起', state: 'pending' },
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
  assert.equal(dashboardMilestones({ ...sources, joiningClosed: true })[2].detail, '已关闭')
})

test('completed and active milestones follow saved readiness, plan and split state', () => {
  const completed = dashboardMilestones({
    ...sources, mainPlanConfirmed: true, readyCount: 4, viewerReady: true, plan: 'confirmed', split: 'confirmed',
  })
  assert.deepEqual(completed.map((item) => item.state),
    ['done', 'done', 'done', 'done', 'done'])
  const active = dashboardMilestones({ ...sources, split: 'active' })
  assert.equal(active[4].state, 'active')
  assert.equal(dashboardMilestones({ ...sources, split: 'cancelled' })[4].state, 'pending')
})

test('organizer completes preferences before inviting, and invited members start at preferences', () => {
  const solo = { ...sources, memberCount: 1, readyCount: 0, viewerReady: false, plan: 'absent' }
  assert.equal(dashboardNextStep(solo).destination, 'preferences')
  const ready = { ...solo, readyCount: 1, viewerReady: true }
  assert.equal(dashboardNextStep(ready).label, '生成主线方案')
  assert.equal(dashboardMilestones(ready)[2].state, 'active')
  assert.equal(dashboardNextStep({ ...ready, memberCount: 2 }).destination, 'main-plan/inputs')
  assert.equal(dashboardNextStep({ ...ready, plan: 'draft' }).destination, 'main-plan')
  const invited = { ...solo, isOrganizer: false }
  assert.equal(dashboardNextStep(invited).destination, 'preferences')
  assert.deepEqual(dashboardMilestones(invited).map((milestone) => milestone.label),
    ['偏好', '邀请', '主线', '分队'])
})

test('member invitation milestone reflects membership and joining cutoff', () => {
  const member = { ...sources, isOrganizer: false }
  assert.deepEqual(dashboardMilestones(member)[1],
    { label: '邀请', detail: '已有成员加入', state: 'done' })
  assert.deepEqual(dashboardMilestones({ ...member, mainPlanConfirmed: true, joiningClosed: true, plan: 'confirmed' })[1],
    { label: '邀请', detail: '已关闭', state: 'done' })
})

test('joining remains closed after an unconfirmed plan is reopened', () => {
  const reopened = { ...sources, joiningClosed: true, viewerReady: true, plan: 'stale' }
  assert.deepEqual(dashboardMilestones(reopened).find((item) => item.label === '邀请'),
    { label: '邀请', detail: '已关闭', state: 'done' })
})

test('invitation stays active for ready members until a main plan is generated', () => {
  for (const isOrganizer of [true, false]) {
    const ready = { ...sources, isOrganizer, viewerReady: true, readyCount: 2, memberCount: 2, plan: 'absent' }
    const invitation = dashboardMilestones(ready).find((item) => item.label === '邀请')
    assert.equal(invitation.state, 'active')
    assert.equal(dashboardNextStep(ready).label, '生成主线方案')
    assert.equal(dashboardMilestones({ ...ready, plan: 'draft' }).find((item) => item.label === '邀请').state, 'done')
  }
})

test('recommendation reflects preferences, draft, confirmation and split progress', () => {
  assert.deepEqual(dashboardNextStep(sources), {
    destination: 'preferences', label: '查看我的偏好', hint: '先查看并完善你的兴趣偏好。',
  })
  assert.deepEqual(dashboardNextStep({ ...sources, viewerReady: true, plan: 'absent' }), {
    destination: 'main-plan/inputs',
    label: '生成主线方案',
    hint: '还有 1 位成员未提交偏好；全员就绪后可生成主线方案。',
  })
  for (const [plan, hint] of [
    ['draft', '主线草稿已生成，可以查看并审阅方案。'],
    ['stale', '主线草稿已过期，请查看并重新生成。'],
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
  assert.equal(milestones[2].state, 'active')
  assert.equal(milestones[3].state, 'active')
  assert.deepEqual(dashboardNextStep(waiting), {
    destination: 'main-plan/inputs',
    label: '生成主线方案',
    hint: '还有 2 位成员未提交偏好；全员就绪后可生成主线方案。',
  })
  assert.deepEqual(dashboardNextStep({ ...waiting, readyCount: 3 }), {
    destination: 'main-plan/inputs',
    label: '生成主线方案',
    hint: '全员偏好已就绪，可以生成主线方案。',
  })
  assert.deepEqual(dashboardNextStep({ ...waiting, isOrganizer: false }), {
    destination: 'main-plan/inputs',
    label: '生成主线方案',
    hint: '还有 2 位成员未提交偏好；全员就绪后可生成主线方案。',
  })
  assert.deepEqual(dashboardNextStep({ ...waiting, isOrganizer: false, readyCount: 3 }), {
    destination: 'main-plan/inputs',
    label: '生成主线方案',
    hint: '全员偏好已就绪，可以生成主线方案。',
  })
})
