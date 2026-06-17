'use client'

import { motion } from 'framer-motion'

function Shimmer({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-lg overflow-hidden relative ${className}`}
      style={{ background: 'var(--skeleton-base)', ...style }}
    >
      <div className="skeleton-shimmer absolute inset-0" />
    </div>
  )
}

// Deterministic patterns — no Math.random() in render (causes SSR/CSR mismatch)
const PATTERNS = [
  { content: 75, hasSecond: true,  r1: true,  r2: false },
  { content: 55, hasSecond: false, r1: false, r2: false },
  { content: 85, hasSecond: true,  r1: true,  r2: true  },
  { content: 65, hasSecond: true,  r1: true,  r2: false },
  { content: 90, hasSecond: false, r1: false, r2: true  },
  { content: 50, hasSecond: true,  r1: true,  r2: false },
  { content: 70, hasSecond: false, r1: true,  r2: false },
  { content: 60, hasSecond: true,  r1: false, r2: true  },
]

function SingleSkeleton({ delay = 0, index = 0 }: { delay?: number; index?: number }) {
  const p = PATTERNS[index % PATTERNS.length]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-2xl p-4"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--skeleton-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Shimmer className="w-6 h-6 rounded-full flex-shrink-0" />
        <Shimmer className="h-3 rounded-full w-24" />
        <Shimmer className="h-2.5 rounded-full w-12 ml-auto" />
      </div>
      <div className="space-y-2">
        <Shimmer className="h-3.5 rounded-full" style={{ width: `${p.content}%` }} />
        {p.hasSecond && (
          <Shimmer className="h-3.5 rounded-full" style={{ width: `${p.content - 20}%` }} />
        )}
      </div>
      <div className="flex gap-1.5 mt-3">
        {p.r1 && <Shimmer className="h-5 w-12 rounded-full" />}
        {p.r2 && <Shimmer className="h-5 w-10 rounded-full" />}
      </div>
    </motion.div>
  )
}

export default function MessageSkeletons({ count = 8 }: { count?: number }) {
  return (
    <div className="p-3 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SingleSkeleton key={i} index={i} delay={i * 0.04} />
      ))}
    </div>
  )
}
