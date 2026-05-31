import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UsageForm } from '../UsageForm'
import type { Grant } from '../../db/types'

const paidGrant: Grant = {
  id: 1,
  profileId: 1,
  leaveKind: 'paid',
  fiscalYear: 2024,
  grantDate: '2024-12-01',
  expiryDate: '2026-11-30',
  totalDays: 10,
  source: 'new',
}

const refreshGrant: Grant = {
  id: 2,
  profileId: 1,
  leaveKind: 'refresh',
  fiscalYear: 2025,
  grantDate: '2025-04-01',
  expiryDate: '2030-03-31',
  totalDays: 5,
  source: 'new',
  auto: true,
  ruleKey: '1#0',
}

describe('UsageForm', () => {
  it('リフレッシュ付与が無いときは種別トグルを出さず、有給付与で登録する', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <UsageForm
        date="2026-06-10"
        paidGrants={[paidGrant]}
        refreshGrants={[]}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText('リフレッシュ')).toBeNull()
    await user.click(screen.getByText('とうろく'))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ grantId: 1 }))
  })

  it('リフレッシュを選ぶとリフレッシュ付与で登録する', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <UsageForm
        date="2026-06-10"
        paidGrants={[paidGrant]}
        refreshGrants={[refreshGrant]}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByText('リフレッシュ'))
    await user.click(screen.getByText('とうろく'))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ grantId: 2 }))
  })

  it('リフレッシュ付与が無く onOpenSettings があるとき、設定への導線を表示しクリックで呼ぶ', async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()
    render(
      <UsageForm
        date="2026-06-10"
        paidGrants={[paidGrant]}
        refreshGrants={[]}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        onOpenSettings={onOpenSettings}
      />,
    )

    const link = screen.getByRole('button', { name: /せっていをひらく/ })
    await user.click(link)
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('リフレッシュ付与があるときは設定への導線を出さない', () => {
    render(
      <UsageForm
        date="2026-06-10"
        paidGrants={[paidGrant]}
        refreshGrants={[refreshGrant]}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
        onOpenSettings={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /せっていをひらく/ })).toBeNull()
  })
})
