'use client'

import { Component, type ReactNode } from 'react'

interface State { hasError: boolean }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-4 text-center"
          style={{ background: 'var(--background)' }}>
          <p className="text-4xl">⚠️</p>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Something went wrong
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
