export interface ProgressSources {
  mainPlanConfirmed: boolean
  readyCount: number
  memberCount: number
  viewerReady: boolean
  plan: 'absent' | 'draft' | 'stale' | 'confirmed'
  split: 'absent' | 'active' | 'confirmed' | 'cancelled'
}

export function dashboardMilestones(sources: ProgressSources): { label: string; detail: string }[] {
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
  return [
    { label: '建局', detail: '已创建' },
    { label: '邀请', detail: sources.mainPlanConfirmed ? '已关闭' : '开放' },
    { label: '偏好', detail: `${sources.readyCount}/${sources.memberCount}` },
    { label: '主线', detail: plan },
    { label: '分队', detail: split },
    { label: '会合', detail: '未知' },
    { label: '完成', detail: '未知' },
  ]
}

export function dashboardNextStep(sources: ProgressSources): 'preferences' | 'main-plan' {
  return sources.viewerReady || sources.mainPlanConfirmed ? 'main-plan' : 'preferences'
}
