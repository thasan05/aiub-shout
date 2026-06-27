'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Smile, X } from 'lucide-react'
import { useShoutboxStore } from '@/store/shoutboxStore'
import { toast } from 'sonner'
import Link from 'next/link'

const MAX_CHARS = 200
const QUICK_EMOJIS = ['😂', '🔥', '💀', '❤️', '👍', '😭', '🙏', '💯', '😮', '🤔', '👀', '✨']

function useDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

interface Props {
  parentId?: string
  compact?: boolean
  onSent?: () => void
  onCancel?: () => void
}

export default function MessageComposer({ parentId, compact = false, onSent, onCancel }: Props) {
  const { currentUser, addMessage, addReply, replaceTempMessage } = useShoutboxStore()
  const [text, setText] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sendingRef = useRef(false)

  // Auto-focus composer on any printable keypress when nothing else is focused
  useEffect(() => {
    if (compact || parentId) return
    function onGlobalKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isEditable || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length !== 1) return
      textareaRef.current?.focus()
      setText(t => t + e.key)
    }
    window.addEventListener('keydown', onGlobalKey)
    return () => window.removeEventListener('keydown', onGlobalKey)
  }, [compact, parentId])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

  const broadcastTyping = useDebounce(() => {
    window.dispatchEvent(new CustomEvent('shoutbox:typing'))
  }, 300)

  async function send() {
    const content = text.trim()
    if (!content || !currentUser || sendingRef.current) return
    sendingRef.current = true

    const tempId = `temp-${Date.now()}`
    const optimistic = {
      id: tempId,
      temp_id: tempId,
      user_id: currentUser.id,
      content,
      parent_id: parentId ?? null,
      created_at: new Date().toISOString(),
      is_deleted: false,
      nickname: currentUser.nickname,
      nickname_color: currentUser.nickname_color,
      reply_count: 0,
      reactions: [],
      is_pending: true,
    }

    if (parentId) { addReply(parentId, optimistic) }
    else { addMessage(optimistic) }
    setText('')
    textareaRef.current?.focus()

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, parent_id: parentId ?? null }),
    })

    if (res.ok) {
      const { message } = await res.json()
      replaceTempMessage(tempId, message)
      onSent?.()
    } else {
      const { error } = await res.json()
      toast.error(error || 'Failed to send')
      if (!parentId) useShoutboxStore.getState().removeMessage(tempId)
      setText(content)
    }
    sendingRef.current = false
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const remaining = MAX_CHARS - text.length
  const isOverLimit = remaining < 0
  const isNearLimit = remaining <= 20
  const canSend = text.trim().length > 0 && !isOverLimit

  if (!currentUser) {
    if (compact) return null
    return (
      <div className="flex items-center justify-center gap-1.5 py-3 text-sm rounded-2xl"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
        <Link href="/auth/login"
          className="font-medium hover:underline"
          style={{ color: 'var(--primary)' }}>
          Sign in
        </Link>
        <span style={{ color: 'var(--muted-foreground)' }}>to post a message</span>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl overflow-visible transition-[border-color]"
      style={{
        background: 'var(--surface-1)',
        border: `1px solid ${focused ? 'var(--accent-glow)' : 'var(--border)'}`,
      }}
    >
      <div className="flex items-end gap-2 px-3 pt-3 pb-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mb-0.5"
          style={{
            background: `${currentUser.nickname_color}1A`,
            color: currentUser.nickname_color,
          }}>
          {currentUser.nickname.charAt(0)}
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); broadcastTyping() }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={parentId ? 'Write a reply…' : 'What\'s on your mind?'}
          rows={1}
          maxLength={MAX_CHARS + 10}
          className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
          style={{
            color: 'var(--foreground)',
            caretColor: 'var(--primary)',
          }}
        />
      </div>

      <div className="flex items-center gap-1.5 px-3 pb-2.5">
        {/* Emoji picker */}
        <div className="relative">
          <button
            onClick={() => setEmojiOpen(o => !o)}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: emojiOpen ? 'var(--primary)' : 'var(--muted-foreground)' }}
          >
            <Smile className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {emojiOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute bottom-full mb-2 left-0 rounded-2xl p-2 z-30"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 12px 32px oklch(0 0 0 / 0.2)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '2px',
                  width: 180,
                }}
              >
                {QUICK_EMOJIS.map(e => (
                  <motion.button
                    key={e}
                    whileHover={{ scale: 1.25, y: -2 }}
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    onClick={() => { setText(t => t + e); setEmojiOpen(false); textareaRef.current?.focus() }}
                    className="p-1.5 rounded-lg text-base transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {e}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {compact && onCancel && (
          <button
            onClick={onCancel}
            className="p-1 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Char counter */}
        {text.length > 0 && (
          <motion.span
            key={Math.floor(remaining / 10)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-xs ml-auto tabular-nums"
            style={{
              color: isOverLimit ? 'var(--destructive)' : isNearLimit ? '#F59E0B' : 'var(--muted-foreground)',
            }}
          >
            {remaining}
          </motion.span>
        )}

        {!text.length && !compact && (
          <span className="text-xs ml-auto" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>
            ↵ to send
          </span>
        )}

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={send}
          disabled={!canSend}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
          style={{
            background: canSend ? 'var(--primary)' : 'var(--muted)',
            color: canSend ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
          }}
        >
          <Send className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </div>
  )
}
