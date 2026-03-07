import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Calendar } from '../Calendar'
import type { Usage } from '../../db/types'

describe('Calendar', () => {
  const baseProps = {
    usages: [] as Usage[],
    onDateClick: vi.fn(),
  }

  it('renders month header with current month', () => {
    render(<Calendar {...baseProps} />)
    const now = new Date()
    const expected = `${now.getFullYear()}年 ${now.getMonth() + 1}月`
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it('renders weekday headers', () => {
    render(<Calendar {...baseProps} />)
    expect(screen.getByText('日')).toBeInTheDocument()
    expect(screen.getByText('月')).toBeInTheDocument()
    expect(screen.getByText('土')).toBeInTheDocument()
  })

  it('renders day numbers', () => {
    render(<Calendar {...baseProps} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('navigates to previous month', async () => {
    const user = userEvent.setup()
    render(<Calendar {...baseProps} />)
    await user.click(screen.getByLabelText('前月'))
    const now = new Date()
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth()
    expect(screen.getByText(new RegExp(`${prevMonth}月`))).toBeInTheDocument()
  })

  it('navigates to next month', async () => {
    const user = userEvent.setup()
    render(<Calendar {...baseProps} />)
    await user.click(screen.getByLabelText('翌月'))
    const now = new Date()
    const nextMonth = now.getMonth() === 11 ? 1 : now.getMonth() + 2
    expect(screen.getByText(new RegExp(`${nextMonth}月`))).toBeInTheDocument()
  })

  it('calls onDateClick when a day is clicked', async () => {
    const user = userEvent.setup()
    const onDateClick = vi.fn()
    render(<Calendar usages={[]} onDateClick={onDateClick} />)
    await user.click(screen.getByText('15'))
    expect(onDateClick).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-15$/))
  })

  it('shows usage badges for days with usages', () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const usages: Usage[] = [
      { id: 1, date: `${y}-${m}-10`, type: 'full', status: 'planned', grantId: 1, memo: '' },
      { id: 2, date: `${y}-${m}-10`, type: 'am', status: 'used', grantId: 1, memo: '' },
    ]
    render(<Calendar usages={usages} onDateClick={vi.fn()} />)
    expect(screen.getByText('全予')).toBeInTheDocument()
    expect(screen.getByText('午前済')).toBeInTheDocument()
  })
})
