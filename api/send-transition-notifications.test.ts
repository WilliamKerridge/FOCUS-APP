// api/send-transition-notifications.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { mockSendNotification, mockFrom, mockCreateClient } = vi.hoisted(() => {
  const mockSendNotification = vi.fn()
  const mockFrom = vi.fn()
  const mockCreateClient = vi.fn(() => ({ from: mockFrom }))
  return { mockSendNotification, mockFrom, mockCreateClient }
})

vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: mockSendNotification },
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: mockCreateClient }))

import handler from './send-transition-notifications'

function makeReq(opts: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'GET',
    headers: { authorization: `Bearer test-secret` },
    ...opts,
  } as VercelRequest
}

function makeRes(): { res: VercelResponse; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json, end: vi.fn() })
  const res = { json, status } as unknown as VercelResponse
  return { res, json, status }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', 'test-secret')
  vi.stubEnv('VAPID_PUBLIC_KEY', 'pub')
  vi.stubEnv('VAPID_PRIVATE_KEY', 'priv')
  vi.stubEnv('VAPID_SUBJECT', 'mailto:test@test.com')
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('send-transition-notifications', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const { res, status } = makeRes()
    await handler(makeReq({ headers: {} }), res)
    expect(status).toHaveBeenCalledWith(401)
  })

  it('sends notification when transition_time matches and today is a work day', async () => {
    // Fix time to 17:00 UTC on a Monday
    const fixedDate = new Date('2026-03-09T17:00:00Z') // Monday
    vi.useFakeTimers()
    vi.setSystemTime(fixedDate)

    const subs = [{
      user_id: 'u1',
      endpoint: 'https://example.com/push',
      p256dh: 'key1',
      auth: 'auth1',
      profiles: { transition_time: '17:00', work_days: ['Mon'] },
    }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'push_subscriptions') {
        return { select: vi.fn(() => Promise.resolve({ data: subs, error: null })) }
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })) }
    })
    mockSendNotification.mockResolvedValue(undefined)

    const { res, json } = makeRes()
    await handler(makeReq(), res)
    expect(mockSendNotification).toHaveBeenCalledOnce()
    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string)
    expect(payload.title).toBe('Time to transition')
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ sent: 1 }))
  })

  it('sends second reminder when in the +30min window', async () => {
    const fixedDate = new Date('2026-03-09T17:30:00Z') // Monday, 30 mins after 17:00
    vi.useFakeTimers()
    vi.setSystemTime(fixedDate)

    const subs = [{
      user_id: 'u1',
      endpoint: 'https://example.com/push',
      p256dh: 'key1',
      auth: 'auth1',
      profiles: { transition_time: '17:00', work_days: ['Mon'] },
    }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'push_subscriptions') {
        return { select: vi.fn(() => Promise.resolve({ data: subs, error: null })) }
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })) }
    })
    mockSendNotification.mockResolvedValue(undefined)

    const { res, json } = makeRes()
    await handler(makeReq(), res)
    expect(mockSendNotification).toHaveBeenCalledOnce()
    const payload = JSON.parse(mockSendNotification.mock.calls[0][1] as string)
    expect(payload.title).toBe('Transition reminder')
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ sent: 1 }))
  })

  it('does NOT send notification when today is not a work day for the user', async () => {
    // Fix time to 17:00 UTC on a Monday, but work_days excludes Monday
    const fixedDate = new Date('2026-03-09T17:00:00Z') // Monday
    vi.useFakeTimers()
    vi.setSystemTime(fixedDate)

    const subs = [{
      user_id: 'u1',
      endpoint: 'https://example.com/push',
      p256dh: 'key1',
      auth: 'auth1',
      profiles: { transition_time: '17:00', work_days: ['Tue', 'Wed', 'Thu', 'Fri'] },
    }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'push_subscriptions') {
        return { select: vi.fn(() => Promise.resolve({ data: subs, error: null })) }
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })) }
    })

    const { res } = makeRes()
    await handler(makeReq(), res)
    expect(mockSendNotification).not.toHaveBeenCalled()
  })

  it('does NOT send when transition handoff already exists today', async () => {
    // Fix time to 17:00 UTC on a Monday
    const fixedDate = new Date('2026-03-09T17:00:00Z') // Monday
    vi.useFakeTimers()
    vi.setSystemTime(fixedDate)

    const subs = [{
      user_id: 'u1',
      endpoint: 'https://example.com/push',
      p256dh: 'key1',
      auth: 'auth1',
      profiles: { transition_time: '17:00', work_days: ['Mon'] },
    }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'push_subscriptions') {
        return { select: vi.fn(() => Promise.resolve({ data: subs, error: null })) }
      }
      // handoffs — return an existing handoff for this user
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [{ user_id: 'u1' }], error: null })) })) })) }
    })

    const { res } = makeRes()
    await handler(makeReq(), res)
    expect(mockSendNotification).not.toHaveBeenCalled()
  })
})
