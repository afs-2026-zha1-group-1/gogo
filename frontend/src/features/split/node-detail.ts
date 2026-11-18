import type { GraphRow, RouteKey } from "./graph-model"

/**
 * Node sheet view-model (US-086 follow-up). The backend does not expose per-node location/fee/tasks
 * yet, so this builder returns deterministic MOCK copy derived from the existing row + route context.
 * Swap this module for a real read when the wire contract lands.
 */

export type NodeBadgeVariant = "brand" | "a" | "b"

export interface NodeDetailView {
  id: string
  badgeLabel: string
  badgeVariant: NodeBadgeVariant
  time: string
  title: string
  location: string
  people: string
  fee: string
  tasks: string[]
}

export interface NodeDetailContext {
  groupCounts: Record<RouteKey, number>
  totalMembers: number
}

const MAIN_TASKS = ["按计划时间到达", "在群里同步位置", "预留 10 分钟缓冲"]
const FORK_TASKS = ["核对 A/B 分组名单", "确认会合时间与地点", "两组分别开启导航"]
const JOIN_TASKS = ["在会合点集合", "核对两组抵达时间", "休息补水，准备继续行程"]
const ACTIVITY_TASKS = ["提前 10 分钟到达", "完成活动后在群里打卡", "留意下一个节点时间"]
const TRAVEL_TASKS = ["按导航前往会合点", "预留路程时间，不晚于会合时刻", "抵达后在群里报平安"]
const BUFFER_TASKS = ["原地休整补水", "检查随身物品", "按计划继续行程"]

function routePeople(route: RouteKey, count: number): string {
  const label = `Route ${route.toUpperCase()}`
  return count > 0 ? `${label} · ${count} 人` : label
}

export function buildNodeDetail(row: GraphRow, context: NodeDetailContext): NodeDetailView {
  if (row.kind === "branch-pair") {
    throw new Error(`${row.kind} rows are not direct node targets`)
  }
  const base = { id: row.id, time: row.meta, title: row.title }

  if (row.kind === "branch") {
    const badgeLabel = `Route ${row.route.toUpperCase()}`
    const people = routePeople(row.route, context.groupCounts[row.route])
    if (row.id.endsWith("-travel")) {
      return {
        ...base,
        badgeLabel,
        badgeVariant: row.route,
        location: "前往会合点沿途",
        people,
        fee: "车费按实际",
        tasks: TRAVEL_TASKS,
      }
    }
    if (row.id.endsWith("-buffer")) {
      return {
        ...base,
        badgeLabel,
        badgeVariant: row.route,
        location: "会合点附近",
        people,
        fee: "—",
        tasks: BUFFER_TASKS,
      }
    }
    return {
      ...base,
      badgeLabel,
      badgeVariant: row.route,
      location: row.title,
      people,
      fee: "人均 ¥120",
      tasks: ACTIVITY_TASKS,
    }
  }

  const people = context.totalMembers > 0 ? `全员 · ${context.totalMembers} 人` : "全员"
  if (row.kind === "fork") {
    return {
      ...base,
      badgeLabel: "全员",
      badgeVariant: "brand",
      location: row.title,
      people,
      fee: "—",
      tasks: FORK_TASKS,
    }
  }
  if (row.kind === "join") {
    return {
      ...base,
      badgeLabel: "全员",
      badgeVariant: "brand",
      location: row.title,
      people,
      fee: "免费",
      tasks: JOIN_TASKS,
    }
  }

  return {
    ...base,
    badgeLabel: "全员",
    badgeVariant: "brand",
    location: row.title,
    people,
    fee: "免费",
    tasks: MAIN_TASKS,
  }
}