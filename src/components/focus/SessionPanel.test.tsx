import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FocusSession } from '@/types'

// --- hoisted mocks ---
const { mockStartSession, mockEndSession, mockUseFocusSession } = vi.hoisted(() => {
  const mockStartSession = vi.fn()
  const mockEndSession = vi.fn()
  const mockUseFocusSession = vi.fn()
  return { mockStartSession, mockEndSession, mockUseFocusSession }
})

vi.mock('@/hooks/useFocusSession', () => ({ useFocusSession: mockUseFocusSession }))

import SessionPanel from './SessionPanel'
import type { User } from '@supabase/supabase-js'

const fakeUser = { id: 'user-1' } as User

const baseHookState = {
  activeSession: null as FocusSession | null,
  abandonedSession: null as FocusSession | null,
  todaySessionCount: 0,
  elapsedSeconds: 0,
  loading: false,
  loadError: null as string | null,
  startSession: mockStartSession,
  endSession: mockEndSession,
  closeAbandoned: vi.fn(),
}

function mockHook(overrides: Partial<typeof baseHookState> = {}) {
  mockUseFocusSession.mockReturnValue({ ...baseHookState, ...overrides })
}

describe('SessionPanel — idle state', () => {
  beforeEach(() => { vi.clearAllMocks(); mockHook() })

  it('renders topic input when no session is active', () => {
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByLabelText(/what are you focusing on/i)).toBeInTheDocument()
  })

  it('pre-fills topic from initialTask prop', () => {
    render(<SessionPanel user={fakeUser} initialTask="Triage Jira backlog" />)
    expect(screen.getByDisplayValue('Triage Jira backlog')).toBeInTheDocument()
  })

  it('renders the three session type buttons', () => {
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByRole('button', { name: 'Work' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Writing' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Migration' })).toBeInTheDocument()
  })

  it('renders the four preset duration buttons', () => {
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByRole('button', { name: '25m' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '45m' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '60m' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90m' })).toBeInTheDocument()
  })

  it('shows a Custom duration button', () => {
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByRole('button', { name: /custom/i })).toBeInTheDocument()
  })

  it('Start button is disabled when topic is empty', () => {
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled()
  })

  it('Start button enables after typing a topic', async () => {
    render(<SessionPanel user={fakeUser} />)
    await userEvent.type(screen.getByLabelText(/what are you focusing on/i), 'Fix the bug')
    expect(screen.getByRole('button', { name: /start/i })).not.toBeDisabled()
  })

  it('shows timer displaying 00:00', () => {
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('shows session dot count (0 sessions today)', () => {
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByText(/0 sessions today/i)).toBeInTheDocument()
  })
})

describe('SessionPanel — custom duration', () => {
  beforeEach(() => { vi.clearAllMocks(); mockHook() })

  it('shows number input after clicking Custom', async () => {
    render(<SessionPanel user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /custom/i }))
    expect(screen.getByPlaceholderText(/minutes/i)).toBeInTheDocument()
  })

  it('shows cap note when custom value exceeds 120', async () => {
    render(<SessionPanel user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /custom/i }))
    await userEvent.clear(screen.getByPlaceholderText(/minutes/i))
    await userEvent.type(screen.getByPlaceholderText(/minutes/i), '150')
    expect(screen.getByText(/capped at 2 hours/i)).toBeInTheDocument()
  })

  it('does not show cap note when custom value is 120 or less', async () => {
    render(<SessionPanel user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /custom/i }))
    await userEvent.clear(screen.getByPlaceholderText(/minutes/i))
    await userEvent.type(screen.getByPlaceholderText(/minutes/i), '90')
    expect(screen.queryByText(/capped/i)).not.toBeInTheDocument()
  })
})

