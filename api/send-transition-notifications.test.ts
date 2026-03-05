// api/send-transition-notifications.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
})

describe('send-transition-notifications', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const { res, status } = makeRes()
    await handler(makeReq({ headers: {} }), res)
    expect(status).toHaveBeenCalledWith(401)
  })

  it('sends notification when transition_time matches and today is a work day', async () => {
    // Set up: user with transition_time matching current UTC time window
    const now = new Date()
    const hh = String(now.getUTCHours()).padStart(2, '0')
    const mm = String(Math.floor(now.getUTCMinutes() / 15) * 15).padStart(2, '0')
    const transitionTime = `${hh}:${mm}`

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const todayDay = days[now.getUTCDay()]

    const subs = [{
      user_id: 'u1',
      endpoint: 'https://example.com/push',
      p256dh: 'key1',
      auth: 'auth1',
      profiles: { transition_time: transitionTime, work_days: [todayDay] },
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
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ sent: 1 }))
  })

  it('does NOT send notification when today is not a work day for the user', async () => {
    const now = new Date()
    const hh = String(now.getUTCHours()).padStart(2, '0')
    const mm = String(Math.floor(now.getUTCMinutes() / 15) * 15).padStart(2, '0')
    const transitionTime = `${hh}:${mm}`

    // Give all days EXCEPT today
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const todayDay = days[now.getUTCDay()]
    const workDays = days.filter(d => d !== todayDay)

    const subs = [{
      user_id: 'u1',
      endpoint: 'https://example.com/push',
      p256dh: 'key1',
      auth: 'auth1',
      profiles: { transition_time: transitionTime, work_days: workDays },
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
    const now = new Date()
    const hh = String(now.getUTCHours()).padStart(2, '0')
    const mm = String(Math.floor(now.getUTCMinutes() / 15) * 15).padStart(2, '0')
    const transitionTime = `${hh}:${mm}`
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const todayDay = days[now.getUTCDay()]

    const subs = [{
      user_id: 'u1',
      endpoint: 'https://example.com/push',
      p256dh: 'key1',
      auth: 'auth1',
      profiles: { transition_time: transitionTime, work_days: [todayDay] },
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
