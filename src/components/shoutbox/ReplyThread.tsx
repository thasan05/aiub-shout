'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useShoutboxStore } from '@/store/shoutboxStore'
import MessageItem from './MessageItem'
import MessageComposer from './MessageComposer'
import { type Message } from '@/types'

interface Props {
  parentId: string
  replies?: Message[]
  repliesLoaded?: boolean
}

export default function ReplyThread({ parentId, replies, repliesLoaded }: Props) {
  const { setReplies, currentUser } = useShoutboxStore()
  const [loading, setLoading] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)

  useEffect(() => {
    if (repliesLoaded) return
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/messages/${parentId}/replies`)
      if (res.ok) {
        const data = await res.json()
        setReplies(parentId, data.replies)
      }
      setLoading(false)
    }
    load()
  }, [parentId, repliesLoaded, setReplies])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="pl-5 space-y-2 mt-1"
      >
        {loading ? (
          <div className="flex items-center gap-2 py-2 pl-2"
            style={{ color: 'var(--muted-foreground)' }}>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Loading replies…</span>
          </div>
        ) : (
          <>
            {(replies ?? []).map(reply => (
              <MessageItem key={reply.id} message={reply} isReply />
            ))}

            {currentUser ? (
              <>
                {!composerOpen && (
                  <button
                    onClick={() => setComposerOpen(true)}
                    className="text-xs px-3 py-1.5 rounded-xl transition-all"
                    style={{
                      color: 'var(--primary)',
                      background: 'var(--accent-dim)',
                    }}
                  >
                    + Write a reply
                  </button>
                )}
                {composerOpen && (
                  <MessageComposer
                    parentId={parentId}
                    compact
                    onSent={() => setComposerOpen(false)}
                    onCancel={() => setComposerOpen(false)}
                  />
                )}
              </>
            ) : (
              <p className="text-xs px-2" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
                Sign in to reply
              </p>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
