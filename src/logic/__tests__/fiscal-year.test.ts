import { describe, it, expect } from 'vitest';
import { getFiscalYear, getFiscalYearRange } from '../fiscal-year';

describe('getFiscalYear', () => {
  it('should return current year when date is on or after fiscal year start', () => {
    expect(getFiscalYear('2025-04-01', '04-01')).toBe(2025);
    expect(getFiscalYear('2025-12-31', '04-01')).toBe(2025);
  });

  it('should return previous year when date is before fiscal year start', () => {
    expect(getFiscalYear('2025-03-31', '04-01')).toBe(2024);
    expect(getFiscalYear('2025-01-01', '04-01')).toBe(2024);
  });

  it('should handle January fiscal year start', () => {
    expect(getFiscalYear('2025-01-01', '01-01')).toBe(2025);
    expect(getFiscalYear('2025-12-31', '01-01')).toBe(2025);
  });

  it('should handle October fiscal year start', () => {
    expect(getFiscalYear('2025-10-01', '10-01')).toBe(2025);
    expect(getFiscalYear('2025-09-30', '10-01')).toBe(2024);
  });
});

describe('getFiscalYearRange', () => {
  it('should return correct range for April fiscal year', () => {
    const range = getFiscalYearRange(2025, '04-01');
    expect(range.start).toBe('2025-04-01');
    expect(range.end).toBe('2026-03-31');
  });

  it('should return correct range for January fiscal year', () => {
    const range = getFiscalYearRange(2025, '01-01');
    expect(range.start).toBe('2025-01-01');
    expect(range.end).toBe('2025-12-31');
  });

  it('should return correct range for October fiscal year', () => {
    const range = getFiscalYearRange(2025, '10-01');
    expect(range.start).toBe('2025-10-01');
    expect(range.end).toBe('2026-09-30');
  });
});
