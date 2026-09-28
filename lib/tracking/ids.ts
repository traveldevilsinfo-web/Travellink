import { randomBytes } from 'node:crypto'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I — readable when operators type it

/** Public click id passed to operator sites and postbacks, e.g. TLC-8F2K9QXA. */
export function newClickId(): string {
  const b = randomBytes(8)
  return 'TLC-' + Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join('')
}

export const LINK_CODE_RE = /^[a-z0-9]{3,16}$/
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
