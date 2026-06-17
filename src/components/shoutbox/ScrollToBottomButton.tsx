'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

interface Props {
  visible: boolean
  onClick: () => void
}

export default function ScrollToBottomButton({ visible, onClick }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClick}
          aria-label="Scroll to bottom"
          className="absolute bottom-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--muted-foreground)',
            boxShadow: '0 4px 16px oklch(0 0 0 / 0.3)',
          }}
        >
          <ChevronDown className="w-4 h-4" />
        </motion.button>
      )}
    </AnimatePresence>
  )
}
