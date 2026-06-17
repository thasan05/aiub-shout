export interface User {
  id: string
  email: string
  nickname: string
  nickname_color: string
  avatar_seed: string
  is_banned: boolean
  is_admin: boolean
  ban_reason?: string
  created_at: string
  last_seen: string
}

export interface ReactionSummary {
  emoji: ReactionEmoji
  count: number
  user_reacted: boolean
  user_ids?: string[]
}

export interface AdminReport {
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

export interface Message {
  id: string
  user_id: string
  content: string
  parent_id: string | null
  created_at: string
  is_deleted: boolean
  nickname: string
  nickname_color: string
  reply_count: number
  reactions: ReactionSummary[]
  replies?: Message[]
  replies_loaded?: boolean
  // Optimistic update tracking
  is_pending?: boolean
  temp_id?: string
}

export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: ReactionEmoji
  created_at: string
}

export type ReactionEmoji = '👍' | '🔥' | '😂' | '💀' | '❤️'

export type ReportReason = 'spam' | 'harassment' | 'hate_speech' | 'personal_info' | 'other'

export interface Report {
  id: string
  message_id: string
  reporter_id: string
  reason: ReportReason
  details?: string
  status: 'pending' | 'resolved' | 'dismissed'
  created_at: string
}

export interface OnlinePresence {
  user_id: string
  last_seen: string
  is_typing: boolean
}

export interface TrendingTopic {
  keyword: string
  count: number
}

export interface TypingUser {
  userId: string
  nickname: string
  nickname_color: string
  timestamp: number
}

export interface RawReactionFromDB {
  emoji: string
  count: number
  user_ids: string[]
}
