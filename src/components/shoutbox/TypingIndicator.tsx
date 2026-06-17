'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useShoutboxStore } from '@/store/shoutboxStore'

export default function TypingIndicator() {
  const { typingUsers, currentUser } = useShoutboxStore()
  const others = typingUsers.filter(u => u.userId !== currentUser?.id)

  return (
    <AnimatePresence>
      {others.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="px-4 py-1.5 flex items-center gap-2"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="typing-dot w-1.5 h-1.5 rounded-full block"
                style={{ background: 'var(--primary)', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {others.length === 1 ? (
              <>
                <span style={{ color: others[0].nickname_color }}>{others[0].nickname}</span>
                {' '}is typing
              </>
            ) : others.length === 2 ? (
              <>
                <span style={{ color: others[0].nickname_color }}>{others[0].nickname}</span>
                {' '}and{' '}
                <span style={{ color: others[1].nickname_color }}>{others[1].nickname}</span>
                {' '}are typing
              </>
            ) : (
              `${others.length} people are typing`
            )}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
