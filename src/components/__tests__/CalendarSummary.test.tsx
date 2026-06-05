import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CalendarSummary } from '../CalendarSummary'

describe('CalendarSummary', () => {
  it('のこり・つかった・よていを表示する', () => {
    render(
      <CalendarSummary
        totalRemaining={10}
        totalPlanned={3}
        cycleUsed={2}
        cyclePlanned={3}
        cycleExpiringDays={0}
        cycle={{ start: '2026-04-01', end: '2027-03-31' }}
      />,
    )
    expect(screen.getByText('のこり')).toBeInTheDocument()
    expect(screen.getByText('つかった')).toBeInTheDocument()
    expect(screen.getByText('よてい')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('よていがあるとき、のこりカード内に予定を引いたのこりを表示する', () => {
    render(
      <CalendarSummary
        totalRemaining={10}
        totalPlanned={3}
        cycleUsed={0}
        cyclePlanned={3}
        cycleExpiringDays={0}
        cycle={{ start: '2026-04-01', end: '2027-03-31' }}
      />,
    )
    // 現在の残り 10、予定を引いた残り 10 - 3 = 7 の 2 つが見える
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('よていをひくと')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('よていが無いとき、予定を引いたのこりは表示しない', () => {
    render(
      <CalendarSummary
        totalRemaining={10}
        totalPlanned={0}
        cycleUsed={0}
        cyclePlanned={0}
        cycleExpiringDays={0}
        cycle={{ start: '2026-04-01', end: '2027-03-31' }}
      />,
    )
    expect(screen.queryByText('よていをひくと')).not.toBeInTheDocument()
  })
})
