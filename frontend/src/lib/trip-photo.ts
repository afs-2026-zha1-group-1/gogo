/**
 * Decorative trip artwork for hero cards. The choice is derived from the trip's real
 * destination text so the same trip always shows the same picture; it never encodes
 * business state and is rendered with aria-hidden (the trip facts stay authoritative).
 *
 * Files live in `public/images/` and were reused from the shared UI package artwork;
 * add a new keyword mapping only when a matching picture already exists in the repo.
 */

const PHOTOS = {
  meadow: 'var(--photo-meadow)',
  river: 'var(--photo-river)',
  architecture: 'var(--photo-architecture)',
} as const

export type TripPhoto = (typeof PHOTOS)[keyof typeof PHOTOS]

/** Keyword → artwork. Keywords are matched case-insensitively against the destination. */
const KEYWORDS: Array<[RegExp, TripPhoto]> = [
  [/海|岛|湾|港|singapore|island|sea|bay|beach|coast/i, PHOTOS.meadow],
  [/古城|古镇|江|河|镇|重庆|渝|洪崖洞|chongqing|river|old town|canal/i, PHOTOS.river],
  [/博物|美术|艺术|展|馆|museum|gallery|art|architecture/i, PHOTOS.architecture],
]

/** Stable fallback: the trip id picks one of the three pictures (same trip, same picture). */
const FALLBACK: TripPhoto[] = [PHOTOS.meadow, PHOTOS.river, PHOTOS.architecture]

export function tripPhoto(destination: string, tripId?: number): TripPhoto {
  for (const [pattern, photo] of KEYWORDS) {
    if (pattern.test(destination)) return photo
  }
  const seed = Math.abs(tripId ?? destination.length) % FALLBACK.length
  return FALLBACK[seed]
}