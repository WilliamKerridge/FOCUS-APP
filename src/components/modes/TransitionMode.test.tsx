// src/components/modes/TransitionMode.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'
import type { UserPromise } from '@/types'

const { mockCallClaude, mockFrom } = vi.hoisted(() => ({
  mockCallClaude: vi.fn(),
  mockFrom: vi.fn(),
}))

const mockCompletePromise = vi.fn()

vi.mock('@/lib/claude', () => ({ callClaude: (...args: unknown[]) => mockCallClaude(...args) }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))

let mockPromises: UserPromise[] = []

vi.mock('@/hooks/usePromises', () => ({
  usePromises: () => ({
    promises: mockPromises,
    loading: false,
    error: null,
    completePromise: mockCompletePromise,
    addPromise: vi.fn(),
    archivePromise: vi.fn(),
  }),
}))

import TransitionMode from './TransitionMode'

const fakeUser = { id: 'user-1' } as User

beforeEach(() => {
  vi.clearAllMocks()
  mockPromises = []
})

describe('TransitionMode', () => {
  it('shows Step 1 of 4 on initial render', () => {
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
    expect(screen.getByText(/park your work/i)).toBeInTheDocument()
  })

  it('step 1: Continue calls Claude and advances to step 2 when promises exist', async () => {
    mockCallClaude.mockResolvedValue('Work parked. Enjoy your evening.')
    mockPromises = [{
      id: 'p-1', user_id: 'user-1', title: 'Call Alice', made_to: null,
      context: 'work', due_date: '2026-03-05', status: 'active',
      completed_at: null, created_at: '2026-03-05T00:00:00Z',
    }]
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/open loops/i), 'Finish report')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument())
    expect(screen.getByText(/promises check/i)).toBeInTheDocument()
    expect(screen.getByText(/call alice/i)).toBeInTheDocument()
  })

  it('step 1: skips to step 3 when no promises exist', async () => {
    mockCallClaude.mockResolvedValue('Parked.')
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/open loops/i), 'Something')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())
  })

  it('step 3: Continue disabled when intention empty', async () => {
    mockCallClaude.mockResolvedValue('Parked.')
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('step 2: checked promises appear in evening_promises on save', async () => {
    mockCallClaude.mockResolvedValue('Parked.')
    mockPromises = [{
      id: 'p-1', user_id: 'user-1', title: 'Call Alice', made_to: null,
      context: 'work', due_date: '2026-03-05', status: 'active',
      completed_at: null, created_at: '2026-03-05T00:00:00Z',
    }]
    const insertFn = vi.fn(() => Promise.resolve({ error: null }))
    mockFrom.mockReturnValue({ insert: insertFn })

    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)

    // Step 1 → 2
    await userEvent.type(screen.getByPlaceholderText(/open loops/i), 'Finish report')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument())

    // Check the promise
    await userEvent.click(screen.getByRole('checkbox'))

    // Step 2 → 3
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())

    // Step 3 → 4
    await userEvent.type(screen.getByPlaceholderText(/phone away/i), 'Be present')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument())

    // Save
    await userEvent.click(screen.getByRole('button', { name: /done with work/i }))
    await waitFor(() => expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ evening_promises: ['Call Alice'] }),
      })
    ))
  })

  it('step 1: uses raw input as parking note when Claude fails', async () => {
    mockCallClaude.mockRejectedValue(new Error('Claude error'))
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/open loops/i), 'Raw input text')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())
  })

  it('step 4: shows error message when save fails', async () => {
    mockCallClaude.mockResolvedValue('Parked.')
    mockFrom.mockReturnValue({ insert: vi.fn(() => Promise.resolve({ error: { message: 'DB error' } })) })
    const onModeChange = vi.fn()

    render(<TransitionMode user={fakeUser} onModeChange={onModeChange} />)

    // Navigate to step 4
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())
    await userEvent.type(screen.getByPlaceholderText(/phone away/i), 'Be present')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /done with work/i }))
    await waitFor(() => expect(screen.getByText(/couldn't save/i)).toBeInTheDocument())
    expect(onModeChange).not.toHaveBeenCalled()
  })

  it('step 4: shows summary and calls supabase insert + onModeChange on done', async () => {
    mockCallClaude.mockResolvedValue('Parked.')
    const insertFn = vi.fn(() => Promise.resolve({ error: null }))
    mockFrom.mockReturnValue({ insert: insertFn })
    const onModeChange = vi.fn()

    render(<TransitionMode user={fakeUser} onModeChange={onModeChange} />)

    // Step 1 → 3 (no promises)
    await userEvent.type(screen.getByPlaceholderText(/open loops/i), 'Finish report')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())

    // Step 3 → 4
    await userEvent.type(screen.getByPlaceholderText(/phone away/i), 'Be present')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument())

    // Step 4 → save
    await userEvent.click(screen.getByRole('button', { name: /done with work/i }))
    await waitFor(() => expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'transition',
        content: expect.objectContaining({ presence_intention: 'Be present' }),
      })
    ))
    expect(onModeChange).toHaveBeenCalledWith('home')
  })
})
