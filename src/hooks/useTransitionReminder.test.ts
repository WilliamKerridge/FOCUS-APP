// src/hooks/useTransitionReminder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))

// Mock browser push APIs
const mockGetSubscription = vi.fn()
const mockSubscribe = vi.fn()
const mockUnsubscribe = vi.fn()
const mockReady = Promise.resolve({
  pushManager: {
    getSubscription: mockGetSubscription,
    subscribe: mockSubscribe,
  },
})

Object.defineProperty(global, 'Notification', {
  value: { permission: 'default' },
  writable: true,
})
Object.defineProperty(navigator, 'serviceWorker', {
  value: { ready: mockReady },
  writable: true,
})
Object.defineProperty(window, 'PushManager', { value: {}, writable: true })

global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ publicKey: 'test-pub-key' }),
})

import { useTransitionReminder } from './useTransitionReminder'

const fakeUser = { id: 'user-1' } as User

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSubscription.mockResolvedValue(null)
})

describe('useTransitionReminder', () => {
  it('sets supported=true and subscribed=false when no subscription exists', async () => {
    const { result } = renderHook(() => useTransitionReminder(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.supported).toBe(true)
    expect(result.current.subscribed).toBe(false)
  })

  it('sets subscribed=true when subscription already exists', async () => {
    mockGetSubscription.mockResolvedValue({ endpoint: 'https://example.com' })
    const { result } = renderHook(() => useTransitionReminder(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.subscribed).toBe(true)
  })

  it('subscribe() calls pushManager.subscribe and saves to supabase', async () => {
    const fakeSub = {
      endpoint: 'https://push.example.com/sub',
      toJSON: () => ({
        endpoint: 'https://push.example.com/sub',
        keys: { p256dh: 'p256', auth: 'authkey' },
      }),
    }
    mockSubscribe.mockResolvedValue(fakeSub)
    const upsertMock = vi.fn(() => Promise.resolve({ error: null }))
    mockFrom.mockReturnValue({ upsert: upsertMock })
    mockGetSubscription.mockResolvedValue(null)

    const { result } = renderHook(() => useTransitionReminder(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let err: string | null = 'not-called'
    await act(async () => { err = await result.current.subscribe() })

    expect(err).toBeNull()
    expect(result.current.subscribed).toBe(true)
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', endpoint: 'https://push.example.com/sub' }),
      expect.any(Object)
    )
  })

  it('unsubscribe() calls sub.unsubscribe and deletes from supabase', async () => {
    const fakeSub = {
      endpoint: 'https://push.example.com/sub',
      unsubscribe: vi.fn().mockResolvedValue(true),
    }
    mockGetSubscription.mockResolvedValue(fakeSub)
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    })
    mockFrom.mockReturnValue({ delete: deleteMock })

    const { result } = renderHook(() => useTransitionReminder(fakeUser))
    await waitFor(() => expect(result.current.subscribed).toBe(true))

    await act(async () => { await result.current.unsubscribe() })

    expect(fakeSub.unsubscribe).toHaveBeenCalled()
    expect(result.current.subscribed).toBe(false)
  })
})
