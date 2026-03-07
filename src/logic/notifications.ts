import type { Grant } from '../db/types'

const DEFAULT_DAYS_THRESHOLD = 30

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function checkExpiringGrants(grants: Grant[], daysThreshold = DEFAULT_DAYS_THRESHOLD): Grant[] {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const threshold = new Date(now)
  threshold.setDate(threshold.getDate() + daysThreshold)
  const thresholdStr = `${threshold.getFullYear()}-${String(threshold.getMonth() + 1).padStart(2, '0')}-${String(threshold.getDate()).padStart(2, '0')}`

  return grants.filter((grant) => {
    return grant.expiryDate >= todayStr && grant.expiryDate <= thresholdStr
  })
}

export function showExpiryNotification(grant: Grant): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const expiryDate = new Date(grant.expiryDate)
  const formatted = `${expiryDate.getMonth() + 1}/${expiryDate.getDate()}`

  new Notification('有休の期限が近づいています', {
    body: `${formatted} に有休が失効します`,
    icon: '/icon-192.svg',
    tag: `expiry-${grant.id}`,
  })
}
