'use client'

import { useCallback } from 'react'

export function useBrowserNotifications() {
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const result = await Notification.requestPermission()
    return result === 'granted'
  }, [])

  const notify = useCallback((title: string, body: string) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (document.hasFocus()) return
    new Notification(title, {
      body,
      icon: '/logo2.png',
      badge: '/logo2.png',
      tag: 'aiubshout-message',
      renotify: true,
    })
  }, [])

  return { requestPermission, notify, permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied' }
}
