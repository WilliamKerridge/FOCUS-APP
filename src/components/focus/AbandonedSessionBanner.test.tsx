import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AbandonedSessionBanner from './AbandonedSessionBanner'
import type { FocusSession } from '@/types'

const session: FocusSession = {
  id: 'old-1',
  user_id: 'user-1',
  date: '2026-03-02',
  type: 'work',
  planned_duration_mins: 25,
  start_context: 'Something',
  started_at: '2026-03-02T09:30:00Z',
  ended_at: null,
  actual_duration_mins: null,
  end_context: null,
  exited_early: null,
}

describe('AbandonedSessionBanner', () => {
  it('shows the session start time', () => {
    render(<AbandonedSessionBanner session={session} onClose={vi.fn()} />)
    // Time is locale-formatted; just confirm it contains "09:" or "9:"
    const text = screen.getByText(/open session from/i).textContent ?? ''
    expect(text).toMatch(/\d{1,2}:\d{2}/)
  })

  it('shows the "Close it" button', () => {
    render(<AbandonedSessionBanner session={session} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /close it/i })).toBeInTheDocument()
  })

  it('opens the close modal when "Close it" is clicked', async () => {
    render(<AbandonedSessionBanner session={session} onClose={vi.fn().mockResolvedValue(null)} />)
    await userEvent.click(screen.getByRole('button', { name: /close it/i }))
    expect(screen.getByLabelText(/where did you get to/i)).toBeInTheDocument()
  })

  it('calls onClose with the entered context when Done is clicked', async () => {
    const onClose = vi.fn().mockResolvedValue(null)
    render(<AbandonedSessionBanner session={session} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close it/i }))
    await userEvent.type(screen.getByRole('textbox'), 'Left mid-sprint')
    await userEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(onClose).toHaveBeenCalledWith('Left mid-sprint')
  })

  it('closes the modal after a successful save', async () => {
    const onClose = vi.fn().mockResolvedValue(null)
    render(<AbandonedSessionBanner session={session} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close it/i }))
    await userEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(screen.queryByLabelText(/where did you get to/i)).not.toBeInTheDocument()
  })

  it('shows an error message when onClose returns an error string', async () => {
    const onClose = vi.fn().mockResolvedValue('Could not save — try again.')
    render(<AbandonedSessionBanner session={session} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close it/i }))
    await userEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(await screen.findByText(/could not save/i)).toBeInTheDocument()
  })

  it('shows an error message when onClose throws', async () => {
    const onClose = vi.fn().mockRejectedValue(new Error('network'))
    render(<AbandonedSessionBanner session={session} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /close it/i }))
    await userEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(await screen.findByText(/could not save/i)).toBeInTheDocument()
  })
})
