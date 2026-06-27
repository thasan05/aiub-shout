'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNowStrict, format, isToday, isYesterday } from 'date-fns'

export function formatRelative(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const diffMs = Date.now() - d.getTime()
    const diffSec = Math.floor(diffMs / 1000)

    if (diffSec < 60) return 'just now'
    if (diffSec < 3600) {
      const m = Math.floor(diffSec / 60)
      return `${m}m ago`
    }
    if (isToday(d)) return format(d, 'h:mm a')
    if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`
    return format(d, 'MMM d, h:mm a')
  } catch {
    return ''
  }
}

export function useRelativeTime(dateStr: string): string {
  const [label, setLabel] = useState(() => formatRelative(dateStr))

  useEffect(() => {
    setLabel(formatRelative(dateStr))
    const interval = setInterval(() => setLabel(formatRelative(dateStr)), 30_000)
    return () => clearInterval(interval)
  }, [dateStr])

  return label
}
