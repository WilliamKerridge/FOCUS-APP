import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'
import type { EmailInboxItem } from '@/types'
import EmailInboxReview from './EmailInboxReview'

const fakeUser = { id: 'user-1' } as User

const extraction = {
  actions: [
    { title: 'Reply to contract', priority: 'focus' as const, due_date: null },
    { title: 'Send invoice', priority: 'must_today' as const, due_date: null },
  ],
  waiting_for: [
    { title: 'Approval', person: 'Alice', time_sensitive: true },
    { title: 'Quote', person: 'Bob', time_sensitive: false },
  ],
  promises: [],
  summary: 'Contract negotiation follow-up',
}

const baseItem: EmailInboxItem = {
  id: 'inbox-1',
  user_id: 'user-1',
  sender_email: 'alice@example.com',
  context: 'work',
  subject: 'Follow up',
  extraction,
  flagged: false,
  reviewed: false,
  created_at: '2026-03-04T10:00:00Z',
}

beforeEach(() => { vi.clearAllMocks() })

describe('EmailInboxReview', () => {
  it('renders actions and waiting_for checkboxes all pre-checked', () => {
    render(<EmailInboxReview user={fakeUser} item={baseItem} onSave={vi.fn()} onDone={vi.fn()} />)
    expect(screen.getByText(/reply to contract/i)).toBeInTheDocument()
    expect(screen.getByText(/send invoice/i)).toBeInTheDocument()
    expect(screen.getByText(/approval/i)).toBeInTheDocument()
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(4)
    checkboxes.forEach(cb => expect(cb).toBeChecked())
  })

  it('shows review manually message and no checkboxes when extraction is null', () => {
    const nullItem: EmailInboxItem = { ...baseItem, extraction: null }
    const onSave = vi.fn().mockResolvedValue(null)
    const onDone = vi.fn()
    render(<EmailInboxReview user={fakeUser} item={nullItem} onSave={onSave} onDone={onDone} />)
    expect(screen.getByText(/could not extract/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    // Save button still present
    expect(screen.getByRole('button', { name: /save and mark reviewed/i })).toBeInTheDocument()
  })

  it('calls onSave with 0 tasks and then onDone for null extraction', async () => {
    const nullItem: EmailInboxItem = { ...baseItem, extraction: null }
    const onSave = vi.fn().mockResolvedValue(null)
    const onDone = vi.fn()
    render(<EmailInboxReview user={fakeUser} item={nullItem} onSave={onSave} onDone={onDone} />)
    await userEvent.click(screen.getByRole('button', { name: /save and mark reviewed/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('inbox-1', []))
    expect(onDone).toHaveBeenCalled()
  })

  it('shows yellow warning banner for flagged items', () => {
    const flaggedItem: EmailInboxItem = { ...baseItem, flagged: true }
    render(<EmailInboxReview user={fakeUser} item={flaggedItem} onSave={vi.fn()} onDone={vi.fn()} />)
    // Banner contains "From unknown sender: ..." text
    expect(screen.getByText(/unknown sender/i)).toBeInTheDocument()
    // alice@example.com appears in both banner and "From" section — at least one present
    expect(screen.getAllByText(/alice@example.com/i).length).toBeGreaterThan(0)
  })

  it('excludes unchecked action from onSave call', async () => {
    const onSave = vi.fn().mockResolvedValue(null)
    render(<EmailInboxReview user={fakeUser} item={baseItem} onSave={onSave} onDone={vi.fn()} />)
    // Uncheck first action
    const checkboxes = screen.getAllByRole('checkbox')
    await userEvent.click(checkboxes[0])
    await userEvent.click(screen.getByRole('button', { name: /save and mark reviewed/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const taskInserts = onSave.mock.calls[0][1] as Array<{ title: string }>
    expect(taskInserts.some(t => t.title === 'Reply to contract')).toBe(false)
    expect(taskInserts.some(t => t.title === 'Send invoice')).toBe(true)
  })

  it('calls onSave with correct inserts then calls onDone on success', async () => {
    const onSave = vi.fn().mockResolvedValue(null)
    const onDone = vi.fn()
    render(<EmailInboxReview user={fakeUser} item={baseItem} onSave={onSave} onDone={onDone} />)
    await userEvent.click(screen.getByRole('button', { name: /save and mark reviewed/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('inbox-1', expect.any(Array)))
    expect(onDone).toHaveBeenCalled()
  })

  it('shows error string and does not call onDone when save fails', async () => {
    const onSave = vi.fn().mockResolvedValue("Couldn't save — try again.")
    const onDone = vi.fn()
    render(<EmailInboxReview user={fakeUser} item={baseItem} onSave={onSave} onDone={onDone} />)
    await userEvent.click(screen.getByRole('button', { name: /save and mark reviewed/i }))

    await waitFor(() => expect(screen.getByText(/couldn't save/i)).toBeInTheDocument())
    expect(onDone).not.toHaveBeenCalled()
  })

  it('maps waiting_for time_sensitive to correct priority', async () => {
    const onSave = vi.fn().mockResolvedValue(null)
    render(<EmailInboxReview user={fakeUser} item={baseItem} onSave={onSave} onDone={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /save and mark reviewed/i }))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const taskInserts = onSave.mock.calls[0][1] as Array<{ title: string; priority: number; context: string }>
    const aliceTask = taskInserts.find(t => t.title === 'Alice: Approval')
    const bobTask = taskInserts.find(t => t.title === 'Bob: Quote')
    expect(aliceTask?.priority).toBe(1) // time_sensitive=true
    expect(bobTask?.priority).toBe(3)   // time_sensitive=false
  })
})
