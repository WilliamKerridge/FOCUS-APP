import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))

import { useEmailInbox } from './useEmailInbox'

const fakeUser = { id: 'user-1' } as User

const fakeItem = {
  id: 'item-1',
  user_id: 'user-1',
  sender_email: 'test@example.com',
  context: 'work' as const,
  subject: 'Test subject',
  extraction: null,
  flagged: false,
  reviewed: false,
  created_at: '2026-03-04T10:00:00Z',
}

function makeSelectChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const fn = () => chain
  chain.select = vi.fn(fn)
  chain.eq = vi.fn(fn)
  chain.order = vi.fn(() => Promise.resolve(result))
  return chain
}

function makeUpdateChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const fn = () => chain
  chain.update = vi.fn(fn)
  chain.eq = vi.fn(() => Promise.resolve(result))
  return chain
}

function makeInsertChain(result: unknown) {
  return { insert: vi.fn(() => Promise.resolve(result)) }
}

beforeEach(() => { vi.clearAllMocks() })

describe('useEmailInbox', () => {
  it('fetches items on mount and sets them', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: [fakeItem], error: null }))
    const { result } = renderHook(() => useEmailInbox(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items).toEqual([fakeItem])
    expect(result.current.loadError).toBeNull()
  })

  it('sets loadError when fetch fails', async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: null, error: { message: 'db error' } }))
    const { result } = renderHook(() => useEmailInbox(fakeUser))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.loadError).toBe('Failed to load email inbox.')
    expect(result.current.items).toEqual([])
  })

  it('markReviewed removes item from state on success', async () => {
    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: [fakeItem], error: null }))
      .mockReturnValueOnce(makeUpdateChain({ error: null }))

    const { result } = renderHook(() => useEmailInbox(fakeUser))
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    let err: string | null = null
    await act(async () => { err = await result.current.markReviewed('item-1') })
    expect(err).toBeNull()
    expect(result.current.items).toHaveLength(0)
  })

  it('markReviewed returns error string and keeps item on failure', async () => {
    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: [fakeItem], error: null }))
      .mockReturnValueOnce(makeUpdateChain({ error: { message: 'update failed' } }))

    const { result } = renderHook(() => useEmailInbox(fakeUser))
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    let err: string | null = null
    await act(async () => { err = await result.current.markReviewed('item-1') })
    expect(err).toBe('Could not mark as reviewed — try again.')
    expect(result.current.items).toHaveLength(1)
  })

  it('saveInboxItems inserts tasks and removes item from state on success', async () => {
    const insertChain = makeInsertChain({ error: null })
    const updateChain = makeUpdateChain({ error: null })

    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: [fakeItem], error: null }))
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(updateChain)

    const { result } = renderHook(() => useEmailInbox(fakeUser))
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    const taskInserts = [{ user_id: 'user-1', title: 'Do something', context: 'work', priority: 2, due_date: null, source: 'email_forward', status: 'open' }]
    let err: string | null = null
    await act(async () => { err = await result.current.saveInboxItems('item-1', taskInserts) })
    expect(err).toBeNull()
    expect(insertChain.insert).toHaveBeenCalledWith(taskInserts)
    expect(result.current.items).toHaveLength(0)
  })

  it('saveInboxItems returns error and keeps item when insert fails', async () => {
    const insertChain = makeInsertChain({ error: { message: 'insert failed' } })

    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: [fakeItem], error: null }))
      .mockReturnValueOnce(insertChain)

    const { result } = renderHook(() => useEmailInbox(fakeUser))
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    let err: string | null = null
    await act(async () => { err = await result.current.saveInboxItems('item-1', [{ user_id: 'user-1', title: 'x', context: 'work', priority: 2, due_date: null, source: 'email_forward', status: 'open' }]) })
    expect(err).toBe("Couldn't save — try again.")
    expect(result.current.items).toHaveLength(1)
  })

  it('saveInboxItems returns error when markReviewed step fails after insert', async () => {
    // taskInserts=[] → insert step skipped, only update called
    const updateChain = makeUpdateChain({ error: { message: 'update failed' } })

    mockFrom
      .mockReturnValueOnce(makeSelectChain({ data: [fakeItem], error: null }))
      .mockReturnValueOnce(updateChain)

    const { result } = renderHook(() => useEmailInbox(fakeUser))
    await waitFor(() => expect(result.current.items).toHaveLength(1))

    let err: string | null = null
    await act(async () => { err = await result.current.saveInboxItems('item-1', []) })
    expect(err).toBe("Couldn't mark as reviewed — try again.")
    expect(result.current.items).toHaveLength(1)
  })
})
