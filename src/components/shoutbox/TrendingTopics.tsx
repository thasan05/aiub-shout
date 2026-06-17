'use client'

import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { useShoutboxStore } from '@/store/shoutboxStore'

export default function TrendingTopics() {
  const { trending, setSearchQuery } = useShoutboxStore()

  if (trending.length === 0) return null

  return (
    <div className="rounded-2xl p-4"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
      }}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
        <span className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)' }}>
          Trending
        </span>
      </div>

      <div className="space-y-1">
        {trending.map((topic, i) => (
          <motion.button
            key={topic.keyword}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 400, damping: 30 }}
            onClick={() => setSearchQuery(topic.keyword)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5 group text-left"
          >
            <div className="flex items-center gap-2">
              <span>🔥</span>
              <span className="font-medium capitalize" style={{ color: 'var(--foreground)' }}>
                {topic.keyword}
              </span>
            </div>
            <span className="tabular-nums" style={{ color: 'var(--muted-foreground)' }}>
              {topic.count}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
