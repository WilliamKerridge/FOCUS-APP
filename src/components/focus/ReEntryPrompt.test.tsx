import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockFetchContext, mockCallClaude } = vi.hoisted(() => ({
  mockFetchContext: vi.fn(),
  mockCallClaude: vi.fn(),
}))

vi.mock('@/hooks/useReEntryContext', () => ({
  useReEntryContext: () => ({
    loading: false,
    error: null,
    context: null,
    fetchContext: mockFetchContext,
  }),
}))
vi.mock('@/lib/claude', () => ({ callClaude: mockCallClaude }))

import ReEntryPrompt from './ReEntryPrompt'

const fakeUser = { id: 'user-1' } as Parameters<typeof ReEntryPrompt>[0]['user']

describe('ReEntryPrompt', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders the "Where was I?" button', () => {
    render(<ReEntryPrompt user={fakeUser} />)
    expect(screen.getByRole('button', { name: /where was i/i })).toBeInTheDocument()
  })

  it('shows Claude result after clicking the button', async () => {
    mockFetchContext.mockResolvedValue({ endContext: 'Stopped at auth hook', mainFocus: 'Ship auth' })
    mockCallClaude.mockResolvedValue('Last position: Writing auth hook\nNext action: Open useFocusSession.ts')

    render(<ReEntryPrompt user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /where was i/i }))

    expect(await screen.findByText(/writing auth hook/i)).toBeInTheDocument()
    expect(screen.getByText(/open useFocusSession/i)).toBeInTheDocument()
  })

  it('passes main_focus and end_context to Claude as user message', async () => {
    mockFetchContext.mockResolvedValue({ endContext: 'Finished DB schema', mainFocus: 'Ship auth feature' })
    mockCallClaude.mockResolvedValue('Last position: DB\nNext action: Move to hook')

    render(<ReEntryPrompt user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /where was i/i }))
    await screen.findByText(/last position/i)

    const [messages] = mockCallClaude.mock.calls[0] as [Array<{content: string}>]
    expect(messages[0].content).toContain('Ship auth feature')
    expect(messages[0].content).toContain('Finished DB schema')
  })

  it('sends fallback message when no context exists', async () => {
    mockFetchContext.mockResolvedValue({ endContext: null, mainFocus: null })
    mockCallClaude.mockResolvedValue('Last position: Unknown\nNext action: Check kickstart')

    render(<ReEntryPrompt user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /where was i/i }))
    await screen.findByText(/last position/i)

    const [messages] = mockCallClaude.mock.calls[0] as [Array<{content: string}>]
    expect(messages[0].content).toBe('No context available for today.')
  })

  it('shows error message when Claude throws', async () => {
    mockFetchContext.mockResolvedValue({ endContext: null, mainFocus: null })
    mockCallClaude.mockRejectedValue(new Error('Network timeout'))

    render(<ReEntryPrompt user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /where was i/i }))

    expect(await screen.findByText(/could not reach claude/i)).toBeInTheDocument()
  })

  it('clears result when Dismiss is clicked', async () => {
    mockFetchContext.mockResolvedValue({ endContext: 'Done', mainFocus: 'Auth' })
    mockCallClaude.mockResolvedValue('Last position: Saved\nNext action: Deploy')

    render(<ReEntryPrompt user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /where was i/i }))
    await screen.findByText(/last position/i)

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(screen.queryByText(/last position/i)).not.toBeInTheDocument()
  })

  it('shows nothing when fetchContext returns null (hook error)', async () => {
    mockFetchContext.mockResolvedValue(null)

    render(<ReEntryPrompt user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /where was i/i }))

    expect(mockCallClaude).not.toHaveBeenCalled()
    expect(screen.queryByText(/last position/i)).not.toBeInTheDocument()
  })
})
