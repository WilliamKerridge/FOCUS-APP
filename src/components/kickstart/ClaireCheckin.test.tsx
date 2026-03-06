// src/components/kickstart/ClaireCheckin.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ClaireCheckin from './ClaireCheckin'

const onSave = vi.fn()
const onSkip = vi.fn()

beforeEach(() => vi.clearAllMocks())

describe('ClaireCheckin', () => {
  it('renders the heading and three options', () => {
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    expect(screen.getByText(/how was your evening with claire/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /quality time/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /partially present/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /didn't manage it/i })).toBeInTheDocument()
  })

  it('calls onSave with yes when Quality time tapped', async () => {
    onSave.mockResolvedValue(null)
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /quality time/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('yes', null))
  })

  it("calls onSave with no when Didn't manage it tapped", async () => {
    onSave.mockResolvedValue(null)
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /didn't manage it/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('no', null))
  })

  it('shows blocker input when Partially present tapped', () => {
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /partially present/i }))
    expect(screen.getByLabelText(/what got in the way/i)).toBeInTheDocument()
  })

  it('calls onSave with partial + blocker text on Continue', async () => {
    onSave.mockResolvedValue(null)
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /partially present/i }))
    fireEvent.change(screen.getByLabelText(/what got in the way/i), { target: { value: 'phone' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('partial', 'phone'))
  })

  it('calls onSkip when Skip tapped', () => {
    render(<ClaireCheckin onSave={onSave} onSkip={onSkip} saving={false} />)
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onSkip).toHaveBeenCalled()
  })
})
