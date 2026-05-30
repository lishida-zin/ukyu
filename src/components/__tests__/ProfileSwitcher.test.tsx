import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProfileSwitcher } from '../ProfileSwitcher'
import * as activeProfileContext from '../../contexts/ActiveProfileContext'
import * as profilesHook from '../../hooks/useProfiles'

describe('ProfileSwitcher', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('2件のプロフィールを描画し、2番目のクリックでアクティブプロフィールを切り替える', async () => {
    const user = userEvent.setup()
    const setActiveProfile = vi.fn()

    vi.spyOn(profilesHook, 'useProfiles').mockReturnValue({
      profiles: [
        {
          id: 1,
          name: 'わたし',
          color: '#C4B5FD',
          hireDate: '2024-04-01',
          order: 0,
          createdAt: '2026-05-31T00:00:00.000Z',
        },
        {
          id: 2,
          name: '家族',
          color: '#A7F3D0',
          hireDate: '2023-04-01',
          order: 1,
          createdAt: '2026-05-31T00:00:00.000Z',
        },
      ],
      addProfile: vi.fn(),
      updateProfile: vi.fn(),
      deleteProfile: vi.fn(),
      ensureDefaultProfile: vi.fn(),
    })
    vi.spyOn(activeProfileContext, 'useActiveProfileId').mockReturnValue(1)
    vi.spyOn(activeProfileContext, 'useSetActiveProfile').mockReturnValue(setActiveProfile)

    render(<ProfileSwitcher />)

    expect(screen.getByRole('tab', { name: /わたし/ })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /家族/ }))

    expect(setActiveProfile).toHaveBeenCalledWith(2)
  })
})
