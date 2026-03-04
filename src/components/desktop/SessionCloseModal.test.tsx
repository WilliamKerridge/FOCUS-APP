import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SessionCloseModal from './SessionCloseModal'

function renderModal(overrides: Partial<React.ComponentProps<typeof SessionCloseModal>> = {}) {
  const props = {
    isEarlyExit: false,
    remainingMins: 0,
    onKeepGoing: vi.fn(),
    onClose: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(<SessionCloseModal {...props} />)
  return props
}

describe('SessionCloseModal', () => {
  it('always renders the "Where did you get to?" textarea', () => {
    renderModal()
    expect(screen.getByLabelText(/where did you get to/i)).toBeInTheDocument()
  })

  it('shows remaining minutes and Keep going button on early exit', () => {
    renderModal({ isEarlyExit: true, remainingMins: 12 })
    expect(screen.getByText(/12 minutes remaining/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /keep going/i })).toBeInTheDocument()
  })

  it('hides early-exit UI when autoTriggered is true', () => {
    renderModal({ isEarlyExit: true, remainingMins: 0, autoTriggered: true })
    expect(screen.queryByText(/minutes remaining/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /keep going/i })).not.toBeInTheDocument()
  })

  it('hides early-exit UI when isEarlyExit is false', () => {
    renderModal({ isEarlyExit: false, remainingMins: 0 })
    expect(screen.queryByText(/minutes remaining/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /keep going/i })).not.toBeInTheDocument()
  })

  it('calls onKeepGoing when Keep going is clicked', async () => {
    const { onKeepGoing } = renderModal({ isEarlyExit: true, remainingMins: 5 })
    await userEvent.click(screen.getByRole('button', { name: /keep going/i }))
    expect(onKeepGoing).toHaveBeenCalledOnce()
  })

  it('calls onClose with the typed end context when Done is clicked', async () => {
    const { onClose } = renderModal()
    await userEvent.type(screen.getByRole('textbox'), 'Reached the login screen')
    await userEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(onClose).toHaveBeenCalledWith('Reached the login screen')
  })

  it('calls onClose with empty string when textarea is left blank', async () => {
    const { onClose } = renderModal()
    await userEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(onClose).toHaveBeenCalledWith('')
  })

  it('shows Saving… and disables Done while saving', async () => {
    let resolve!: () => void
    const slowClose = vi.fn(() => new Promise<void>(r => { resolve = r }))
    renderModal({ onClose: slowClose })

    await userEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()

    resolve()
  })

  it('uses singular "minute" when 1 minute remaining', () => {
    renderModal({ isEarlyExit: true, remainingMins: 1 })
    expect(screen.getByText(/1 minute remaining/i)).toBeInTheDocument()
  })
})
