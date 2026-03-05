// src/components/common/PushPermissionBanner.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'

const mockSubscribe = vi.fn()

const state = vi.hoisted(() => ({
  supported: true,
  permission: 'default' as NotificationPermission,
  subscribed: false,
}))

vi.mock('@/hooks/useTransitionReminder', () => ({
  useTransitionReminder: () => ({
    supported: state.supported,
    permission: state.permission,
    subscribed: state.subscribed,
    loading: false,
    subscribe: mockSubscribe,
    unsubscribe: vi.fn(),
  }),
}))

import PushPermissionBanner from './PushPermissionBanner'

const fakeUser = { id: 'user-1' } as User

beforeEach(() => {
  vi.clearAllMocks()
  state.supported = true
  state.permission = 'default'
  state.subscribed = false
  localStorage.clear()
})

describe('PushPermissionBanner', () => {
  it('renders when supported, permission=default, not subscribed', () => {
    render(<PushPermissionBanner user={fakeUser} />)
    expect(screen.getByText(/nudge at transition time/i)).toBeInTheDocument()
  })

  it('does not render when already subscribed', () => {
    state.subscribed = true
    render(<PushPermissionBanner user={fakeUser} />)
    expect(screen.queryByText(/nudge at transition time/i)).not.toBeInTheDocument()
  })

  it('does not render when permission is granted', () => {
    state.permission = 'granted'
    render(<PushPermissionBanner user={fakeUser} />)
    expect(screen.queryByText(/nudge at transition time/i)).not.toBeInTheDocument()
  })

  it('does not render when not supported', () => {
    state.supported = false
    render(<PushPermissionBanner user={fakeUser} />)
    expect(screen.queryByText(/nudge at transition time/i)).not.toBeInTheDocument()
  })

  it('calls subscribe on Allow click', async () => {
    mockSubscribe.mockResolvedValue(null)
    render(<PushPermissionBanner user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /allow/i }))
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('hides after Not now click and sets localStorage flag', async () => {
    render(<PushPermissionBanner user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /not now/i }))
    expect(screen.queryByText(/nudge at transition time/i)).not.toBeInTheDocument()
    expect(localStorage.getItem('push-banner-dismissed')).toBe('1')
  })

  it('does not render when already dismissed (localStorage pre-populated)', () => {
    localStorage.setItem('push-banner-dismissed', '1')
    render(<PushPermissionBanner user={fakeUser} />)
    expect(screen.queryByText(/nudge at transition time/i)).not.toBeInTheDocument()
  })

  it('shows error message when subscribe fails', async () => {
    mockSubscribe.mockResolvedValue('Could not subscribe to notifications')
    render(<PushPermissionBanner user={fakeUser} />)
    await userEvent.click(screen.getByRole('button', { name: /allow/i }))
    await waitFor(() => expect(screen.getByText(/could not subscribe/i)).toBeInTheDocument())
  })
})
