import { describe, it, expect } from 'vitest'
import { getGrantMonth, getCurrentCycle } from '../grant-cycle'

describe('getGrantMonth', () => {
  it('returns 10 for April hire (4+6=10)', () => {
    expect(getGrantMonth('2023-04-15')).toBe(10)
  })

  it('returns 12 for June hire (6+6=12)', () => {
    expect(getGrantMonth('2023-06-01')).toBe(12)
  })

  it('returns 2 for August hire (8+6=14->2)', () => {
    expect(getGrantMonth('2023-08-01')).toBe(2)
  })

  it('returns 7 for January hire (1+6=7)', () => {
    expect(getGrantMonth('2024-01-10')).toBe(7)
  })

  it('returns 12 when no hireDate', () => {
    expect(getGrantMonth()).toBe(12)
    expect(getGrantMonth('')).toBe(12)
  })
})

describe('getCurrentCycle', () => {
  it('returns Dec-Nov cycle for grantMonth=12 when in March', () => {
    const cycle = getCurrentCycle(12, '2026-03-08')
    expect(cycle.start).toBe('2025-12-01')
    expect(cycle.end).toBe('2026-11-30')
  })

  it('returns Dec-Nov cycle for grantMonth=12 when in December', () => {
    const cycle = getCurrentCycle(12, '2026-12-15')
    expect(cycle.start).toBe('2026-12-01')
    expect(cycle.end).toBe('2027-11-30')
  })

  it('returns Oct-Sep cycle for grantMonth=10 when in Feb', () => {
    const cycle = getCurrentCycle(10, '2026-02-01')
    expect(cycle.start).toBe('2025-10-01')
    expect(cycle.end).toBe('2026-09-30')
  })

  it('returns Feb-Jan cycle for grantMonth=2 when in May', () => {
    const cycle = getCurrentCycle(2, '2026-05-01')
    expect(cycle.start).toBe('2026-02-01')
    expect(cycle.end).toBe('2027-01-31')
  })
})
