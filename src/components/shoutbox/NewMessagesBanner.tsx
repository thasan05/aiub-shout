'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown } from 'lucide-react'

interface Props {
  count: number
  onClick: () => void
}

export default function NewMessagesBanner({ count, onClick }: Props) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          onClick={onClick}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold shadow-lg"
          style={{
            background: 'oklch(0.655 0.225 264)',
            color: 'white',
            boxShadow: '0 4px 20px oklch(0.655 0.225 264 / 0.4)',
          }}
        >
          <ArrowDown className="w-3.5 h-3.5" />
          {count} new {count === 1 ? 'message' : 'messages'}
        </motion.button>
      )}
    </AnimatePresence>
  )
}
