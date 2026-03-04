import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))
vi.mock('@/lib/utils', () => ({ getToday: () => '2026-03-03' }))

import { useReEntryContext } from './useReEntryContext'

type FakeUser = Parameters<typeof useReEntryContext>[0]
const fakeUser: FakeUser = { id: 'user-1' } as FakeUser

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {}
  const fn = () => c
  c.select = vi.fn(fn)
  c.eq = vi.fn(fn)
  c.not = vi.fn(fn)
  c.order = vi.fn(fn)
  c.limit = vi.fn(fn)
  c.maybeSingle = vi.fn(() => Promise.resolve(result))
  return c
}

describe('useReEntryContext', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('context is null before fetchContext is called', () => {
    mockFrom.mockReturnValue(makeChain({ data: null }))
    const { result } = renderHook(() => useReEntryContext(fakeUser))
    expect(result.current.context).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('populates endContext from focus_sessions and mainFocus from handoffs', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { end_context: 'Finished auth hook' } }))
      .mockReturnValueOnce(makeChain({ data: { content: { main_focus: 'Ship auth' } } }))

    const { result } = renderHook(() => useReEntryContext(fakeUser))
    await act(async () => { await result.current.fetchContext() })

    expect(result.current.context).toEqual({ endContext: 'Finished auth hook', mainFocus: 'Ship auth' })
    expect(result.current.error).toBeNull()
  })

  it('sets endContext to null when no focus session exists today', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: null }))
      .mockReturnValueOnce(makeChain({ data: { content: { main_focus: 'Ship auth' } } }))

    const { result } = renderHook(() => useReEntryContext(fakeUser))
    await act(async () => { await result.current.fetchContext() })

    expect(result.current.context?.endContext).toBeNull()
    expect(result.current.context?.mainFocus).toBe('Ship auth')
  })

  it('sets mainFocus to null when no kickstart exists today', async () => {
    mockFrom
      .mockReturnValueOnce(makeChain({ data: { end_context: 'Done with DB work' } }))
      .mockReturnValueOnce(makeChain({ data: null }))

    const { result } = renderHook(() => useReEntryContext(fakeUser))
    await act(async () => { await result.current.fetchContext() })

    expect(result.current.context?.endContext).toBe('Done with DB work')
    expect(result.current.context?.mainFocus).toBeNull()
  })

  it('sets loading true while fetching and false when complete', async () => {
    let resolve!: (v: unknown) => void
    const pending = new Promise(r => { resolve = r })
    const blockingChain = makeChain(pending)
    ;(blockingChain.maybeSingle as ReturnType<typeof vi.fn>).mockReturnValue(pending)
    mockFrom
      .mockReturnValueOnce(blockingChain)
      .mockReturnValueOnce(makeChain({ data: null }))

    const { result } = renderHook(() => useReEntryContext(fakeUser))
    act(() => { void result.current.fetchContext() })
    expect(result.current.loading).toBe(true)

    await act(async () => { resolve({ data: null }) })
    expect(result.current.loading).toBe(false)
  })

  it('sets error when Supabase throws', async () => {
    mockFrom.mockImplementation(() => { throw new Error('network error') })

    const { result } = renderHook(() => useReEntryContext(fakeUser))
    await act(async () => { await result.current.fetchContext() })

    expect(result.current.error).toBe('Could not load context.')
    expect(result.current.context).toBeNull()
  })
})