describe('SessionPanel — starting a session', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('calls startSession with topic, type, and selected duration', async () => {
    mockHook()
    mockStartSession.mockResolvedValue(null)
    render(<SessionPanel user={fakeUser} />)
    await userEvent.type(screen.getByLabelText(/what are you focusing on/i), 'Fix auth bug')
    await userEvent.click(screen.getByRole('button', { name: '45m' }))
    await userEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(mockStartSession).toHaveBeenCalledWith('work', 45, 'Fix auth bug')
  })

  it('shows session error when startSession returns an error string', async () => {
    mockHook()
    mockStartSession.mockResolvedValue('Could not start session — try again.')
    render(<SessionPanel user={fakeUser} />)
    await userEvent.type(screen.getByLabelText(/what are you focusing on/i), 'Fix auth bug')
    await userEvent.click(screen.getByRole('button', { name: /start/i }))
    expect(await screen.findByText(/could not start session/i)).toBeInTheDocument()
  })
})

describe('SessionPanel — active session', () => {
  const activeSession: FocusSession = {
    id: 'session-1',
    user_id: 'user-1',
    date: '2026-03-03',
    type: 'work',
    planned_duration_mins: 25,
    start_context: 'Open Jira and triage the backlog',
    started_at: new Date().toISOString(),
    ended_at: null,
    actual_duration_mins: null,
    end_context: null,
    exited_early: false,
    created_at: '',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockHook({ activeSession, elapsedSeconds: 300 }) // 5 mins elapsed
  })

  it('shows start_context card instead of topic input', () => {
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByText('Open Jira and triage the backlog')).toBeInTheDocument()
    expect(screen.queryByLabelText(/what are you focusing on/i)).not.toBeInTheDocument()
  })

  it('hides session type and duration selectors', () => {
    render(<SessionPanel user={fakeUser} />)
    expect(screen.queryByText(/session type/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '25m' })).not.toBeInTheDocument()
  })

  it('shows elapsed time', () => {
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByText('05:00')).toBeInTheDocument()
  })

  it('shows "Finish session" button instead of Start', () => {
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByRole('button', { name: /finish session/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument()
  })

  it('opens close modal when Finish session is clicked', async () => {
    render(<SessionPanel user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /finish session/i }))
    expect(screen.getByLabelText(/where did you get to/i)).toBeInTheDocument()
  })

  it('calls endSession after filling in context and clicking Done', async () => {
    mockEndSession.mockResolvedValue(null)
    render(<SessionPanel user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /finish session/i }))
    await userEvent.type(screen.getByRole('textbox'), 'Done with triage')
    await userEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(mockEndSession).toHaveBeenCalledWith('Done with triage', true) // isEarlyExit=true (5 of 25 mins)
  })
})

describe('SessionPanel — auto-completion', () => {
  const activeSession: FocusSession = {
    id: 'session-1',
    user_id: 'user-1',
    date: '2026-03-03',
    type: 'work',
    planned_duration_mins: 25,
    start_context: 'Triage backlog',
    started_at: new Date().toISOString(),
    ended_at: null,
    actual_duration_mins: null,
    end_context: null,
    exited_early: false,
    created_at: '',
  }

  it('opens close modal automatically when elapsed >= planned', () => {
    mockHook({ activeSession, elapsedSeconds: 1500 }) // exactly 25 mins
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByLabelText(/where did you get to/i)).toBeInTheDocument()
  })

  it('passes isEarlyExit=false to endSession when time is up', async () => {
    mockHook({ activeSession, elapsedSeconds: 1500 })
    mockEndSession.mockResolvedValue(null)
    render(<SessionPanel user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(mockEndSession).toHaveBeenCalledWith('', false)
  })
})

describe('SessionPanel — session dots', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows singular "session" for 1 completed session', () => {
    mockHook({ todaySessionCount: 1 })
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByText(/1 session today/i)).toBeInTheDocument()
  })

  it('shows plural "sessions" for multiple completed sessions', () => {
    mockHook({ todaySessionCount: 3 })
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByText(/3 sessions today/i)).toBeInTheDocument()
  })
})

describe('SessionPanel — loading and error states', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows a loading skeleton when loading is true', () => {
    mockHook({ loading: true })
    const { container } = render(<SessionPanel user={fakeUser} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows loadError message', () => {
    mockHook({ loadError: 'Could not load sessions — try refreshing.' })
    render(<SessionPanel user={fakeUser} />)
    expect(screen.getByText(/could not load sessions/i)).toBeInTheDocument()
  })
})
