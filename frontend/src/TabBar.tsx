import Icon from './Icons'
import type { IconName } from './Icons'
import type { TabId } from './types'

interface Tab {
  id: TabId
  label: string
  icon: IconName
  href?: string
}

const TABS: Tab[] = [
  { id: 'dashboard', label: '仪表盘', icon: 'home', href: '#/' },
  { id: 'trips', label: '行程', icon: 'list' },
  { id: 'split', label: '分队', icon: 'fork' },
  { id: 'members', label: '成员', icon: 'users', href: '#/members' },
  { id: 'account', label: '我的', icon: 'user', href: '#/account' },
]

export default function TabBar({
  active,
  tripsHref,
  splitHref,
}: {
  active: TabId
  tripsHref: string
  splitHref: string
}) {
  return (
    <nav className="tabbar" aria-label="主导航">
      {TABS.map((tab) => {
        const href = tab.id === 'trips' ? tripsHref : tab.id === 'split' ? splitHref : tab.href
        const isActive = active === tab.id
        return (
          <a
            key={tab.id}
            className={`tab${isActive ? ' active' : ''}`}
            href={href}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </a>
        )
      })}
    </nav>
  )
}