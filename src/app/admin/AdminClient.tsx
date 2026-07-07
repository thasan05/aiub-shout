'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import {
  ArrowLeft, Ban, CheckCircle2, Trash2, Loader2, ShieldAlert,
  Users, MessageSquare, BarChart3, Flag, Search, RefreshCw,
  UserCheck, UserX, ChevronLeft, ChevronRight, Activity,
  Clock, AlertTriangle, TrendingUp, X,
} from 'lucide-react'
import { toast } from 'sonner'

type Tab = 'overview' | 'reports' | 'users' | 'messages'
type ReportStatus = 'pending' | 'resolved' | 'dismissed'
type UserFilter = 'all' | 'banned' | 'admin'

interface Stats {
  totalUsers: number
  totalMessages: number
  messagesToday: number
  pendingReports: number
  bannedUsers: number
  onlineNow: number
  recentUsers: { id: string; nickname: string; nickname_color: string; created_at: string }[]
  recentMessages: { id: string; content: string; created_at: string; users: { nickname: string; nickname_color: string } }[]
}

interface AdminReport {
  report_id: string
  report_reason: string
  report_details: string | null
  report_status: string
  report_created_at: string
  message_id: string
  message_content: string
  reporter_nickname: string
  message_author_nickname: string
  message_author_id: string
}

interface AdminUser {
  id: string
  email: string
  nickname: string
  nickname_color: string
  is_admin: boolean
  is_banned: boolean
  ban_reason: string | null
  created_at: string
  last_seen: string
}

interface AdminMessage {
  id: string
  content: string
  created_at: string
  is_deleted: boolean
  parent_id: string | null
  users: { id: string; nickname: string; nickname_color: string; email: string }
}

const REASON_LABELS: Record<string, string> = {
  spam: '🚫 Spam', harassment: '😤 Harassment',
  hate_speech: '🤬 Hate', personal_info: '🔒 Personal info', other: '⚠️ Other',
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; color?: string
}) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>{label}</span>
        <span style={{ color: color ?? 'var(--primary)' }}>{icon}</span>
      </div>
      <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{value}</span>
      {sub && <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{sub}</span>}
    </div>
  )
}

