import { describe, expect, it, vi, beforeEach } from 'vitest'
import { requestNotificationPermission, showExpiryNotification, checkExpiringGrants } from '../notifications'
import type { Grant } from '../../db/types'

const mockNotificationConstructor = vi.fn()

function setupNotificationMock(permission: NotificationPermission) {
  Object.defineProperty(globalThis, 'Notification', {
    value: Object.assign(mockNotificationConstructor, {
      permission,
      requestPermission: vi.fn(),
    }),
    writable: true,
    configurable: true,
  })
}

beforeEach(() => {
  mockNotificationConstructor.mockClear()
})

describe('requestNotificationPermission', () => {
  it('returns false when Notification API is not available', async () => {
    const saved = globalThis.Notification
    // @ts-expect-error - removing Notification for test
    delete globalThis.Notification
    expect(await requestNotificationPermission()).toBe(false)
    globalThis.Notification = saved
  })

  it('returns true when permission is already granted', async () => {
    setupNotificationMock('granted')
    expect(await requestNotificationPermission()).toBe(true)
  })

  it('returns false when permission is denied', async () => {
    setupNotificationMock('denied')
    expect(await requestNotificationPermission()).toBe(false)
  })

  it('requests permission when default and returns result', async () => {
    setupNotificationMock('default')
    ;(Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue('granted')
    expect(await requestNotificationPermission()).toBe(true)
    expect(Notification.requestPermission).toHaveBeenCalled()
  })
})

describe('checkExpiringGrants', () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function daysFromNow(days: number): string {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const makeGrant = (id: string, expiryDays: number): Grant => ({
    id,
    fiscalYear: 2025,
    grantDate: '2025-04-01',
    expiryDate: daysFromNow(expiryDays),
    totalDays: 20,
    source: 'new',
  })

  it('returns grants expiring within threshold', () => {
    const grants = [
      makeGrant('soon', 10),
      makeGrant('later', 60),
      makeGrant('past', -5),
    ]

    const result = checkExpiringGrants(grants, 30)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('soon')
  })

  it('returns empty array when no grants are expiring', () => {
    const grants = [makeGrant('far', 90)]
    expect(checkExpiringGrants(grants)).toEqual([])
  })

  it('includes grants expiring today', () => {
    const grants = [makeGrant('today', 0)]
    const result = checkExpiringGrants(grants, 30)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('today')
  })

  it('includes grants expiring exactly at threshold', () => {
    const grants = [makeGrant('edge', 30)]
    const result = checkExpiringGrants(grants, 30)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('edge')
  })

  it('uses default threshold of 30 days', () => {
    const grants = [makeGrant('within', 25), makeGrant('outside', 35)]
    const result = checkExpiringGrants(grants)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('within')
  })
})

describe('showExpiryNotification', () => {
  it('creates notification with correct message', () => {
    setupNotificationMock('granted')
    const grant: Grant = {
      id: 'g1',
      fiscalYear: 2025,
      grantDate: '2025-04-01',
      expiryDate: '2027-03-31',
      totalDays: 20,
      source: 'new',
    }

    showExpiryNotification(grant)

    expect(mockNotificationConstructor).toHaveBeenCalledWith(
      '有休の期限が近づいています',
      expect.objectContaining({
        body: '3/31 に有休が失効します',
        tag: 'expiry-g1',
      }),
    )
  })

  it('does nothing when permission is not granted', () => {
    setupNotificationMock('denied')
    const grant: Grant = {
      id: 'g1',
      fiscalYear: 2025,
      grantDate: '2025-04-01',
      expiryDate: '2027-03-31',
      totalDays: 20,
      source: 'new',
    }

    showExpiryNotification(grant)
    expect(mockNotificationConstructor).not.toHaveBeenCalled()
  })
})
