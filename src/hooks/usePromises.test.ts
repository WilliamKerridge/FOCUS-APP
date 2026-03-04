// src/hooks/usePromises.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))

import { usePromises } from './usePromises'

const fakeUser = { id: 'user-1' } as User

const fakePromise = {
  id: 'p-1',
  user_id: 'user-1',
  title: 'Send the quote',
  made_to: 'Alice',
  context: 'work' as const,
  due_date: '2026-03-11',
  status: 'active' as const,
  completed_at: null,
  created_at: '2026-03-04T10:00:00Z',
}

function makeSelectChain(result: unknown) {
  const c: Record<string, unknown> = {}
  const fn = () => c
  c.select = vi.fn(fn); c.eq = vi.fn(fn); c.order = vi.fn(() => Promise.resolve(result))
  return c
}
function makeUpdateChain(result: unknown) {
  const c: Record<string, unknown> = {}
  const fn = () => c
  c.update = vi.fn(fn); c.eq = vi.fn(() => Promise.resolve(result))
  return c
}
function makeInsertChain(result: unknown) {
  const c: Record<string, unknown> = {}
  const fn = () => c
  c.insert = vi.fn(fn); c.select = vi.fn(fn); c.single = vi.fn(() => Promise.resolve(result))
  return c
}

beforeEach(() => { vi.clearAllMocks() })

describe('usePromises', () => {
  it('fetches active promises for context on mount', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: [fakePromise], error: null }))
    const { result } = renderHook(() => usePromises(fakeUser, 'work'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.promises).toEqual([fakePromise])
  })

  it('sets error on fetch failure', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: null, error: { message: 'db error' } }))
    const { result } = renderHook(() => usePromises(fakeUser, 'work'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Could not load promises.')
    expect(result.current.promises).toEqual([])
  })

  it('addPromise inserts and adds to state', async () => {
    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: [], error: null }))
      .mockReturnValueOnce(makeInsertChain({ data: fakePromise, error: null }))
    const { result } = renderHook(() => usePromises(fakeUser, 'work'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let err: string | null = null
    await act(async () => { err = await result.current.addPromise('Send the quote', 'Alice', '2026-03-11') })
    expect(err).toBeNull()
    expect(result.current.promises).toHaveLength(1)
  })

  it('addPromise returns error string on failure', async () => {
    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: [], error: null }))
      .mockReturnValueOnce(makeInsertChain({ data: null, error: { message: 'insert failed' } }))
    const { result } = renderHook(() => usePromises(fakeUser, 'work'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let err: string | null = null
    await act(async () => { err = await result.current.addPromise('Test', null, '2026-03-11') })
    expect(err).toBe("Couldn't save — try again.")
    expect(result.current.promises).toHaveLength(0)
  })

  it('completePromise removes item from state on success', async () => {
    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: [fakePromise], error: null }))
      .mockReturnValueOnce(makeUpdateChain({ error: null }))
    const { result } = renderHook(() => usePromises(fakeUser, 'work'))
    await waitFor(() => expect(result.current.promises).toHaveLength(1))
    await act(async () => { await result.current.completePromise('p-1') })
    expect(result.current.promises).toHaveLength(0)
  })

  it('archivePromise removes item from state on success', async () => {
    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: [fakePromise], error: null }))
      .mockReturnValueOnce(makeUpdateChain({ error: null }))
    const { result } = renderHook(() => usePromises(fakeUser, 'work'))
    await waitFor(() => expect(result.current.promises).toHaveLength(1))
    await act(async () => { await result.current.archivePromise('p-1') })
    expect(result.current.promises).toHaveLength(0)
  })
})
