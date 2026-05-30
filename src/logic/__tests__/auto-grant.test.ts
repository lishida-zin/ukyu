import { describe, it, expect } from 'vitest'
import { generateAutoGrants } from '../auto-grant'
import type { Grant } from '../../db/types'
import type { GrantRuleConfig } from '../grant-rules'

const defaultRules: GrantRuleConfig[] = [
  { yearsOfService: 0.5, grantDays: 10 },
  { yearsOfService: 1.5, grantDays: 11 },
  { yearsOfService: 2.5, grantDays: 12 },
  { yearsOfService: 3.5, grantDays: 14 },
  { yearsOfService: 4.5, grantDays: 16 },
  { yearsOfService: 5.5, grantDays: 18 },
  { yearsOfService: 6.5, grantDays: 20 },
]

describe('generateAutoGrants', () => {
  it('2022年4月入社 → 2022年12月から毎年付与', () => {
    const grants = generateAutoGrants('2022-04-01', defaultRules, [], '2026-03-05')

    expect(grants).toHaveLength(4)
    expect(grants[0]).toMatchObject({ grantDate: '2022-12-01', totalDays: 10 })
    expect(grants[1]).toMatchObject({ grantDate: '2023-12-01', totalDays: 11 })
    expect(grants[2]).toMatchObject({ grantDate: '2024-12-01', totalDays: 12 })
    expect(grants[3]).toMatchObject({ grantDate: '2025-12-01', totalDays: 14 })
  })

  it('未来の付与は含まない', () => {
    const grants = generateAutoGrants('2022-04-01', defaultRules, [], '2023-06-01')

    expect(grants).toHaveLength(1)
    expect(grants[0]).toMatchObject({ grantDate: '2022-12-01', totalDays: 10 })
  })

  it('既存のGrantがあればスキップ', () => {
    const existing: Grant[] = [
      {
        id: 1,
        profileId: 1,
        leaveKind: 'paid',
        fiscalYear: 2022,
        grantDate: '2022-12-01',
        expiryDate: '2024-11-30',
        totalDays: 10,
        source: 'new',
      },
    ]
    const grants = generateAutoGrants('2022-04-01', defaultRules, existing, '2024-06-01')

    expect(grants).toHaveLength(1)
    expect(grants[0].grantDate).toBe('2023-12-01')
  })

  it('消滅日は付与日から2年後の前日', () => {
    const grants = generateAutoGrants('2022-04-01', defaultRules, [], '2023-01-01')

    expect(grants[0].expiryDate).toBe('2024-11-30')
  })

  it('1月入社 → 同年12月に初回付与（6ヶ月以上経過）', () => {
    const grants = generateAutoGrants('2022-01-01', defaultRules, [], '2023-06-01')

    expect(grants).toHaveLength(1)
    expect(grants[0]).toMatchObject({ grantDate: '2022-12-01', totalDays: 10 })
  })

  it('10月入社 → 翌年12月に初回付与（同年12月は2ヶ月しか経ってない）', () => {
    const grants = generateAutoGrants('2022-10-01', defaultRules, [], '2024-06-01')

    expect(grants).toHaveLength(1)
    expect(grants[0]).toMatchObject({ grantDate: '2023-12-01', totalDays: 10 })
  })

  it('入社日が空なら空配列', () => {
    expect(generateAutoGrants('', defaultRules, [])).toEqual([])
  })

  it('ルールが空なら空配列', () => {
    expect(generateAutoGrants('2022-04-01', [], [])).toEqual([])
  })

  it('sourceは全て"new"', () => {
    const grants = generateAutoGrants('2022-04-01', defaultRules, [], '2024-01-01')
    grants.forEach((g) => expect(g.source).toBe('new'))
  })

  it('leaveKindは全て"paid"', () => {
    const grants = generateAutoGrants('2022-04-01', defaultRules, [], '2024-01-01')
    grants.forEach((g) => expect(g.leaveKind).toBe('paid'))
  })
})
