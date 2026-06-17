'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft, Ban,
  CheckCircle2, Trash2, Loader2, ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'

interface AdminReport {
  report_id: string
  report_reason: string
  report_details: string | null
  report_status: string
  report_created_at: string
  message_id: string
  message_content: string
  message_created_at: string
  reporter_nickname: string
  message_author_nickname: string
  message_author_id: string
}

type TabStatus = 'pending' | 'resolved' | 'dismissed'

const REASON_LABELS: Record<string, string> = {
  spam: '🚫 Spam',
  harassment: '😤 Harassment',
  hate_speech: '🤬 Hate speech',
  personal_info: '🔒 Personal info',
  other: '⚠️ Other',
}

export default function AdminClient({ adminNickname }: { adminNickname: string }) {
  const [tab, setTab] = useState<TabStatus>('pending')
  const [reports, setReports] = useState<AdminReport[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchReports = useCallback(async (status: TabStatus) => {
    setLoading(true)
    const res = await fetch(`/api/admin/reports?status=${status}`)
    if (res.ok) {
      const { reports: data } = await res.json()
      setReports(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchReports(tab)
  }, [tab, fetchReports])

  async function resolveReport(reportId: string) {
    setActionLoading(reportId + '-resolve')
    const res = await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId, action: 'resolve' }),
    })
    setActionLoading(null)
    if (res.ok) {
      toast.success('Report resolved')
      setReports(r => r.filter(x => x.report_id !== reportId))
    } else toast.error('Failed')
  }

  async function dismissReport(reportId: string) {
    setActionLoading(reportId + '-dismiss')
    const res = await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId, action: 'dismiss' }),
    })
    setActionLoading(null)
    if (res.ok) {
      toast.success('Report dismissed')
      setReports(r => r.filter(x => x.report_id !== reportId))
    } else toast.error('Failed')
  }

  async function deleteMessage(report: AdminReport) {
    if (!window.confirm(`Delete message from ${report.message_author_nickname}?`)) return
    setActionLoading(report.report_id + '-delete')
    const res = await fetch(`/api/messages/${report.message_id}`, { method: 'DELETE' })
    if (res.ok) {
      await resolveReport(report.report_id)
      toast.success('Message deleted')
    } else {
      setActionLoading(null)
      toast.error('Failed to delete')
    }
  }

  async function banUser(report: AdminReport) {
    if (!window.confirm(`Ban ${report.message_author_nickname}? This prevents them from posting.`)) return
    setActionLoading(report.report_id + '-ban')
    const res = await fetch(`/api/admin/users/${report.message_author_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ban', reason: report.report_reason }),
    })
    if (res.ok) {
      await resolveReport(report.report_id)
      toast.success(`${report.message_author_nickname} banned`)
    } else {
      setActionLoading(null)
      toast.error('Failed to ban')
    }
  }

  const TABS: { key: TabStatus; label: string }[] = [
    { key: 'pending',   label: 'Pending' },
    { key: 'resolved',  label: 'Resolved' },
    { key: 'dismissed', label: 'Dismissed' },
  ]

  return (
    <div className="min-h-dvh" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--muted-foreground)' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <ShieldAlert className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span className="font-semibold text-sm">Moderation Panel</span>
          <span className="ml-auto text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {adminNickname}
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === t.key ? 'var(--primary)' : 'transparent',
                color: tab === t.key ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Reports */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
              No {tab} reports
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {reports.map(report => (
                <motion.div
                  key={report.report_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {/* Report meta */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--accent-dim)', color: 'var(--primary)' }}>
                        {REASON_LABELS[report.report_reason] ?? report.report_reason}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        by <strong>{report.reporter_nickname}</strong>
                      </span>
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
                        {formatDistanceToNow(new Date(report.report_created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="rounded-xl p-3 mb-3"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--muted-foreground)' }}>
                      <strong style={{ color: 'var(--foreground)' }}>{report.message_author_nickname}</strong>
                      {' · '}
                      {formatDistanceToNow(new Date(report.message_created_at), { addSuffix: true })}
                    </p>
                    <p className="text-sm leading-relaxed break-words" style={{ color: 'var(--foreground)' }}>
                      {report.message_content}
                    </p>
                    {report.report_details && (
                      <p className="text-xs mt-2 italic" style={{ color: 'var(--muted-foreground)' }}>
                        Note: {report.report_details}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {tab === 'pending' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <ActionButton
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        label="Dismiss"
                        loading={actionLoading === report.report_id + '-dismiss'}
                        color="var(--muted-foreground)"
                        bg="var(--surface-2)"
                        onClick={() => dismissReport(report.report_id)}
                      />
                      <ActionButton
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        label="Delete message"
                        loading={actionLoading === report.report_id + '-delete'}
                        color="var(--destructive)"
                        bg="oklch(0.95 0.02 25)"
                        onClick={() => deleteMessage(report)}
                      />
                      <ActionButton
                        icon={<Ban className="w-3.5 h-3.5" />}
                        label={`Ban ${report.message_author_nickname}`}
                        loading={actionLoading === report.report_id + '-ban'}
                        color="oklch(0.55 0.18 360)"
                        bg="oklch(0.95 0.02 360)"
                        onClick={() => banUser(report)}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

function ActionButton({
  icon, label, loading, color, bg, onClick,
}: {
  icon: React.ReactNode
  label: string
  loading: boolean
  color: string
  bg: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
      style={{ color, background: bg, border: `1px solid ${color}22` }}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {label}
    </button>
  )
}
