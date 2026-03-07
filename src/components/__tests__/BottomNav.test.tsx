import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BottomNav } from '../BottomNav'

describe('BottomNav', () => {
  it('renders 2 tabs', () => {
    render(<BottomNav activeTab="calendar" onTabChange={() => {}} />)
    expect(screen.getByText('ホーム')).toBeInTheDocument()
    expect(screen.getByText('設定')).toBeInTheDocument()
  })

  it('calls onTabChange with correct tab id on click', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<BottomNav activeTab="calendar" onTabChange={handleChange} />)

    await user.click(screen.getByText('設定'))
    expect(handleChange).toHaveBeenCalledWith('settings')
  })
})
