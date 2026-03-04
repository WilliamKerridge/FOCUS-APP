import { describe, it, expect, vi, afterEach } from 'vitest'
import { getToday, formatTime, cn } from './utils'

describe('getToday', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the current date in YYYY-MM-DD format', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-03T10:30:00Z'))
    expect(getToday()).toBe('2026-03-03')
  })

  it('uses UTC date so midnight rollover is consistent', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T23:59:59Z'))
    expect(getToday()).toBe('2026-12-31')
  })
})

describe('formatTime', () => {
  it('formats zero seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('pads single-digit minutes and seconds', () => {
    expect(formatTime(65)).toBe('01:05')
  })

  it('formats exactly 25 minutes', () => {
    expect(formatTime(1500)).toBe('25:00')
  })

  it('formats 59 minutes 59 seconds', () => {
    expect(formatTime(3599)).toBe('59:59')
  })

  it('handles values over 60 minutes without wrapping hours', () => {
    expect(formatTime(3661)).toBe('61:01')
  })

  it('formats 90 minutes', () => {
    expect(formatTime(5400)).toBe('90:00')
  })
})

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('resolves Tailwind conflicts in favour of later class', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('ignores falsy values', () => {
    expect(cn('foo', undefined, false, null, 'bar')).toBe('foo bar')
  })

  it('handles conditional object syntax', () => {
    expect(cn({ 'bg-primary': true, 'bg-secondary': false })).toBe('bg-primary')
  })
})
