import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProfileSettings } from '../ProfileSettings'
import * as profilesHook from '../../hooks/useProfiles'
import * as activeProfileContext from '../../contexts/ActiveProfileContext'

describe('ProfileSettings', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('最後の1件は削除できない', () => {
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
      ],
      addProfile: vi.fn(),
      updateProfile: vi.fn(),
      deleteProfile: vi.fn(),
      ensureDefaultProfile: vi.fn(),
      exportProfile: vi.fn(),
      importProfile: vi.fn(),
    })
    vi.spyOn(activeProfileContext, 'useSetActiveProfile').mockReturnValue(vi.fn())

    render(<ProfileSettings />)

    expect(screen.getByRole('button', { name: 'わたし を削除' })).toBeDisabled()
  })
})
