'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useShoutboxStore } from '@/store/shoutboxStore'
import ThemeToggle from './ThemeToggle'
import { LogOut, User, Search, X, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

export default function Header() {
  const { currentUser, onlineCount, searchQuery, setSearchQuery } = useShoutboxStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [displayedCount, setDisplayedCount] = useState(onlineCount)
  const searchRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Animate online count changes
  useEffect(() => {
    if (displayedCount === onlineCount) return
    const timer = setTimeout(() => setDisplayedCount(onlineCount), 100)
    return () => clearTimeout(timer)
  }, [onlineCount, displayedCount])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
  }, [setSearchQuery])

  // Keyboard shortcut events from ShoutboxClient
  useEffect(() => {
    function onOpenSearch() { setSearchOpen(true) }
    function onEscape() { if (searchOpen) closeSearch() }
    window.addEventListener('shoutbox:open-search', onOpenSearch)
    window.addEventListener('shoutbox:escape', onEscape)
    return () => {
      window.removeEventListener('shoutbox:open-search', onOpenSearch)
      window.removeEventListener('shoutbox:escape', onEscape)
    }
  }, [searchOpen, closeSearch])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.refresh()
    setUserMenuOpen(false)
  }

  return (
    <header className="glass sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">

        {/* Logo */}
        {!searchOpen && (
          <Link href="/" className="flex items-center mr-auto shrink-0 group transition-transform group-hover:scale-105">
            {/* Light mode */}
            <div className="bg-white rounded-xl px-3 py-1.5 shadow-sm dark:hidden">
              <Image src="/logo.png" alt="AIUB Shout" width={96} height={28} className="object-contain block" priority />
            </div>
            {/* Dark mode */}
            <div className="hidden dark:block">
              <Image src="/logo2.png" alt="AIUB Shout" width={96} height={28} className="object-contain block" priority />
            </div>
          </Link>
        )}

        {/* Search bar (expanded) */}
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '100%' }}
            className="flex items-center gap-2 flex-1"
          >
            <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
            <input
              ref={searchRef}
              type="text"
              autoComplete="off"
              placeholder="Search messages…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--foreground)' }}
              onKeyDown={e => e.key === 'Escape' && closeSearch()}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-md transition-colors"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={closeSearch}
              className="text-xs px-2 py-1 rounded-lg transition-colors"
              style={{ color: 'var(--muted-foreground)', background: 'var(--muted)' }}
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* Right controls */}
        {!searchOpen && (
          <div className="flex items-center gap-1 ml-auto">

            {/* Online count */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: 'var(--online-green-dim)',
                color: 'var(--online-green)',
              }}>
              <span className="relative flex h-2 w-2">
                <span className="online-ping absolute inline-flex h-full w-full rounded-full"
                  style={{ background: 'var(--online-green)' }} />
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: 'var(--online-green)' }} />
              </span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={displayedCount}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                >
                  {displayedCount === 1 ? 'just you' : `${displayedCount} online`}
                </motion.span>
              </AnimatePresence>
            </div>

            {/* Search toggle */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: 'var(--muted-foreground)' }}
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Auth */}
            {currentUser ? (
              <div className="relative ml-1">
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: `${currentUser.nickname_color}22`,
                      color: currentUser.nickname_color,
                      border: `1px solid ${currentUser.nickname_color}40`,
                    }}
                  >
                    {currentUser.nickname.charAt(0)}
                  </div>
                  <span className="hidden sm:inline max-w-28 truncate"
                    style={{ color: currentUser.nickname_color }}>
                    {currentUser.nickname}
                  </span>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className="absolute right-0 top-full mt-1 w-52 rounded-xl py-1 z-20"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 8px 32px oklch(0 0 0 / 0.25)',
                      }}
                    >
                      <div className="px-3 py-2.5 border-b"
                        style={{ borderColor: 'var(--border)' }}>
                        <p className="text-xs font-semibold" style={{ color: currentUser.nickname_color }}>
                          {currentUser.nickname}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted-foreground)' }}>
                          {currentUser.email}
                        </p>
                      </div>
                      {currentUser?.is_admin && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ color: 'var(--primary)' }}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Moderation
                        </Link>
                      )}
                      <button
                        onClick={signOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-left"
                        style={{ color: 'var(--destructive)' }}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign out
                      </button>
                    </motion.div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="ml-1 inline-flex items-center h-7 text-xs px-3 font-medium rounded-lg transition-opacity hover:opacity-90 gap-1.5"
                style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
              >
                <User className="w-3.5 h-3.5" />
                Sign in
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