export default function AdminClient({ adminNickname }: { adminNickname: string }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [reportStatus, setReportStatus] = useState<ReportStatus>('pending')
  const [reports, setReports] = useState<AdminReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userQ, setUserQ] = useState('')
  const [userFilter, setUserFilter] = useState<UserFilter>('all')
  const [userPage, setUserPage] = useState(0)
  const [msgs, setMsgs] = useState<AdminMessage[]>([])
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [msgQ, setMsgQ] = useState('')
  const [msgPage, setMsgPage] = useState(0)
  const [msgsHasMore, setMsgsHasMore] = useState(false)
  const userDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const msgDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    const res = await fetch('/api/admin/stats')
    if (res.ok) setStats(await res.json())
    setStatsLoading(false)
  }, [])

  const fetchReports = useCallback(async (status: ReportStatus) => {
    setReportsLoading(true)
    const res = await fetch(`/api/admin/reports?status=${status}`)
    if (res.ok) { const { reports: d } = await res.json(); setReports(d) }
    setReportsLoading(false)
  }, [])

  const fetchUsers = useCallback(async (q: string, filter: UserFilter, page: number) => {
    setUsersLoading(true)
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}&filter=${filter}&page=${page}`)
    if (res.ok) { const { users: d } = await res.json(); setUsers(d) }
    setUsersLoading(false)
  }, [])

  const fetchMsgs = useCallback(async (q: string, page: number) => {
    setMsgsLoading(true)
    const res = await fetch(`/api/admin/messages?q=${encodeURIComponent(q)}&page=${page}`)
    if (res.ok) { const { messages: d, hasMore } = await res.json(); setMsgs(d); setMsgsHasMore(hasMore) }
    setMsgsLoading(false)
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { if (tab === 'reports') fetchReports(reportStatus) }, [tab, reportStatus, fetchReports])
  useEffect(() => {
    if (tab !== 'users') return
    if (userDebounceRef.current) clearTimeout(userDebounceRef.current)
    userDebounceRef.current = setTimeout(() => fetchUsers(userQ, userFilter, userPage), 300)
  }, [tab, userQ, userFilter, userPage, fetchUsers])
  useEffect(() => {
    if (tab !== 'messages') return
    if (msgDebounceRef.current) clearTimeout(msgDebounceRef.current)
    msgDebounceRef.current = setTimeout(() => fetchMsgs(msgQ, msgPage), 300)
  }, [tab, msgQ, msgPage, fetchMsgs])

  async function resolveReport(id: string, action: 'resolve' | 'dismiss') {
    setActionLoading(id + '-' + action)
    const res = await fetch('/api/admin/reports', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: id, action }),
    })
    setActionLoading(null)
    if (res.ok) { toast.success(action === 'resolve' ? 'Resolved' : 'Dismissed'); setReports(r => r.filter(x => x.report_id !== id)) }
    else toast.error('Failed')
  }

  async function deleteMessage(msgId: string, reportId?: string) {
    if (!window.confirm('Delete this message?')) return
    setActionLoading((reportId ?? msgId) + '-delete')
    const res = await fetch(`/api/messages/${msgId}`, { method: 'DELETE' })
    setActionLoading(null)
    if (res.ok) {
      toast.success('Deleted')
      if (reportId) { void resolveReport(reportId, 'resolve') }
      else setMsgs(m => m.filter(x => x.id !== msgId))
    } else toast.error('Failed')
  }

  async function toggleBan(user: AdminUser) {
    const action = user.is_banned ? 'unban' : 'ban'
    let reason = 'Banned by admin'
    if (action === 'ban') {
      const input = window.prompt(`Ban reason for ${user.nickname} (optional):`, '')
      if (input === null) return // cancelled
      if (input.trim()) reason = input.trim()
    } else {
      if (!window.confirm(`Unban ${user.nickname}?`)) return
    }
    setActionLoading(user.id + '-ban')
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    })
    setActionLoading(null)
    if (res.ok) {
      toast.success(action === 'ban' ? 'User banned' : 'Unbanned')
      setUsers(u => u.map(x => x.id === user.id ? { ...x, is_banned: !x.is_banned } : x))
    } else toast.error('Failed')
  }

  async function banFromReport(report: AdminReport) {
    if (!window.confirm(`Ban ${report.message_author_nickname}?`)) return
    setActionLoading(report.report_id + '-ban')
    const res = await fetch(`/api/admin/users/${report.message_author_id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ban', reason: `Banned: ${report.report_reason}` }),
    })
    setActionLoading(null)
    if (res.ok) { toast.success('Banned'); void resolveReport(report.report_id, 'resolve') }
    else toast.error('Failed')
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'reports', label: 'Reports', icon: <Flag className="w-3.5 h-3.5" />, badge: stats?.pendingReports },
    { id: 'users', label: 'Users', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="min-h-dvh" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="sticky top-0 z-50 glass border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: 'var(--muted-foreground)' }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <ShieldAlert className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span className="font-semibold text-sm">Admin Panel</span>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>— {adminNickname}</span>
          <button onClick={fetchStats} className="ml-auto p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: 'var(--muted-foreground)' }} title="Refresh stats">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative"
              style={{
                background: tab === t.id ? 'var(--primary)' : 'transparent',
                color: tab === t.id ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
              }}>
              {t.icon}{t.label}
              {t.badge ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: 'oklch(0.65 0.22 29)', color: 'white' }}>
                  {t.badge > 9 ? '9+' : t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              {statsLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} /></div>
              ) : stats ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    <StatCard icon={<Users className="w-4 h-4" />} label="Total Users" value={stats.totalUsers} />
                    <StatCard icon={<MessageSquare className="w-4 h-4" />} label="All Messages" value={stats.totalMessages} />
                    <StatCard icon={<TrendingUp className="w-4 h-4" />} label="Today" value={stats.messagesToday} sub="messages" color="oklch(0.65 0.2 142)" />
                    <StatCard icon={<Activity className="w-4 h-4" />} label="Online Now" value={stats.onlineNow} color="oklch(0.65 0.2 142)" />
                    <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Reports" value={stats.pendingReports} sub="pending" color={stats.pendingReports > 0 ? 'oklch(0.65 0.22 29)' : undefined} />
                    <StatCard icon={<Ban className="w-4 h-4" />} label="Banned" value={stats.bannedUsers} color="var(--destructive)" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <UserCheck className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Recent Signups
                      </h3>
                      <div className="space-y-2">
                        {stats.recentUsers.map(u => (
                          <div key={u.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: `${u.nickname_color}22`, color: u.nickname_color }}>
                              {u.nickname.charAt(0)}
                            </div>
                            <span className="text-xs font-medium flex-1 truncate" style={{ color: u.nickname_color }}>{u.nickname}</span>
                            <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                              {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                        {stats.recentUsers.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--muted-foreground)' }}>No users yet</p>}
                      </div>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Clock className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Live Feed
                        </h3>
                        <button onClick={fetchStats} className="text-xs px-2 py-0.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          style={{ color: 'var(--muted-foreground)' }}>↻ Refresh</button>
                      </div>
                      <div className="space-y-2">
                        {stats.recentMessages.map((m) => (
                          <div key={m.id} className="py-1.5 px-2 rounded-lg" style={{ background: 'var(--surface-2)' }}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-semibold" style={{ color: m.users.nickname_color }}>{m.users.nickname}</span>
                              <span className="text-[10px] ml-auto" style={{ color: 'var(--muted-foreground)' }}>
                                {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs truncate" style={{ color: 'var(--foreground)' }}>{m.content}</p>
                          </div>
                        ))}
                        {stats.recentMessages.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--muted-foreground)' }}>No messages yet</p>}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20">
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Failed to load stats</p>
                  <button onClick={fetchStats} className="mt-2 text-xs underline" style={{ color: 'var(--primary)' }}>Retry</button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── REPORTS ── */}
          {tab === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                {(['pending', 'resolved', 'dismissed'] as ReportStatus[]).map(s => (
                  <button key={s} onClick={() => setReportStatus(s)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                    style={{ background: reportStatus === s ? 'var(--primary)' : 'transparent', color: reportStatus === s ? 'var(--primary-foreground)' : 'var(--muted-foreground)' }}>
                    {s}
                  </button>
                ))}
              </div>
              {reportsLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} /></div>
              ) : reports.length === 0 ? (
                <div className="text-center py-20">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: 'oklch(0.65 0.2 142)' }} />
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No {reportStatus} reports</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map(r => (
                    <div key={r.report_id} className="rounded-2xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-dim)', color: 'var(--primary)' }}>
                          {REASON_LABELS[r.report_reason] ?? r.report_reason}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                          {formatDistanceToNow(new Date(r.report_created_at), { addSuffix: true })}
                        </span>
                        <span className="text-xs ml-auto" style={{ color: 'var(--muted-foreground)' }}>
                          <span style={{ color: 'var(--foreground)' }}>{r.reporter_nickname}</span> → <span style={{ color: 'var(--destructive)' }}>{r.message_author_nickname}</span>
                        </span>
                      </div>
                      <div className="rounded-xl px-3 py-2 mb-3 text-sm break-words"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        {r.message_content}
                      </div>
                      {r.report_details && (
                        <p className="text-xs mb-3 italic" style={{ color: 'var(--muted-foreground)' }}>Note: &ldquo;{r.report_details}&rdquo;</p>
                      )}
                      {reportStatus === 'pending' && (
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: 'delete', label: 'Delete msg', icon: <Trash2 className="w-3 h-3" />, bg: 'var(--destructive)', color: 'white', action: () => deleteMessage(r.message_id, r.report_id) },
                            { key: 'ban', label: 'Ban user', icon: <Ban className="w-3 h-3" />, bg: 'oklch(0.55 0.22 29 / 0.15)', color: 'oklch(0.65 0.22 29)', action: () => banFromReport(r) },
                            { key: 'resolve', label: 'Resolve', icon: <CheckCircle2 className="w-3 h-3" />, bg: 'oklch(0.55 0.2 142 / 0.15)', color: 'oklch(0.55 0.2 142)', action: () => resolveReport(r.report_id, 'resolve') },
                            { key: 'dismiss', label: 'Dismiss', icon: <X className="w-3 h-3" />, bg: 'var(--surface-2)', color: 'var(--muted-foreground)', action: () => resolveReport(r.report_id, 'dismiss') },
                          ].map(btn => (
                            <button key={btn.key} onClick={btn.action} disabled={!!actionLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                              style={{ background: btn.bg, color: btn.color }}>
                              {actionLoading === r.report_id + '-' + btn.key ? <Loader2 className="w-3 h-3 animate-spin" /> : btn.icon}
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl flex-1 min-w-48"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                  <input type="text" placeholder="Search nickname or email…" value={userQ}
                    onChange={e => { setUserQ(e.target.value); setUserPage(0) }}
                    className="bg-transparent text-sm outline-none flex-1" style={{ color: 'var(--foreground)' }} />
                  {userQ && <button onClick={() => setUserQ('')}><X className="w-3 h-3" style={{ color: 'var(--muted-foreground)' }} /></button>}
                </div>
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                  {(['all', 'banned', 'admin'] as UserFilter[]).map(f => (
                    <button key={f} onClick={() => { setUserFilter(f); setUserPage(0) }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all"
                      style={{ background: userFilter === f ? 'var(--primary)' : 'transparent', color: userFilter === f ? 'var(--primary-foreground)' : 'var(--muted-foreground)' }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {usersLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} /></div>
              ) : (
                <>
                  <div className="space-y-2">
                    {users.map(u => (
                      <div key={u.id} className="rounded-2xl p-4 flex items-center gap-3"
                        style={{ background: 'var(--surface-1)', border: `1px solid ${u.is_banned ? 'oklch(0.65 0.22 29 / 0.4)' : 'var(--border)'}` }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: `${u.nickname_color}22`, color: u.nickname_color }}>
                          {u.nickname.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className="text-sm font-semibold" style={{ color: u.nickname_color }}>{u.nickname}</span>
                            {u.is_admin && <span className="text-[10px] px-1.5 py-px rounded font-bold uppercase" style={{ background: 'var(--accent-dim)', color: 'var(--primary)' }}>Admin</span>}
                            {u.is_banned && <span className="text-[10px] px-1.5 py-px rounded font-bold uppercase" style={{ background: 'oklch(0.65 0.22 29)', color: 'white' }}>Banned</span>}
                          </div>
                          <p className="text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{u.email}</p>
                          <p className="text-[11px]" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
                            Joined {format(new Date(u.created_at), 'MMM d yyyy')} · Seen {formatDistanceToNow(new Date(u.last_seen), { addSuffix: true })}
                          </p>
                          {u.ban_reason && <p className="text-[11px] mt-0.5" style={{ color: 'oklch(0.65 0.22 29)' }}>Reason: {u.ban_reason}</p>}
                        </div>
                        {!u.is_admin && (
                          <button onClick={() => toggleBan(u)} disabled={actionLoading === u.id + '-ban'}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 disabled:opacity-50"
                            style={{
                              background: u.is_banned ? 'oklch(0.55 0.2 142 / 0.15)' : 'var(--destructive)',
                              color: u.is_banned ? 'oklch(0.55 0.2 142)' : 'white',
                            }}>
                            {actionLoading === u.id + '-ban' ? <Loader2 className="w-3 h-3 animate-spin" /> : u.is_banned ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {u.is_banned ? 'Unban' : 'Ban'}
                          </button>
                        )}
                      </div>
                    ))}
                    {users.length === 0 && !usersLoading && (
                      <p className="text-sm text-center py-12" style={{ color: 'var(--muted-foreground)' }}>No users found</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button onClick={() => setUserPage(p => Math.max(0, p - 1))} disabled={userPage === 0}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Page {userPage + 1}</span>
                    <button onClick={() => setUserPage(p => p + 1)} disabled={users.length < 25}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── MESSAGES ── */}
          {tab === 'messages' && (
            <motion.div key="messages" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl mb-4"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                <input type="text" placeholder="Search message content…" value={msgQ}
                  onChange={e => { setMsgQ(e.target.value); setMsgPage(0) }}
                  className="bg-transparent text-sm outline-none flex-1" style={{ color: 'var(--foreground)' }} />
                {msgQ && <button onClick={() => setMsgQ('')}><X className="w-3 h-3" style={{ color: 'var(--muted-foreground)' }} /></button>}
              </div>
              {msgsLoading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--primary)' }} /></div>
              ) : (
                <>
                  <div className="space-y-2">
                    {msgs.map(m => (
                      <div key={m.id} className="rounded-2xl p-3 flex items-start gap-3"
                        style={{ background: 'var(--surface-1)', border: `1px solid ${m.is_deleted ? 'var(--destructive)' : 'var(--border)'}`, opacity: m.is_deleted ? 0.6 : 1 }}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                          style={{ background: `${m.users.nickname_color}22`, color: m.users.nickname_color }}>
                          {m.users.nickname.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                            <span className="text-xs font-semibold" style={{ color: m.users.nickname_color }}>{m.users.nickname}</span>
                            {m.parent_id && <span className="text-[10px] px-1 py-px rounded" style={{ background: 'var(--surface-2)', color: 'var(--muted-foreground)' }}>reply</span>}
                            {m.is_deleted && <span className="text-[10px] px-1 py-px rounded" style={{ background: 'var(--destructive)', color: 'white' }}>deleted</span>}
                            <span className="text-[11px] ml-auto" style={{ color: 'var(--muted-foreground)' }}>
                              {format(new Date(m.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm break-words" style={{ color: 'var(--foreground)' }}>{m.content}</p>
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>{m.users.email}</p>
                        </div>
                        {!m.is_deleted && (
                          <button onClick={() => deleteMessage(m.id)} disabled={actionLoading === m.id + '-delete'}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 shrink-0 disabled:opacity-50"
                            style={{ color: 'var(--destructive)' }}>
                            {actionLoading === m.id + '-delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    ))}
                    {msgs.length === 0 && !msgsLoading && (
                      <p className="text-sm text-center py-12" style={{ color: 'var(--muted-foreground)' }}>No messages found</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <button onClick={() => setMsgPage(p => Math.max(0, p - 1))} disabled={msgPage === 0}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Page {msgPage + 1}</span>
                    <button onClick={() => setMsgPage(p => p + 1)} disabled={!msgsHasMore}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs disabled:opacity-30"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
