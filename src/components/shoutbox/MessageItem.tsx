'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, MoreHorizontal, Trash2, Flag, Copy, ShieldCheck } from 'lucide-react'
import { useShoutboxStore } from '@/store/shoutboxStore'
import ReportModal from './ReportModal'
import ReplyThread from './ReplyThread'
import { type Message, type ReactionEmoji } from '@/types'
import { toast } from 'sonner'
import { useRelativeTime } from '@/hooks/useRelativeTime'

const REACTIONS: { emoji: ReactionEmoji; label: string }[] = [
  { emoji: '👍', label: 'Helpful' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😂', label: 'Funny' },
  { emoji: '💀', label: 'Dead' },
  { emoji: '❤️', label: 'Relatable' },
]

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  const lower = query.toLowerCase()
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lower ? (
          <mark key={i} className="search-mark">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function MessageContent({ text, query }: { text: string; query: string }) {
  const segments: { type: 'text' | 'url'; value: string }[] = []
  let last = 0
  for (const m of text.matchAll(new RegExp(URL_REGEX.source, 'g'))) {
    if (m.index! > last) segments.push({ type: 'text', value: text.slice(last, m.index) })
    segments.push({ type: 'url', value: m[0] })
    last = m.index! + m[0].length
  }
  if (last < text.length) segments.push({ type: 'text', value: text.slice(last) })

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'url' ? (
          <a key={i} href={seg.value} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}>
            {seg.value}
          </a>
        ) : (
          <HighlightedText key={i} text={seg.value} query={query} />
        )
      )}
    </>
  )
}

function ReactionTooltip({ userIds }: { userIds: string[] }) {
  const { usersCache } = useShoutboxStore()
  const names = userIds
    .map(id => usersCache[id]?.nickname)
    .filter(Boolean)
    .slice(0, 5)
  if (names.length === 0) return null
  const extra = userIds.length - names.length
  return (
    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
      {names.join(', ')}{extra > 0 ? ` +${extra}` : ''}
    </span>
  )
}

interface Props {
  message: Message
  isReply?: boolean
  searchQuery?: string
  skipEntrance?: boolean
}

