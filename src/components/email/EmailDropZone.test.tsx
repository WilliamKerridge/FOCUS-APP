import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'

const mockCallClaude = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/claude', () => ({ callClaude: (...args: unknown[]) => mockCallClaude(...args) }))
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import EmailDropZone from './EmailDropZone'

const fakeUser = { id: 'user-1' } as User

const validExtraction = JSON.stringify({
  actions: [{ title: 'Reply to Bob', priority: 'focus', due_date: null }],
  waiting_for: [{ title: 'RMA decision', person: 'Alice', time_sensitive: false }],
  promises: [],
  summary: 'Bob asking about RMA status',
})

function makeInsertChain(result: unknown) {
  return { insert: vi.fn(() => Promise.resolve(result)) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EmailDropZone', () => {
  it('Extract button disabled when textarea empty, enabled when text entered', async () => {
    render(<EmailDropZone user={fakeUser} onDone={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /extract actions/i })
    expect(btn).toBeDisabled()
    await userEvent.type(screen.getByPlaceholderText(/paste the email here/i), 'hello')
    expect(btn).not.toBeDisabled()
  })

  it('shows review screen with checkboxes after successful extraction', async () => {
    mockCallClaude.mockResolvedValue(validExtraction)
    render(<EmailDropZone user={fakeUser} onDone={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/paste the email here/i), 'some email text')
    await userEvent.click(screen.getByRole('button', { name: /extract actions/i }))
    await waitFor(() => expect(screen.getByText(/reply to bob/i)).toBeInTheDocument())
    expect(screen.getByText(/rma decision/i)).toBeInTheDocument()
    // Both checkboxes pre-checked
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.forEach(cb => expect(cb).toBeChecked())
  })

  it('shows error when extraction returns empty arrays', async () => {
    mockCallClaude.mockResolvedValue(JSON.stringify({
      actions: [],
      waiting_for: [],
      promises: [],
      summary: 'Nothing to do here',
    }))
    render(<EmailDropZone user={fakeUser} onDone={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/paste the email here/i), 'empty email')
    await userEvent.click(screen.getByRole('button', { name: /extract actions/i }))
    await waitFor(() => expect(screen.getByText(/nothing actionable found/i)).toBeInTheDocument())
  })

  it('shows error and preserves textarea when Claude throws', async () => {
    mockCallClaude.mockRejectedValue(new Error('network'))
    render(<EmailDropZone user={fakeUser} onDone={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/paste the email here/i), 'important email')
    await userEvent.click(screen.getByRole('button', { name: /extract actions/i }))
    await waitFor(() => expect(screen.getByText(/claude is unavailable/i)).toBeInTheDocument())
    expect(screen.getByDisplayValue('important email')).toBeInTheDocument()
  })

  it('calls supabase insert with correct data and shows saved count', async () => {
    mockCallClaude.mockResolvedValue(validExtraction)
    const insertChain = makeInsertChain({ error: null })
    mockFrom.mockReturnValue(insertChain)

    render(<EmailDropZone user={fakeUser} onDone={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/paste the email here/i), 'email text')
    await userEvent.click(screen.getByRole('button', { name: /extract actions/i }))
    await waitFor(() => screen.getByRole('button', { name: /save all/i }))
    await userEvent.click(screen.getByRole('button', { name: /save all/i }))

    await waitFor(() => expect(insertChain.insert).toHaveBeenCalled())
    const insertArg = (insertChain.insert.mock.calls as unknown[][])[0][0] as Array<{ source: string; context: string }>
    const actionTask = insertArg.find(t => t.context === 'work')
    const waitingTask = insertArg.find(t => t.context === 'waiting_for')
    expect(actionTask?.source).toBe('email_drop')
    expect(waitingTask?.source).toBe('email_drop')
    await waitFor(() => expect(screen.getByText(/2 items saved/i)).toBeInTheDocument())
  })

  it('excludes unchecked action from insert', async () => {
    mockCallClaude.mockResolvedValue(validExtraction)
    const insertChain = makeInsertChain({ error: null })
    mockFrom.mockReturnValue(insertChain)

    render(<EmailDropZone user={fakeUser} onDone={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText(/paste the email here/i), 'email text')
    await userEvent.click(screen.getByRole('button', { name: /extract actions/i }))
    await waitFor(() => screen.getByRole('button', { name: /save all/i }))

    // Uncheck the action checkbox (first checkbox = action)
    const checkboxes = screen.getAllByRole('checkbox')
    await userEvent.click(checkboxes[0])
    await userEvent.click(screen.getByRole('button', { name: /save all/i }))

    await waitFor(() => expect(insertChain.insert).toHaveBeenCalled())
    const insertArg = (insertChain.insert.mock.calls as unknown[][])[0][0] as Array<{ context: string }>
    expect(insertArg.some(t => t.context === 'work')).toBe(false)
    expect(insertArg.some(t => t.context === 'waiting_for')).toBe(true)
  })
})
