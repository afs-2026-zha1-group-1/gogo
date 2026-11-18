import type { ReactNode } from 'react'

const PATHS = {
  branch: (
    <>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="12" cy="18.5" r="2.4" />
      <path d="M6 8.4v1.6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8.4" />
      <path d="M12 13v3.1" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  cal: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  nav: <path d="M3.5 11.2l17-7.7-7.7 17-2.1-7.2-7.2-2.1z" />,
  flag: (
    <>
      <path d="M5.5 21V4" />
      <path d="M5.5 5h11l-2 3.2 2 3.2h-11" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  users: (
    <>
      <path d="M16 20v-1.6a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
      <circle cx="9.5" cy="7" r="3.2" />
      <path d="M16.5 4.2a3.2 3.2 0 0 1 0 6" />
      <path d="M21 20v-1.6a4 4 0 0 0-3-3.8" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
      <path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </>
  ),
  check: <path d="M5 12.6l4.4 4.4L19 7.2" />,
  alert: (
    <>
      <path d="M12 4l9 16H3l9-16z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 3v6c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6L12 3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  star: (
    <path d="M12 3.6l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.9l6.1-.7L12 3.6z" />
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  wallet: (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="2.5" />
      <path d="M3.5 10.5h17" />
      <path d="M16.5 14.5h.01" />
    </>
  ),
  arrow: (
    <>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.2" />
      <path d="M12 7.8h.01" />
    </>
  ),
  home: (
    <path d="M4 11l8-6.2 8 6.2v8a1 1 0 0 1-1 1h-4.2v-6H9.2v6H5a1 1 0 0 1-1-1v-8z" />
  ),
  list: (
    <>
      <path d="M8.5 6h12M8.5 12h12M8.5 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  fork: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 13L6 7V3.5" />
      <path d="M12 13l6-6V3.5" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  sparkle: (
    <>
      <path d="M11 3l1.7 4.6L17.5 9.3l-4.8 1.7L11 15.6l-1.7-4.6L4.5 9.3l4.8-1.7L11 3z" />
      <path d="M18 14.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18.5" r="2.4" />
      <circle cx="18" cy="5.5" r="2.4" />
      <path d="M8.4 18.5H14a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h5.6" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" />
      <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
      <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" />
      <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M4 12h16" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.8" />
      <path d="M4 18l4.5-4.6a2 2 0 0 1 2.8 0L20 18" />
    </>
  ),
  qrcode: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <path d="M13.5 13.5h3v3M20.5 13.5v7h-4M13.5 20.5h.01" />
    </>
  ),
  // US-079: 站点类型图标（按名称/兴趣标签自动选配，见 lib/stop-icon）
  ship: (
    <>
      <path d="M4 14l1.5-4h13L20 14M6 14l1.5 4h9L18 14M12 10V4M9 4h6" />
      <path d="M3 20c1.5 1.4 3 1.4 4.5 0s3-1.4 4.5 0 3 1.4 4.5 0 3-1.4 4.5 0" />
    </>
  ),
  landmark: (
    <>
      <path d="M3 10l9-6 9 6H3zM4 21h16M6 18v-8M10 18v-8M14 18v-8M18 18v-8M4 18h16" />
    </>
  ),
  mountain: <path d="M3 19h18L14 8l-3 4-2-3-6 10zM12.5 10.5L14 8l1.5 2.5" />,
  bag: (
    <>
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  utensils: <path d="M6 3v5a2.5 2.5 0 0 0 5 0V3M8.5 3v18M16 3c-1.8 2.6-1.8 6.4 0 9v9" />,
  coffee: (
    <>
      <path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8zM16 9h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M7 3v2M11 3v2" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4c-9 0-15 4-15 11 0 3 2 5 5 5 7 0 10-7 10-16z" />
      <path d="M5 20c3-6 8-9 12-11" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

interface IconProps {
  name: IconName
  className?: string
}

export default function Icon({ name, className = '' }: IconProps) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  )
}