import { describe, expect, it } from 'vitest';
import { buildDefaultProfile } from '../migration';

describe('buildDefaultProfile', () => {
  it('既存の hireDate を引き継いだ既定プロフィールを作る', () => {
    const p = buildDefaultProfile('2022-06-01', '2026-05-31T00:00:00.000Z');
    expect(p.name).toBe('わたし');
    expect(p.hireDate).toBe('2022-06-01');
    expect(p.order).toBe(0);
    expect(p.color).toMatch(/^#/);
    expect(p.createdAt).toBe('2026-05-31T00:00:00.000Z');
  });

  it('hireDate が無ければ空文字で作る', () => {
    const p = buildDefaultProfile(undefined, '2026-05-31T00:00:00.000Z');
    expect(p.hireDate).toBe('');
  });
});
