import test from 'node:test'
import assert from 'node:assert/strict'
import { stopIcon } from '../src/lib/stop-icon.ts'
import type { ScheduleItem } from '../src/lib/countdown.ts'

// US-079：站点图标按名称/兴趣标签选配，演示行程各站图标应互不相同类。
function item(name: string, interests: string[] = [], groupLabel: string | null = null): ScheduleItem {
  return { key: name, name, start: null, end: null, groupLabel, interests, address: null, lat: null, lon: null, travelMinutesToNext: null }
}

test('名称关键词优先：渡轮/展馆/山峰/市集', () => {
  assert.equal(stopIcon(item('天星小轮（尖沙咀 → 中环）', ['slow', 'photo'])), 'ship')
  assert.equal(stopIcon(item('泰晤士河游船（塔桥 → 威斯敏斯特）', ['slow', 'photo'])), 'ship')
  assert.equal(stopIcon(item('西九文化区 M+ 博物馆', ['heritage', 'photo'])), 'landmark')
  assert.equal(stopIcon(item('太平山顶与凌霄阁', ['nature', 'photo'])), 'mountain')
  assert.equal(stopIcon(item('中环街市与半山扶梯', ['food', 'craft'])), 'bag')
  assert.equal(stopIcon(item('铜锣湾时代广场', ['food', 'craft'])), 'bag')
})

test('无名称命中时按兴趣标签：food/coffee/nature/heritage/craft/photo', () => {
  assert.equal(stopIcon(item('博罗市场午餐', ['food', 'coffee'])), 'utensils')
  assert.equal(stopIcon(item('考文特花园', ['food', 'craft'])), 'utensils')
  assert.equal(stopIcon(item('某咖啡站', ['coffee'])), 'coffee')
  assert.equal(stopIcon(item('某自然站', ['nature'])), 'mountain')
  assert.equal(stopIcon(item('伦敦塔与塔桥', ['heritage', 'photo'])), 'landmark')
  assert.equal(stopIcon(item('某手作站', ['craft'])), 'sparkle')
  assert.equal(stopIcon(item('伦敦眼与南岸夜景', ['photo', 'slow'])), 'camera')
})

test('公园/花园类名称回退叶子；无标签无关键词回退 pin/route', () => {
  assert.equal(stopIcon(item('Merlion Park')), 'leaf')
  assert.equal(stopIcon(item('Gardens by the Bay')), 'leaf')
  assert.equal(stopIcon(item('尖沙咀海滨长廊与星光大道', ['photo', 'slow'])), 'camera')
  assert.equal(stopIcon(item('City Hall MRT')), 'pin')
  assert.equal(stopIcon(item('City Hall MRT', [], 'A')), 'route')
})

test('演示行程六站图标不全相同（丰富性）', () => {
  const icons = [
    stopIcon(item('西九文化区 M+ 博物馆', ['heritage', 'photo'])),
    stopIcon(item('天星小轮（尖沙咀 → 中环）', ['slow', 'photo'])),
    stopIcon(item('中环街市与半山扶梯', ['food', 'craft'])),
    stopIcon(item('太平山顶与凌霄阁', ['nature', 'photo'])),
    stopIcon(item('铜锣湾时代广场', ['food', 'craft'])),
    stopIcon(item('尖沙咀海滨长廊与星光大道', ['photo', 'slow'])),
  ]
  assert.ok(new Set(icons).size >= 4, `图标种类过少：${icons.join(',')}`)
})
