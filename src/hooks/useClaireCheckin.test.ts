// src/hooks/useClaireCheckin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))

import { useClaireCheckin } from './useClaireCheckin'

const fakeUser = { id: 'user-1' } as User

const yesterday = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
})()

function makeCheckinQuery(data: unknown) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data, error: null }),
          order: () => ({
            limit: () => Promise.resolve({ data: Array.isArray(data) ? data : [], error: null }),
          }),
        }),
      }),
    }),
    upsert: vi.fn(() => Promise.resolve({ error: null })),
  }
}

beforeEach(() => vi.clearAllMocks())

describe('useClaireCheckin', () => {
  it('todayCheckin is null when no row exists', async () => {
    mockFrom.mockImplementation(() => makeCheckinQuery(null))

    const { result } = renderHook(() => useClaireCheckin(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.todayCheckin).toBeNull()
  })

  it('todayCheckin is set when row exists', async () => {
    const row = { id: 'c1', user_id: 'user-1', date: yesterday, quality_time: 'yes', blocker: null, created_at: '' }
    mockFrom.mockImplementation(() => makeCheckinQuery(row))

    const { result } = renderHook(() => useClaireCheckin(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.todayCheckin?.quality_time).toBe('yes')
  })

  it('saveCheckin upserts and updates todayCheckin', async () => {
    const savedRow = { id: 'c2', user_id: 'user-1', date: yesterday, quality_time: 'yes', blocker: null, created_at: '' }
    const upsertMock = vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: savedRow, error: null }),
      }),
    }))
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
      upsert: upsertMock,
    }))

    const { result } = renderHook(() => useClaireCheckin(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.saveCheckin(yesterday, 'yes', null)
    })

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', date: yesterday, quality_time: 'yes' }),
      expect.any(Object)
    )
    expect(result.current.todayCheckin?.quality_time).toBe('yes')
    expect(result.current.todayCheckin?.id).toBe('c2')
  })

  it('detects 3+ consecutive no/partial pattern', async () => {
    const recent = [
      { id: '1', user_id: 'user-1', date: '2026-03-04', quality_time: 'no', blocker: null, created_at: '' },
      { id: '2', user_id: 'user-1', date: '2026-03-03', quality_time: 'partial', blocker: 'phone', created_at: '' },
      { id: '3', user_id: 'user-1', date: '2026-03-02', quality_time: 'no', blocker: null, created_at: '' },
    ]
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          order: () => ({
            limit: () => Promise.resolve({ data: recent, error: null }),
          }),
        }),
      }),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    }))

    const { result } = renderHook(() => useClaireCheckin(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.claireContext).toContain('3+')
  })

  it('detects 5+ consecutive yes pattern', async () => {
    const recent = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      user_id: 'user-1',
      date: `2026-03-0${5 - i}`,
      quality_time: 'yes',
      blocker: null,
      created_at: '',
    }))
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          order: () => ({
            limit: () => Promise.resolve({ data: recent, error: null }),
          }),
        }),
      }),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    }))

    const { result } = renderHook(() => useClaireCheckin(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.claireContext).toContain('consecutive good evenings')
  })
})
