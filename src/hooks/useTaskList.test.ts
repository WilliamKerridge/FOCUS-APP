// src/hooks/useTaskList.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))
vi.mock('@/lib/utils', () => ({ getToday: () => '2026-03-06' }))

import { useTaskList } from './useTaskList'

const fakeUser = { id: 'user-1' } as User

function makeOpenChain(rows: unknown[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
  }
  // First .order() returns this (chained), second .order() resolves
  let orderCount = 0
  chain.order = vi.fn().mockImplementation(() => {
    orderCount++
    if (orderCount < 2) return chain
    return Promise.resolve({ data: rows, error: null })
  })
  return chain
}

function makeDoneChain(rows: unknown[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
  }
  // Single .order() call, resolves immediately
  chain.order = vi.fn().mockResolvedValue({ data: rows, error: null })
  return chain
}


function makeInsertChain(returnedRow: unknown) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnedRow, error: null }),
  }
}

beforeEach(() => vi.clearAllMocks())

describe('useTaskList', () => {
  it('fetches open and done tasks on mount', async () => {
    const openTask = { id: 't-1', title: 'Buy milk', context: 'home', priority: 0, status: 'open', waiting_for_person: null, due_date: null, source: 'quick_capture', created_at: '2026-03-06T09:00:00Z', completed_at: null }
    mockFrom
      .mockReturnValueOnce(makeOpenChain([openTask]))
      .mockReturnValueOnce(makeDoneChain([]))
    const { result } = renderHook(() => useTaskList(fakeUser, ['home']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.openTasks).toEqual([openTask])
    expect(result.current.completedTasks).toEqual([])
  })

  it('addTask inserts a task and adds it to openTasks', async () => {
    const newTask = { id: 't-2', title: 'Call mum', context: 'home', priority: 0, status: 'open', waiting_for_person: null, due_date: null, source: 'quick_capture', created_at: '2026-03-06T10:00:00Z', completed_at: null }
    mockFrom
      .mockReturnValueOnce(makeOpenChain([]))
      .mockReturnValueOnce(makeDoneChain([]))
      .mockReturnValue(makeInsertChain(newTask))

    const { result } = renderHook(() => useTaskList(fakeUser, ['home']))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let err: string | null = 'not-called'
    await act(async () => { err = await result.current.addTask('Call mum', 'home', null) })

    expect(err).toBeNull()
    expect(result.current.openTasks).toContainEqual(expect.objectContaining({ title: 'Call mum' }))
  })

  it('addTask returns error message on failure', async () => {
    mockFrom
      .mockReturnValueOnce(makeOpenChain([]))
      .mockReturnValueOnce(makeDoneChain([]))
      .mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
      })

    const { result } = renderHook(() => useTaskList(fakeUser, ['home']))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let err: string | null = null
    await act(async () => { err = await result.current.addTask('Call mum', 'home', null) })
    expect(err).toBe('insert failed')
  })
})
