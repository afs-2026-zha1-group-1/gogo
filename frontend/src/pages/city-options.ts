/**
 * US-001 destination picker data: the two cities the demo environment simulates.
 *
 * `destination` is the exact string stored in the trip record — it is what `tripPhoto()`
 * matches against, so choosing a city here automatically binds the matching hero photo
 * everywhere (dashboard hero, trip detail hero, trip list thumbnail).
 *
 * `startLocation` / `endLocation` are convenience defaults for the common case (arrive and
 * leave from the same landmark); both stay editable in the form.
 */
export interface CityOption {
  /** Stable key used by the picker UI and tests. */
  id: 'zhuhai' | 'hongkong'
  /** Exact destination value persisted on the trip. */
  destination: string
  label: string
  /** Short line describing what the photo shows. */
  caption: string
  /** Background artwork for the picker tile. */
  photo: string
  defaultStart: string
  defaultEnd: string
}

export const CITIES: CityOption[] = [
  {
    id: 'zhuhai',
    destination: '珠海',
    label: '珠海',
    caption: '日月贝 · 情侣路',
    photo: 'var(--photo-zhuhai)',
    defaultStart: '珠海情侣路',
    defaultEnd: '珠海大剧院',
  },
  {
    id: 'hongkong',
    destination: '香港',
    label: '香港',
    caption: '维多利亚港 · 中西环',
    photo: 'var(--photo-hongkong)',
    defaultStart: '香港西九龙站',
    defaultEnd: '香港中环码头',
  },
]

/** The city option matching a destination string, if the member picked one. */
export function cityForDestination(destination: string): CityOption | undefined {
  return CITIES.find((city) => city.destination === destination.trim())
}