export default function MessageItem({ message, isReply = false, searchQuery = '', skipEntrance = false }: Props) {
  const { currentUser, toggleReactionOptimistic, removeMessage } = useShoutboxStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [repliesOpen, setRepliesOpen] = useState(false)
  const [poppingEmoji, setPoppingEmoji] = useState<string | null>(null)
  const [tooltipEmoji, setTooltipEmoji] = useState<string | null>(null)

  const isOwn = currentUser?.id === message.user_id
  const isPending = message.is_pending
  const activeReactions = message.reactions.filter(r => r.count > 0)
  const relativeTime = useRelativeTime(message.created_at)

  async function handleReaction(emoji: ReactionEmoji) {
    if (!currentUser) { toast.error('Sign in to react'); return }
    setPoppingEmoji(emoji)
    setTimeout(() => setPoppingEmoji(null), 400)
    toggleReactionOptimistic(message.id, emoji, currentUser.id)
    const res = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: message.id, emoji }),
    })
    if (!res.ok) {
      toggleReactionOptimistic(message.id, emoji, currentUser.id)
      toast.error('Failed to react')
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this message?')) return
    setMenuOpen(false)
    const res = await fetch(`/api/messages/${message.id}`, { method: 'DELETE' })
    if (res.ok) {
      removeMessage(message.id)
      toast.success('Deleted')
    } else {
      toast.error('Failed to delete')
    }
  }

  async function handleCopy() {
    setMenuOpen(false)
    await navigator.clipboard.writeText(message.content)
    toast.success('Copied')
  }

  return (
    <>
      <motion.div
        initial={skipEntrance ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: isPending ? 0.5 : 1, y: 0 }}
        transition={{ duration: 0.15, type: 'spring', stiffness: 500, damping: 35 }}
        className={`group relative message-card ${isReply ? 'pl-3 border-l-2 ml-[4.8rem]' : ''}`}
        style={isReply ? { borderColor: 'var(--accent-dim)' } : undefined}
      >
        {/* Main line */}
        <div className="flex items-baseline gap-0 px-4 py-[3px] rounded-md hover:bg-black/[0.035] dark:hover:bg-white/[0.03] transition-colors">
          {/* Timestamp */}
          <span
            title={new Date(message.created_at).toLocaleString()}
            className="text-[11px] tabular-nums shrink-0 select-none mr-3 mt-px"
            style={{ color: 'var(--muted-foreground)', opacity: 0.45, minWidth: '4rem' }}
          >
            {isPending ? '···' : relativeTime}
          </span>

          {/* Username + content inline */}
          <span className="text-sm leading-relaxed break-words flex-1 min-w-0">
            <span className="font-semibold" style={{ color: message.nickname_color }}>
              {message.nickname}
            </span>
            {isOwn && (
              <span className="ml-1 text-[9px] font-bold px-1 py-px rounded uppercase tracking-wide"
                style={{ background: 'var(--accent-dim)', color: 'var(--primary)', verticalAlign: 'middle' }}>
                You
              </span>
            )}
            <span style={{ color: 'var(--muted-foreground)', opacity: 0.55 }}>: </span>
            <span className="message-content" style={{ color: 'var(--foreground)' }}>
              <MessageContent text={message.content} query={searchQuery} />
            </span>
          </span>

          {/* Hover menu */}
          {!isPending && (
            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 self-center">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-1 rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute right-0 top-full mt-1 rounded-xl py-1 z-20 min-w-36"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 8px 24px oklch(0 0 0 / 0.2)',
                    }}
                  >
                    <button
                      onClick={handleCopy}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-left"
                      style={{ color: 'var(--foreground)' }}
                    >
                      <Copy className="w-3 h-3" />
                      Copy text
                    </button>
                    {currentUser && !isOwn && (
                      <button
                        onClick={() => { setMenuOpen(false); setReportOpen(true) }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-left"
                        style={{ color: 'var(--destructive)' }}
                      >
                        <Flag className="w-3 h-3" />
                        Report
                      </button>
                    )}
                    {isOwn && (
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-left"
                        style={{ color: 'var(--destructive)' }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Reactions + action row */}
        {!isPending && (
          <div
            className={`flex items-center gap-1 pl-[5.2rem] pr-4 pb-0.5 flex-wrap
              ${activeReactions.length === 0 ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}
          >
            {activeReactions.map(reaction => (
              <div key={reaction.emoji} className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleReaction(reaction.emoji)}
                  onMouseEnter={() => setTooltipEmoji(reaction.emoji)}
                  onMouseLeave={() => setTooltipEmoji(null)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all
                    ${poppingEmoji === reaction.emoji ? 'animate-reaction-pop' : ''}`}
                  style={{
                    background: reaction.user_reacted ? 'var(--accent-dim)' : 'var(--surface-2)',
                    border: `1px solid ${reaction.user_reacted ? 'var(--accent-glow)' : 'var(--border)'}`,
                    color: reaction.user_reacted ? 'var(--primary)' : 'var(--muted-foreground)',
                  }}
                >
                  <span>{reaction.emoji}</span>
                  <span className="tabular-nums">{reaction.count}</span>
                </motion.button>

                <AnimatePresence>
                  {tooltipEmoji === reaction.emoji && reaction.user_ids && reaction.user_ids.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full mb-1.5 left-0 px-2 py-1 rounded-lg text-xs whitespace-nowrap z-30 pointer-events-none"
                      style={{
                        background: 'var(--surface-3)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 12px oklch(0 0 0 / 0.2)',
                      }}
                    >
                      <ReactionTooltip userIds={reaction.user_ids} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            <ReactionPicker onReact={handleReaction} />

            {!isReply && (
              <button
                onClick={() => setRepliesOpen(o => !o)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all"
                style={{
                  color: repliesOpen ? 'var(--primary)' : 'var(--muted-foreground)',
                  background: repliesOpen ? 'var(--accent-dim)' : 'transparent',
                  opacity: repliesOpen ? 1 : 0.7,
                }}
              >
                <MessageSquare className="w-3 h-3" />
                {message.reply_count > 0
                  ? `${message.reply_count} ${message.reply_count === 1 ? 'reply' : 'replies'}`
                  : 'Reply'
                }
              </button>
            )}
          </div>
        )}
      </motion.div>

      {!isReply && repliesOpen && (
        <ReplyThread
          parentId={message.id}
          replies={message.replies}
          repliesLoaded={message.replies_loaded}
        />
      )}

      <ReportModal
        messageId={message.id}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  )
}

function ReactionPicker({ onReact }: { onReact: (e: ReactionEmoji) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center w-6 h-5 rounded-full text-xs transition-all hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: 'var(--muted-foreground)' }}
        aria-label="Add reaction"
      >
        +
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 6 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute bottom-full mb-2 left-0 flex gap-0.5 px-2 py-1.5 rounded-xl z-20"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 24px oklch(0 0 0 / 0.2)',
            }}
          >
            {REACTIONS.map(r => (
              <motion.button
                key={r.emoji}
                whileHover={{ scale: 1.25, y: -2 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                onClick={() => { onReact(r.emoji); setOpen(false) }}
                title={r.label}
                className="text-lg p-0.5"
              >
                {r.emoji}
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  )
}
