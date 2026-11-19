/**
 * Per-stop artwork for the two destinations the demo environment simulates.
 *
 * Only Zhuhai and Hong Kong stops have photos in the repo (`png/`, published to
 * `public/images/stops/`). Any other destination — including everything the AI generates —
 * returns `null`, so the timeline keeps its icon tile and never borrows another city's image.
 *
 * Matching is by station name keyword, so 「日月贝（珠海大剧院）」 and 「日月贝」 both resolve
 * to the same photo.
 */

interface StopPhotoRule {
  pattern: RegExp
  file: string
  alt: string
}

const STOPS: StopPhotoRule[] = [
  // 珠海
  { pattern: /日月贝|珠海大剧院/, file: 'stop-zhuhai-opera.jpg', alt: '珠海大剧院日月贝' },
  { pattern: /情侣路/, file: 'stop-lovers-road.jpg', alt: '珠海情侣路海滨' },
  { pattern: /爱情邮局/, file: 'stop-love-post-office.jpg', alt: '珠海爱情邮局' },
  { pattern: /野狸岛|名亭公园/, file: 'stop-yeli-island.jpg', alt: '珠海野狸岛' },
  { pattern: /圆明新园/, file: 'stop-yuanmingyuan.jpg', alt: '珠海圆明新园' },
  { pattern: /长隆|海洋王国/, file: 'stop-chimelong.jpg', alt: '珠海长隆海洋王国' },
  // 香港
  { pattern: /维多利亚港/, file: 'stop-victoria-harbour.jpg', alt: '香港维多利亚港' },
  { pattern: /尖沙咀/, file: 'stop-tsimshatsui.jpg', alt: '香港尖沙咀' },
  { pattern: /太平山|凌霄阁|山顶|平顶山/, file: 'stop-victoria-peak.jpg', alt: '香港太平山顶' },
  { pattern: /旺角/, file: 'stop-mongkok.jpg', alt: '香港旺角街头' },
  { pattern: /星光大道|海滨长廊/, file: 'stop-avenue-of-stars.jpg', alt: '香港星光大道' },
  { pattern: /迪士尼|disney/i, file: 'stop-hk-disneyland.jpg', alt: '香港迪士尼乐园' },
]

/**
 * Resolve a stop's artwork. `destination` gates the lookup so an AI-generated 「尖沙咀」
 * elsewhere never picks up the Hong Kong picture by accident.
 */
export function stopPhoto(name: string, destination?: string | null): { src: string; alt: string } | null {
  const city = destination ?? ''
  if (!/珠海|zhuhai|香港|hong\s*kong/i.test(city)) return null
  for (const rule of STOPS) {
    if (rule.pattern.test(name)) {
      return { src: `/images/stops/${rule.file}`, alt: rule.alt }
    }
  }
  return null
}