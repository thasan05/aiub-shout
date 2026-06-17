'use client'

import { useEffect, useRef } from 'react'

interface Handlers {
  onOpenSearch?: () => void
  onFocusComposer?: () => void
  onEscape?: () => void
}

export function useKeyboardShortcuts(handlers: Handlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isEditable =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if (e.key === 'Escape') {
        handlersRef.current.onEscape?.()
        return
      }

      if (isEditable) return

      if (e.key === '/') {
        e.preventDefault()
        handlersRef.current.onOpenSearch?.()
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        handlersRef.current.onFocusComposer?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
