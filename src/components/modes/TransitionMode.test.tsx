// src/components/modes/TransitionMode.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({ supabase: { from: mockFrom } }))

import TransitionMode from './TransitionMode'

const fakeUser = { id: 'user-1' } as User

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TransitionMode', () => {
  it('shows Step 1 of 4 on initial render', () => {
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument()
    expect(screen.getByText(/park your work/i)).toBeInTheDocument()
  })

  it('step 1: renders 3 text inputs for parking loops', () => {
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    expect(screen.getByPlaceholderText(/kartech call pending/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/and\? \(optional\)/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/one more\? \(optional\)/i)).toBeInTheDocument()
  })

  it('step 1: Continue advances to step 2 (no Claude call)', async () => {
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/kartech call pending/i), 'Finish report')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument())
    expect(screen.getByText(/promises check/i)).toBeInTheDocument()
  })

  it('step 1: Skip also advances to step 2', async () => {
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument())
  })

  it('step 2: shows a single text input for promises note', async () => {
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument())
    expect(screen.getByPlaceholderText(/follow up with claire/i)).toBeInTheDocument()
  })

  it('step 2: Skip/Continue (when empty) advances to step 3', async () => {
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    // step 1 → 2
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument())
    // step 2 → 3 (empty input shows "Skip" label)
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())
  })

  it('step 3: Continue disabled when intention empty', async () => {
    render(<TransitionMode user={fakeUser} onModeChange={vi.fn()} />)
    // step 1 → 2
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument())
    // step 2 → 3
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
  })

  it('step 4: shows error message when save fails', async () => {
    mockFrom.mockReturnValue({ insert: vi.fn(() => Promise.resolve({ error: { message: 'DB error' } })) })
    const onModeChange = vi.fn()

    render(<TransitionMode user={fakeUser} onModeChange={onModeChange} />)

    // 1 → 2
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument())
    // 2 → 3
    await userEvent.click(screen.getByRole('button', { name: /skip/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())
    // 3 → 4
    await userEvent.type(screen.getByPlaceholderText(/phone away/i), 'Be present')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /done with work/i }))
    await waitFor(() => expect(screen.getByText(/couldn't save/i)).toBeInTheDocument())
    expect(onModeChange).not.toHaveBeenCalled()
  })

  it('step 4: saves parking_loops and evening_promises_note to supabase', async () => {
    const insertFn = vi.fn(() => Promise.resolve({ error: null }))
    mockFrom.mockReturnValue({ insert: insertFn })
    const onModeChange = vi.fn()

    render(<TransitionMode user={fakeUser} onModeChange={onModeChange} />)

    // Step 1: fill first two loops
    await userEvent.type(screen.getByPlaceholderText(/kartech call pending/i), 'Finish report')
    await userEvent.type(screen.getByPlaceholderText(/and\? \(optional\)/i), 'Send invoice')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument())

    // Step 2: add evening promises note
    await userEvent.type(screen.getByPlaceholderText(/follow up with claire/i), 'Call mum')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument())

    // Step 3
    await userEvent.type(screen.getByPlaceholderText(/phone away/i), 'Be present')
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /done with work/i }))
    await waitFor(() => expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'transition',
        content: expect.objectContaining({
          parking_loops: ['Finish report', 'Send invoice'],
          evening_promises_note: 'Call mum',
          presence_intention: 'Be present',
        }),
      })
    ))
    expect(onModeChange).toHaveBeenCalledWith('home')
  })
})
