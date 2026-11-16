// Invitation join-hash matcher — single source of truth for G1 C3.
//
// Contract (signed by SA Lumi + IO Leo on 2026-06-18 via g1-decision.md C3):
//   - Accepted form is `#/join/<token>` where `<token>` is exactly 32
//     lowercase hexadecimal characters. Backend `InvitationTokens.next()`
//     = `HexFormat.of().formatHex(new byte[16])` produces that shape;
//     anything else (uppercase, non-hex, wrong length) is a bad token.
//   - Absolute URLs (with a scheme) are accepted only when their origin
//     equals the current app origin (same-origin rule). A relative or
//     hash-only input is always considered same-origin and accepted.
//   - Any other shape (no `#/join/` hash, cross-origin absolute, plain
//     text that is not a URL) is rejected. The matcher never performs
//     navigation itself; the Scanner UI uses the outcome to decide
//     whether to set `window.location.hash` or show the "unrecognized"
//     chip.
//
// This module is the C3-signed authority. Do not duplicate the regex or
// origin rule elsewhere in the frontend.

export type ParseJoinHashOk = { ok: true; token: string }
export type ParseJoinHashErr = {
  ok: false
  reason: 'no-hash-form' | 'cross-origin' | 'bad-token'
}
export type ParseJoinHashResult = ParseJoinHashOk | ParseJoinHashErr

const TOKEN_RE = /^\/([0-9a-f]{32})$/
const ABSOLUTE_URL_RE = /^[a-z][a-z0-9+\-.]*:/i

export function parseJoinHash(
  text: string,
  appOrigin: string,
): ParseJoinHashResult {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: false, reason: 'no-hash-form' }

  let url: URL
  try {
    url = new URL(trimmed, appOrigin)
  } catch {
    return { ok: false, reason: 'no-hash-form' }
  }

  // The hash must be exactly `#/join/<token>` — no query, no fragment.
  // Any input that lacks this shape is an unrelated URL or plain text
  // (SC-P3 / SC-P4 in the fixtures) and is rejected before we look at
  // origin, so a foreign host with no join-hash still reads as
  // "no-hash-form" rather than "cross-origin".
  const hash = url.hash
  if (!hash.startsWith('#/join/')) return { ok: false, reason: 'no-hash-form' }

  // Only after we know this is a join-hash do we enforce same-origin
  // on absolute URLs. Relative or hash-only inputs are same-origin by
  // construction (they were resolved against appOrigin above).
  if (ABSOLUTE_URL_RE.test(trimmed) && url.origin !== appOrigin) {
    return { ok: false, reason: 'cross-origin' }
  }

  const tail = hash.slice('#/join'.length) // "/<token>"
  if (!TOKEN_RE.test(tail)) {
    return { ok: false, reason: 'bad-token' }
  }

  return { ok: true, token: tail.slice(1) }
}
