'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useShoutboxStore } from '@/store/shoutboxStore'
import ThemeToggle from './ThemeToggle'
import { LogOut, User, Search, X, ShieldAlert, Pencil, Check } from 'lucide-react'
import { toast } from 'sonner'

const COLOR_OPTIONS = [
  '#60A5FA','#94A3B8','#F87171','#FBBF24','#4ADE80',
  '#C084FC','#A78BFA','#FB7185','#38BDF8','#34D399',
  '#FCD34D','#FB923C','#7DD3FC','#E2E8F0','#93C5FD',
  '#86EFAC','#22D3EE','#FCA5A5','#BAE6FD','#DDD6FE',
]

export default function Header() {
  const { currentUser, onlineCount, searchQuery, setSearchQuery, setCurrentUser } = useShoutboxStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [displayedCount, setDisplayedCount] = useState(onlineCount)
  const [editingProfile, setEditingProfile] = useState(false)
  const [newNickname, setNewNickname] = useState('')
  const [newColor, setNewColor] = useState('')
  const [saving, setSaving] = useState(false)
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

  function startEdit() {
    setNewNickname(currentUser?.nickname ?? '')
    setNewColor(currentUser?.nickname_color ?? '#60A5FA')
    setEditingProfile(true)
  }

  async function saveProfile() {
    const trimmed = newNickname.trim()
    if (trimmed.length < 2 || trimmed.length > 20) {
      toast.error('Nickname must be 2–20 characters')
      return
    }
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: trimmed, nickname_color: newColor }),
    })
    setSaving(false)
    if (res.ok) {
      setCurrentUser({ ...currentUser!, nickname: trimmed, nickname_color: newColor })
      setEditingProfile(false)
      toast.success('Profile updated')
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to update')
    }
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

                      {/* Edit profile */}
                      {!editingProfile ? (
                        <button
                          onClick={startEdit}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-left"
                          style={{ color: 'var(--foreground)' }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit profile
                        </button>
                      ) : (
                        <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                          <p className="text-xs mb-1.5 font-medium" style={{ color: 'var(--muted-foreground)' }}>Nickname</p>
                          <input
                            type="text"
                            value={newNickname}
                            onChange={e => setNewNickname(e.target.value)}
                            maxLength={20}
                            className="w-full text-xs px-2 py-1.5 rounded-lg outline-none mb-2"
                            style={{
                              background: 'var(--surface-2)',
                              border: '1px solid var(--border)',
                              color: 'var(--foreground)',
                            }}
                            onKeyDown={e => e.key === 'Enter' && saveProfile()}
                            autoFocus
                          />
                          <p className="text-xs mb-1.5 font-medium" style={{ color: 'var(--muted-foreground)' }}>Color</p>
                          <div className="grid grid-cols-10 gap-1 mb-2">
                            {COLOR_OPTIONS.map(c => (
                              <button
                                key={c}
                                onClick={() => setNewColor(c)}
                                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                                style={{
                                  background: c,
                                  outline: newColor === c ? `2px solid ${c}` : 'none',
                                  outlineOffset: 2,
                                }}
                              />
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setEditingProfile(false)}
                              className="flex-1 text-xs py-1 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: 'var(--muted-foreground)' }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveProfile}
                              disabled={saving}
                              className="flex-1 text-xs py-1 rounded-lg flex items-center justify-center gap-1 transition-opacity disabled:opacity-50"
                              style={{ background: newColor, color: '#fff' }}
                            >
                              <Check className="w-3 h-3" />
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
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
