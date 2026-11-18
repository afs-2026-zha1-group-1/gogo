export interface ProgressSources {
  mainPlanConfirmed: boolean
  readyCount: number
  memberCount: number
  viewerReady: boolean
  isOrganizer: boolean
  plan: 'absent' | 'draft' | 'stale' | 'confirmed'
  split: 'absent' | 'active' | 'confirmed' | 'cancelled'
}

type MilestoneState = 'done' | 'active' | 'pending'
type MilestoneLabel = '建局' | '偏好' | '邀请' | '主线' | '分队' | '会合' | '完成'
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
  const inviting = sources.isOrganizer && sources.memberCount === 1 && sources.plan === 'absent'
  const beginning: Milestone[] = sources.isOrganizer
    ? [
        { label: '建局', detail: '已创建', state: 'done' },
        preference,
        {
          label: '邀请',
          detail: sources.mainPlanConfirmed ? '已关闭' : sources.memberCount > 1 ? '已有成员加入' : '等待成员加入',
          state: sources.mainPlanConfirmed || sources.memberCount > 1
            ? 'done'
            : sources.viewerReady && inviting ? 'active' : 'pending',
        },
      ]
    : [preference]
  return [
    ...beginning,
    {
      label: '主线', detail: plan,
      state: sources.plan === 'confirmed' ? 'done' : sources.viewerReady && !inviting ? 'active' : 'pending',
    },
    { label: '分队', detail: split, state: sources.split === 'confirmed' ? 'done' : sources.split === 'active' ? 'active' : 'pending' },
    { label: '会合', detail: '未知', state: 'pending' },
    { label: '完成', detail: '未知', state: 'pending' },
  ]
}

export function dashboardNextStep(sources: ProgressSources): {
  destination: 'preferences' | 'invite' | 'main-plan' | 'main-plan/inputs' | 'split'
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
  if (sources.isOrganizer && sources.memberCount === 1 && sources.plan === 'absent') {
    return { destination: 'invite', label: '邀请朋友', hint: '偏好已完成，邀请朋友加入行程。' }
  }
  if (sources.plan === 'absent') {
    const pending = sources.memberCount - sources.readyCount
    return {
      destination: 'main-plan/inputs',
      label: sources.isOrganizer ? pending ? '准备主线方案' : '生成主线方案' : '查看成员偏好',
      hint: pending
        ? sources.isOrganizer
          ? `还有 ${pending} 位成员未提交偏好；可先查看成员偏好，为生成主线做准备。`
          : `还有 ${pending} 位成员未提交偏好；全员就绪后由组织者生成主线方案。`
        : sources.isOrganizer
          ? '全员偏好已就绪，可以生成主线方案。'
          : '全员偏好已就绪，等待组织者生成主线方案。',
    }
  }
  const hint = {
    draft: '主线草稿已生成，可以查看并审阅方案。',
    stale: '主线草稿已过期，请查看并联系组织者重新生成。',
    confirmed: '主线方案已确认，可以查看分队规划。',
  }[sources.plan]
  return { destination: 'main-plan', label: '查看主线方案', hint }
}
