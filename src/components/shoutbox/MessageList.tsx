'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useShoutboxStore } from '@/store/shoutboxStore'
import MessageItem from './MessageItem'
import MessageSkeletons from './MessageSkeleton'
import NewMessagesBanner from './NewMessagesBanner'
import ScrollToBottomButton from './ScrollToBottomButton'

const BOTTOM_THRESHOLD = 120
const PULL_THRESHOLD = 60

export default function MessageList() {
  const { messages, isLoading, hasMore, searchQuery, prependMessages, setLoading, setHasMore } = useShoutboxStore()
  const listRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)
  const isFirstLoadRef = useRef(true)
  const loadingMoreRef = useRef(false)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [unread, setUnread] = useState(0)
  const [showSkeleton, setShowSkeleton] = useState(true)

  // Pull-to-refresh
  const touchStartYRef = useRef(0)
  const [pullY, setPullY] = useState(0)
  const [pulling, setPulling] = useState(false)

  const filtered = useMemo(() => {
    const display = [...messages].reverse()
    if (!searchQuery) return display
    const q = searchQuery.toLowerCase()
    return display.filter(m =>
      m.content.toLowerCase().includes(q) ||
      m.nickname.toLowerCase().includes(q)
    )
  }, [messages, searchQuery])

  // Hide skeleton once messages arrive or loading finishes
  useEffect(() => {
    if (messages.length > 0 || !isLoading) {
      const t = setTimeout(() => setShowSkeleton(false), 150)
      return () => clearTimeout(t)
    }
  }, [messages.length, isLoading])

  const updateNearBottom = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    setIsNearBottom(dist < BOTTOM_THRESHOLD)
  }, [])

  // Handle new messages
  useEffect(() => {
    const newCount = messages.length - prevLengthRef.current
    const isNew = newCount > 0
    prevLengthRef.current = messages.length
    if (!isNew) return

    if (isFirstLoadRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      isFirstLoadRef.current = false
      return
    }

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setUnread(0)
    } else {
      const realNew = messages.slice(0, newCount).filter(m => !m.is_pending).length
      if (realNew > 0) setUnread(u => u + realNew)
    }
  }, [messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    updateNearBottom()
    const el = listRef.current
    if (!el || isLoading || !hasMore || loadingMoreRef.current) return
    if (el.scrollTop < 80) loadMore()
  }, [isLoading, hasMore, updateNearBottom]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pull-to-refresh touch handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = listRef.current
    if (!el || el.scrollTop > 0) return
    touchStartYRef.current = e.touches[0].clientY
    setPulling(true)
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling) return
    const el = listRef.current
    if (!el || el.scrollTop > 0) { setPulling(false); return }
    const dy = e.touches[0].clientY - touchStartYRef.current
    if (dy > 0) setPullY(Math.min(dy * 0.4, PULL_THRESHOLD + 16))
  }, [pulling])

  const onTouchEnd = useCallback(() => {
    if (pulling && pullY >= PULL_THRESHOLD && hasMore && !isLoading && !loadingMoreRef.current) {
      loadMore()
    }
    setPulling(false)
    setPullY(0)
  }, [pulling, pullY, hasMore, isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  function scrollToBottom(smooth = true) {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
    setUnread(0)
  }

  async function loadMore() {
    const oldest = filtered[0]
    if (!oldest || loadingMoreRef.current) return
    loadingMoreRef.current = true

    const savedScrollHeight = listRef.current?.scrollHeight ?? 0
    const savedScrollTop = listRef.current?.scrollTop ?? 0

    setLoading(true)
    const params = new URLSearchParams({ before: oldest.created_at, limit: '30' })
    if (searchQuery) params.set('search', searchQuery)

    const res = await fetch(`/api/messages?${params}`)
    if (res.ok) {
      const data = await res.json()
      prependMessages(data.messages)
      setHasMore(data.hasMore)
      // Restore scroll position after prepend
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = savedScrollTop + (listRef.current.scrollHeight - savedScrollHeight)
        }
        loadingMoreRef.current = false
      })
    } else {
      loadingMoreRef.current = false
    }
    setLoading(false)
  }

  const showSkeletonScreen = showSkeleton && messages.length === 0

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {pulling && pullY > 8 && hasMore && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-10 pointer-events-none flex items-end justify-center"
            style={{ height: pullY }}
          >
            <p className="text-xs pb-1" style={{ color: 'var(--muted-foreground)' }}>
              {pullY >= PULL_THRESHOLD ? '↑ Release to load' : '↓ Pull to load more'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <NewMessagesBanner count={unread} onClick={() => scrollToBottom()} />

      <div
        ref={listRef}
        onScroll={handleScroll}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="h-full overflow-y-auto overflow-x-hidden"
        style={{ scrollbarGutter: 'stable' }}
      >
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        )}

        {!isLoading && !hasMore && messages.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-4 text-xs"
            style={{ color: 'var(--muted-foreground)' }}
          >
            ✦ Beginning of shoutbox ✦
          </motion.p>
        )}

        {showSkeletonScreen && <MessageSkeletons count={7} />}

        {!showSkeletonScreen && (
          <div className="py-2">
            <AnimatePresence initial={false}>
              {filtered.length === 0 && !isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <p className="text-3xl mb-3">{searchQuery ? '🔍' : '💬'}</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
                    {searchQuery ? `No results for "${searchQuery}"` : 'No messages yet'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
                    {searchQuery ? 'Try a different search term' : 'Be the first to say something!'}
                  </p>
                </motion.div>
              ) : (
                filtered.map(message => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    searchQuery={searchQuery}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        )}

        <div ref={bottomRef} className="h-2" />
      </div>

      <ScrollToBottomButton
        visible={!isNearBottom && unread === 0}
        onClick={() => scrollToBottom()}
      />
    </div>
  )
}
