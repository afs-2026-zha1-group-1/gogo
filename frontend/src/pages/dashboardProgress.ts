export interface ProgressSources {
  mainPlanConfirmed: boolean
  joiningClosed: boolean
  readyCount: number
  memberCount: number
  viewerReady: boolean
  isOrganizer: boolean
  plan: 'absent' | 'draft' | 'stale' | 'confirmed'
  split: 'absent' | 'active' | 'confirmed' | 'cancelled'
}

type MilestoneState = 'done' | 'active' | 'pending'
type MilestoneLabel = '建局' | '偏好' | '邀请' | '主线' | '分队'
type Milestone = { label: MilestoneLabel; detail: string; state: MilestoneState }

export function dashboardMilestones(sources: ProgressSources): Milestone[] {
  const plan = {
    absent: '未生成',
    draft: '草稿',
    stale: '草稿已过期',
    confirmed: '已确认',
  }[sources.plan]
  const split = {
    absent: '未发起',
    active: '进行中',
    confirmed: '已确认',
    cancelled: '已取消',
  }[sources.split]
  const preference: Milestone = {
    label: '偏好',
    detail: `本人${sources.viewerReady ? '已就绪' : '待填写'} · ${sources.readyCount}/${sources.memberCount}`,
    state: sources.viewerReady ? 'done' : sources.mainPlanConfirmed ? 'pending' : 'active',
  }
  const invitation: Milestone = {
    label: '邀请',
    detail: sources.joiningClosed ? '已关闭' : sources.memberCount > 1 ? '已有成员加入' : '等待成员加入',
    state: sources.joiningClosed || sources.plan !== 'absent'
      ? 'done'
      : sources.viewerReady ? 'active' : 'pending',
  }
  const beginning: Milestone[] = sources.isOrganizer
    ? [{ label: '建局', detail: '已创建', state: 'done' }]
    : []
  return [
    ...beginning,
    preference,
    invitation,
    {
      label: '主线', detail: plan,
      state: sources.plan === 'confirmed' ? 'done' : sources.viewerReady ? 'active' : 'pending',
    },
    { label: '分队', detail: split, state: sources.split === 'confirmed' ? 'done' : sources.split === 'active' ? 'active' : 'pending' },
  ]
}

export function dashboardNextStep(sources: ProgressSources): {
  destination: 'preferences' | 'main-plan' | 'main-plan/inputs' | 'split'
  label: string
  hint: string
} {
  if (sources.mainPlanConfirmed) {
    const hint = {
      absent: '主线方案已确认，可以查看分队规划。',
      cancelled: '分队草稿已取消，可以查看分队规划。',
      active: '分队规划进行中，可以继续查看和调整。',
      confirmed: '分队方案已确认，可以查看分队详情。',
    }[sources.split]
    return { destination: 'split', label: '查看分队规划', hint }
  }
  if (!sources.viewerReady) {
    return { destination: 'preferences', label: '查看我的偏好', hint: '先查看并完善你的兴趣偏好。' }
  }
  if (sources.plan === 'absent') {
    const pending = sources.memberCount - sources.readyCount
    return {
      destination: 'main-plan/inputs',
      label: '生成主线方案',
      hint: pending
        ? `还有 ${pending} 位成员未提交偏好；全员就绪后可生成主线方案。`
        : '全员偏好已就绪，可以生成主线方案。',
    }
  }
  const hint = {
    draft: '主线草稿已生成，可以查看并审阅方案。',
    stale: '主线草稿已过期，请查看并重新生成。',
    confirmed: '主线方案已确认，可以查看分队规划。',
  }[sources.plan]
  return { destination: 'main-plan', label: '查看主线方案', hint }
}
