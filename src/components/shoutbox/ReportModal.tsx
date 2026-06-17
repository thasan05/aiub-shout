'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flag } from 'lucide-react'
import { toast } from 'sonner'
import { type ReportReason } from '@/types'

const REASONS: { value: ReportReason; label: string; icon: string }[] = [
  { value: 'spam',          label: 'Spam',                icon: '🚫' },
  { value: 'harassment',   label: 'Harassment',          icon: '😤' },
  { value: 'hate_speech',  label: 'Hate speech',         icon: '🤬' },
  { value: 'personal_info', label: 'Personal information', icon: '🔒' },
  { value: 'other',        label: 'Other',               icon: '⚠️' },
]

interface Props {
  messageId: string
  open: boolean
  onClose: () => void
}

export default function ReportModal({ messageId, open, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason | ''>('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!reason) return
    setLoading(true)
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId, reason, details }),
    })
    setLoading(false)

    if (res.ok) {
      toast.success('Report submitted')
      onClose(); setReason(''); setDetails('')
    } else if (res.status === 409) {
      toast.error('Already reported'); onClose()
    } else {
      toast.error('Failed to report')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-2xl p-5"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 64px oklch(0 0 0 / 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4" style={{ color: 'var(--destructive)' }} />
                <h2 className="text-sm font-semibold">Report message</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 mb-4">
              {REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                  style={{
                    background: reason === r.value ? 'var(--accent-dim)' : 'var(--surface-1)',
                    border: `1px solid ${reason === r.value ? 'var(--accent-glow)' : 'var(--border)'}`,
                    color: reason === r.value ? 'var(--primary)' : 'var(--foreground)',
                  }}
                >
                  <span>{r.icon}</span>
                  <span>{r.label}</span>
                  {reason === r.value && (
                    <span className="ml-auto text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>

            {reason === 'other' && (
              <textarea
                placeholder="Additional details (optional)"
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={2}
                className="w-full text-sm rounded-xl px-3 py-2 resize-none outline-none mb-4"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                }}
              />
            )}

            <button
              onClick={submit}
              disabled={!reason || loading}
              className="w-full h-9 text-sm font-medium rounded-xl transition-all disabled:opacity-40"
              style={{
                background: reason ? 'var(--destructive)' : 'var(--muted)',
                color: reason ? 'white' : 'var(--muted-foreground)',
              }}
            >
              {loading ? 'Submitting…' : 'Submit report'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
