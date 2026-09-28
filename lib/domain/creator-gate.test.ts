import { describe, expect, it } from 'vitest'
import { followersToGo, handleFromUsername, isProfessional, nextCreatorStatus } from './creator-gate'

describe('nextCreatorStatus', () => {
  it('gates at exactly the minimum', () => {
    expect(nextCreatorStatus(null, 999, 1000)).toBe('waitlist')
    expect(nextCreatorStatus(null, 1000, 1000)).toBe('active')
    expect(nextCreatorStatus('waitlist', 1200, 1000)).toBe('active')
  })
  it('never lifts a suspension or demotes an active creator', () => {
    expect(nextCreatorStatus('suspended', 50_000, 1000)).toBe('suspended')
    expect(nextCreatorStatus('active', 400, 1000)).toBe('active')
  })
})

describe('isProfessional', () => {
  it.each([['BUSINESS', true], ['MEDIA_CREATOR', true], ['media_creator', true], ['PERSONAL', false], [null, false]])('%s → %s', (t, ok) => {
    expect(isProfessional(t as string | null)).toBe(ok)
  })
})

describe('handleFromUsername', () => {
  it.each([['Riya.Travels', 'riya.travels'], ['..ab..', 'ab_tl'], ['x', 'x_tl'], ['a'.repeat(40), 'a'.repeat(30)]])('%s → %s', (u, h) => {
    const out = handleFromUsername(u)
    expect(out).toBe(h)
    expect(out).toMatch(/^[a-z0-9_.]{3,30}$/)
  })
})

describe('followersToGo', () => {
  it('never negative', () => { expect(followersToGo(842, 1000)).toBe(158); expect(followersToGo(5000, 1000)).toBe(0) })
})
