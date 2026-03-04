import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// --- hoisted mocks ---
const { mockFrom, mockCallClaude } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockCallClaude: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))
vi.mock('@/lib/claude', () => ({ callClaude: mockCallClaude }))
vi.mock('@/lib/utils', () => ({ getToday: () => '2026-03-03' }))

import { useFocusSession } from './useFocusSession'
import type { FocusSession } from '@/types'

type FakeUser = Parameters<typeof useFocusSession>[0]
const fakeUser: FakeUser = { id: 'user-1' } as FakeUser

const openSession: FocusSession = {
  id: 'session-1',
  user_id: 'user-1',
  date: '2026-03-03',
  type: 'work',
  planned_duration_mins: 25,
  start_context: 'Open Jira and triage the backlog',
  started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
  ended_at: null,
  actual_duration_mins: null,
  end_context: null,
  exited_early: null,
}

const closedSession: FocusSession = { ...openSession, ended_at: new Date().toISOString(), actual_duration_mins: 25 }

const abandonedSession: FocusSession = {
  ...openSession,
  id: 'session-old',
  date: '2026-03-02',
  started_at: new Date('2026-03-02T09:00:00Z').toISOString(),
}

// Builds a fluent Supabase query chain whose terminal resolves to `result`
function chain(result: unknown) {
  const c: Record<string, unknown> = {}
  const self = () => c
  c.select = vi.fn(self)
  c.eq = vi.fn(self)
  c.is = vi.fn(self)
  c.lt = vi.fn(self)
  c.not = vi.fn(self)
  c.order = vi.fn(self)
  c.limit = vi.fn(self)
  c.insert = vi.fn(self)
  c.update = vi.fn(self)
  c.single = vi.fn(() => Promise.resolve(result))
  c.maybeSingle = vi.fn(() => Promise.resolve(result))
  c.then = (fn: (v: unknown) => unknown) => Promise.resolve(result).then(fn)
  return c
}

describe('useFocusSession — initial load', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('starts in loading state', () => {
    // never-resolving chain keeps loading true
    const pending = new Promise(() => {})
    const loadChain = chain(pending)
    loadChain.then = (fn: (v: unknown) => unknown) => pending.then(fn)
    mockFrom.mockReturnValue(loadChain)

    const { result } = renderHook(() => useFocusSession(fakeUser))
    expect(result.current.loading).toBe(true)
    expect(result.current.activeSession).toBeNull()
  })

  it('detects an open session from today', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [openSession], error: null }))
      .mockReturnValue(chain({ data: null }))

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.activeSession?.id).toBe('session-1')
    expect(result.current.todaySessionCount).toBe(0) // open session not counted yet
  })

  it('counts only closed sessions toward todaySessionCount', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [closedSession, closedSession, openSession], error: null }))
      .mockReturnValue(chain({ data: null }))

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.todaySessionCount).toBe(2)
  })

  it('detects an abandoned session from a previous day', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [], error: null })) // today: no sessions
      .mockReturnValueOnce(chain({ data: abandonedSession })) // abandoned

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.abandonedSession?.id).toBe('session-old')
  })

  it('returns null user gracefully — no load, not loading', async () => {
    const { result } = renderHook(() => useFocusSession(null))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.activeSession).toBeNull()
  })

  it('sets loadError when Supabase returns an error', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: null, error: { message: 'DB down' } }))
      .mockReturnValue(chain({ data: null }))

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.loadError).toBe('Could not load sessions — try refreshing.')
  })
})

describe('useFocusSession — startSession', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('calls Claude and saves start_context to DB', async () => {
    // load: no sessions today, no abandoned
    mockFrom
      .mockReturnValueOnce(chain({ data: [], error: null }))
      .mockReturnValueOnce(chain({ data: null }))

    mockCallClaude.mockResolvedValue('{"start_context": "Open Jira and triage backlog"}')

    const insertChain = chain({ data: openSession, error: null })
    mockFrom.mockReturnValue(insertChain)

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let err: string | null = null
    await act(async () => {
      err = await result.current.startSession('work', 25, 'triage backlog')
    })

    expect(err).toBeNull()
    expect(mockCallClaude).toHaveBeenCalledOnce()
    expect(result.current.activeSession?.id).toBe('session-1')
  })

  it('falls back to raw topic when Claude fails', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [], error: null }))
      .mockReturnValueOnce(chain({ data: null }))

    mockCallClaude.mockRejectedValue(new Error('Claude unavailable'))

    const insertChain = chain({ data: openSession, error: null })
    mockFrom.mockReturnValue(insertChain)

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.startSession('work', 25, 'triage backlog')
    })

    // session still starts — no error returned
    expect(result.current.activeSession).not.toBeNull()
  })

  it('returns error string when Supabase insert fails', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [], error: null }))
      .mockReturnValueOnce(chain({ data: null }))

    mockCallClaude.mockResolvedValue('{"start_context": "Open Jira"}')
    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'insert failed' } }))

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let err: string | null = null
    await act(async () => {
      err = await result.current.startSession('work', 25, 'triage backlog')
    })

    expect(err).toBe('Could not start session — try again.')
  })
})

describe('useFocusSession — endSession', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('writes ended_at and clears activeSession', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [openSession], error: null }))
      .mockReturnValueOnce(chain({ data: null }))

    const updateChain = chain({ data: null, error: null })
    mockFrom.mockReturnValue(updateChain)

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.activeSession).not.toBeNull())

    let err: string | null = null
    await act(async () => {
      err = await result.current.endSession('Reached the login screen', false)
    })

    expect(err).toBeNull()
    expect(result.current.activeSession).toBeNull()
    expect(result.current.todaySessionCount).toBe(1)
  })

  it('increments todaySessionCount after ending', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [openSession], error: null }))
      .mockReturnValueOnce(chain({ data: null }))
    mockFrom.mockReturnValue(chain({ data: null, error: null }))

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.activeSession).not.toBeNull())

    await act(async () => { await result.current.endSession('Done', false) })
    expect(result.current.todaySessionCount).toBe(1)
  })

  it('returns error when no active session', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [], error: null }))
      .mockReturnValueOnce(chain({ data: null }))

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const err = await act(async () => result.current.endSession('context', false))
    expect(err).toBe('No active session')
  })
})

describe('useFocusSession — closeAbandoned', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('closes the abandoned session and clears it from state', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [], error: null }))
      .mockReturnValueOnce(chain({ data: abandonedSession }))

    mockFrom.mockReturnValue(chain({ data: null, error: null }))

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.abandonedSession).not.toBeNull())

    let err: string | null = null
    await act(async () => {
      err = await result.current.closeAbandoned('Stopped mid-flow')
    })

    expect(err).toBeNull()
    expect(result.current.abandonedSession).toBeNull()
  })

  it('returns null immediately when no abandoned session exists', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [], error: null }))
      .mockReturnValueOnce(chain({ data: null }))

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const res = await act(async () => result.current.closeAbandoned('context'))
    expect(res).toBeNull()
  })

  it('returns error string when Supabase update fails', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: [], error: null }))
      .mockReturnValueOnce(chain({ data: abandonedSession }))

    mockFrom.mockReturnValue(chain({ data: null, error: { message: 'update failed' } }))

    const { result } = renderHook(() => useFocusSession(fakeUser))
    await waitFor(() => expect(result.current.abandonedSession).not.toBeNull())

    let err: string | null = null
    await act(async () => {
      err = await result.current.closeAbandoned('context')
    })

    expect(err).toBe('Could not save — try again.')
    // session still present after failure
    expect(result.current.abandonedSession).not.toBeNull()
  })
})
