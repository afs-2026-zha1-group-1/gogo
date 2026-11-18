/**
 * US-079: 站点图标选配（纯函数）。先按名称关键词（渡轮/展馆/山峰/市集），
 * 再按兴趣标签（food/coffee/nature/heritage/craft/photo/slow），
 * 再按公园/花园类名称，最后回退 分队路线/定位 图标，保证每站都有图标。
 */
import type { IconName } from '../Icons'
import type { ScheduleItem } from './countdown'

export function stopIcon(item: ScheduleItem): IconName {
  const name = item.name
  if (/小轮|游船|渡轮|码头|ferry|pier/i.test(name)) return 'ship'
  if (/博物馆|美术馆|文化|museum|gallery/i.test(name)) return 'landmark'
  if (/山顶|凌霄阁|peak|mountain/i.test(name)) return 'mountain'
  if (/街市|广场|购物|market|square/i.test(name)) return 'bag'
  const tags = item.interests
  if (tags.includes('food')) return 'utensils'
  if (tags.includes('coffee')) return 'coffee'
  if (tags.includes('nature')) return 'mountain'
  if (tags.includes('heritage')) return 'landmark'
  if (tags.includes('craft')) return 'sparkle'
  if (tags.includes('photo')) return 'camera'
  if (tags.includes('slow')) return 'coffee'
  if (/公园|花园|海滨|长廊|garden|park|bay/i.test(name)) return 'leaf'
  return item.groupLabel ? 'route' : 'pin'
}
