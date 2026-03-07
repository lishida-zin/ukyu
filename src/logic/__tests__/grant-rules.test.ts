import { describe, it, expect } from 'vitest';
import {
  calculateYearsOfService,
  getGrantDaysByRule,
  getDefaultGrantRules,
} from '../grant-rules';

describe('calculateYearsOfService', () => {
  it('should return 0.5 for 6 months of service', () => {
    const result = calculateYearsOfService('2025-04-01', '2025-10-01');
    expect(result).toBe(0.5);
  });

  it('should return 1.0 for 1 year of service', () => {
    const result = calculateYearsOfService('2024-04-01', '2025-04-01');
    expect(result).toBe(1.0);
  });

  it('should return approximately 6.5 for 6.5 years', () => {
    const result = calculateYearsOfService('2019-04-01', '2025-10-01');
    expect(result).toBe(6.5);
  });

  it('should return 0 for same date', () => {
    const result = calculateYearsOfService('2025-04-01', '2025-04-01');
    expect(result).toBe(0);
  });
});

describe('getGrantDaysByRule', () => {
  const rules = getDefaultGrantRules();

  it('should return 10 for 0.5 years', () => {
    expect(getGrantDaysByRule(rules, 0.5)).toBe(10);
  });

  it('should return 11 for 1.5 years', () => {
    expect(getGrantDaysByRule(rules, 1.5)).toBe(11);
  });

  it('should return 20 for 6.5 years', () => {
    expect(getGrantDaysByRule(rules, 6.5)).toBe(20);
  });

  it('should return 20 for 10 years (above max rule)', () => {
    expect(getGrantDaysByRule(rules, 10)).toBe(20);
  });

  it('should return 0 for less than 0.5 years', () => {
    expect(getGrantDaysByRule(rules, 0.3)).toBe(0);
  });

  it('should return grant days for in-between years (rounds down to applicable rule)', () => {
    expect(getGrantDaysByRule(rules, 3.0)).toBe(12);
    expect(getGrantDaysByRule(rules, 5.0)).toBe(16);
  });
});

describe('getDefaultGrantRules', () => {
  it('should return 7 rules', () => {
    expect(getDefaultGrantRules()).toHaveLength(7);
  });

  it('should start with 0.5 years -> 10 days', () => {
    const rules = getDefaultGrantRules();
    expect(rules[0]).toEqual({ yearsOfService: 0.5, grantDays: 10 });
  });

  it('should end with 6.5 years -> 20 days', () => {
    const rules = getDefaultGrantRules();
    expect(rules[6]).toEqual({ yearsOfService: 6.5, grantDays: 20 });
  });
});
