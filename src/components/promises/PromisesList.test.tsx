// src/components/promises/PromisesList.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'
import type { UserPromise } from '@/types'

const mockAddPromise = vi.fn()
const mockCompletePromise = vi.fn()
const mockArchivePromise = vi.fn()

vi.mock('@/hooks/usePromises', () => ({
  usePromises: () => ({
    promises: mockPromises,
    loading: false,
    error: null,
    addPromise: mockAddPromise,
    completePromise: mockCompletePromise,
    archivePromise: mockArchivePromise,
  }),
}))

// Must be declared before mock (hoisted)
let mockPromises: UserPromise[] = []

import PromisesList from './PromisesList'

const fakeUser = { id: 'user-1' } as User

const activePromise: UserPromise = {
  id: 'p-1',
  user_id: 'user-1',
  title: 'Send the quote',
  made_to: 'Alice',
  context: 'work',
  due_date: '2026-03-11',
  status: 'active',
  completed_at: null,
  created_at: '2026-03-04T10:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPromises = []
})

describe('PromisesList', () => {
  it('shows empty state when no promises', () => {
    render(<PromisesList user={fakeUser} context="work" onBack={vi.fn()} />)
    expect(screen.getByText(/no active promises/i)).toBeInTheDocument()
  })

  it('renders active promises with made_to and due date', () => {
    mockPromises = [activePromise]
    render(<PromisesList user={fakeUser} context="work" onBack={vi.fn()} />)
    expect(screen.getByText(/send the quote/i)).toBeInTheDocument()
    expect(screen.getByText(/alice/i)).toBeInTheDocument()
  })

  it('add button disabled when title empty', () => {
    render(<PromisesList user={fakeUser} context="work" onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add promise/i })).toBeDisabled()
  })

  it('calls addPromise with null madeTo when field is empty', async () => {
    mockAddPromise.mockResolvedValue(null)
    render(<PromisesList user={fakeUser} context="work" onBack={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/what did you promise/i), 'Reply to Bob')
    await userEvent.click(screen.getByRole('button', { name: /add promise/i }))
    expect(mockAddPromise).toHaveBeenCalledWith('Reply to Bob', null, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('calls addPromise with madeTo string when field is filled', async () => {
    mockAddPromise.mockResolvedValue(null)
    render(<PromisesList user={fakeUser} context="work" onBack={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/what did you promise/i), 'Reply to Bob')
    await userEvent.type(screen.getByPlaceholderText(/to whom/i), 'Alice')
    await userEvent.click(screen.getByRole('button', { name: /add promise/i }))
    expect(mockAddPromise).toHaveBeenCalledWith('Reply to Bob', 'Alice', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('clears input after successful add', async () => {
    mockAddPromise.mockResolvedValue(null)
    render(<PromisesList user={fakeUser} context="work" onBack={vi.fn()} />)
    const input = screen.getByPlaceholderText(/what did you promise/i)
    await userEvent.type(input, 'Reply to Bob')
    await userEvent.click(screen.getByRole('button', { name: /add promise/i }))
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('shows error when addPromise fails', async () => {
    mockAddPromise.mockResolvedValue("Couldn't save — try again.")
    render(<PromisesList user={fakeUser} context="work" onBack={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/what did you promise/i), 'Reply to Bob')
    await userEvent.click(screen.getByRole('button', { name: /add promise/i }))
    await waitFor(() => expect(screen.getByText(/couldn't save/i)).toBeInTheDocument())
  })

  it('calls completePromise when item is tapped', async () => {
    mockPromises = [activePromise]
    mockCompletePromise.mockResolvedValue(null)
    render(<PromisesList user={fakeUser} context="work" onBack={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /complete send the quote/i }))
    expect(mockCompletePromise).toHaveBeenCalledWith('p-1')
  })

  it('calls onBack when back button clicked', async () => {
    const onBack = vi.fn()
    render(<PromisesList user={fakeUser} context="work" onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /← back/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
