'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { type Message, type User, type TypingUser, type TrendingTopic } from '@/types'

interface ShoutboxState {
  // Data
  messages: Message[]
  currentUser: User | null
  onlineCount: number
  typingUsers: TypingUser[]
  trending: TrendingTopic[]
  isLoading: boolean
  hasMore: boolean
  searchQuery: string
  // User cache: userId → { nickname, nickname_color }
  usersCache: Record<string, { nickname: string; nickname_color: string }>

  // Actions
  setCurrentUser: (user: User | null) => void
  setMessages: (messages: Message[]) => void
  prependMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  removeMessage: (id: string) => void
  replaceTempMessage: (tempId: string, message: Message) => void

  toggleReactionOptimistic: (messageId: string, emoji: string, userId: string) => void

  setReplies: (messageId: string, replies: Message[]) => void
  addReply: (parentId: string, reply: Message) => void
  incrementReplyCount: (messageId: string) => void

  setOnlineCount: (count: number) => void
  addTypingUser: (user: TypingUser) => void
  removeTypingUser: (userId: string) => void
  setTrending: (topics: TrendingTopic[]) => void
  setLoading: (loading: boolean) => void
  setHasMore: (hasMore: boolean) => void
  setSearchQuery: (q: string) => void
  cacheUser: (userId: string, data: { nickname: string; nickname_color: string }) => void
}

export const useShoutboxStore = create<ShoutboxState>()(
  persist(
    (set) => ({
  messages: [],
  currentUser: null,
  onlineCount: 0,
  typingUsers: [],
  trending: [],
  isLoading: false,
  hasMore: true,
  searchQuery: '',
  usersCache: {},

  setCurrentUser: (user) => set({ currentUser: user }),

  setMessages: (messages) => {
    const cache: Record<string, { nickname: string; nickname_color: string }> = {}
    for (const m of messages) {
      cache[m.user_id] = { nickname: m.nickname, nickname_color: m.nickname_color }
    }
    set((s) => ({ messages, usersCache: { ...s.usersCache, ...cache } }))
  },

  prependMessages: (messages) => {
    const cache: Record<string, { nickname: string; nickname_color: string }> = {}
    for (const m of messages) {
      cache[m.user_id] = { nickname: m.nickname, nickname_color: m.nickname_color }
    }
    set((s) => ({
      messages: [...s.messages, ...messages],
      usersCache: { ...s.usersCache, ...cache },
    }))
  },

  addMessage: (message) => set((s) => {
    const exists = s.messages.some(m => m.id === message.id)
    if (exists) return s
    return {
      messages: [message, ...s.messages],
      usersCache: {
        ...s.usersCache,
        [message.user_id]: { nickname: message.nickname, nickname_color: message.nickname_color },
      },
    }
  }),

  updateMessage: (id, updates) => set((s) => ({
    messages: s.messages.map(m => m.id === id ? { ...m, ...updates } : m),
  })),

  removeMessage: (id) => set((s) => ({
    messages: s.messages.filter(m => m.id !== id),
  })),

  replaceTempMessage: (tempId, message) => set((s) => ({
    messages: s.messages.map(m => m.temp_id === tempId ? message : m),
  })),

  toggleReactionOptimistic: (messageId, emoji, userId) => set((s) => ({
    messages: s.messages.map(m => {
      if (m.id !== messageId) return m
      const existing = m.reactions.find(r => r.emoji === emoji)
      if (existing) {
        if (existing.user_reacted) {
          const newCount = existing.count - 1
          return {
            ...m,
            reactions: newCount === 0
              ? m.reactions.filter(r => r.emoji !== emoji)
              : m.reactions.map(r => r.emoji === emoji
                  ? { ...r, count: newCount, user_reacted: false }
                  : r
                ),
          }
        }
        return {
          ...m,
          reactions: m.reactions.map(r => r.emoji === emoji
            ? { ...r, count: r.count + 1, user_reacted: true }
            : r
          ),
        }
      }
      return {
        ...m,
        reactions: [...m.reactions, { emoji: emoji as never, count: 1, user_reacted: true }],
      }
    }),
  })),

  setReplies: (messageId, replies) => set((s) => ({
    messages: s.messages.map(m =>
      m.id === messageId ? { ...m, replies, replies_loaded: true } : m
    ),
  })),

  addReply: (parentId, reply) => set((s) => ({
    messages: s.messages.map(m => {
      if (m.id !== parentId) return m
      return {
        ...m,
        reply_count: m.reply_count + 1,
        replies: m.replies ? [...m.replies, reply] : [reply],
      }
    }),
  })),

  incrementReplyCount: (messageId) => set((s) => ({
    messages: s.messages.map(m =>
      m.id === messageId ? { ...m, reply_count: m.reply_count + 1 } : m
    ),
  })),

  setOnlineCount: (count) => set({ onlineCount: count }),

  addTypingUser: (user) => set((s) => ({
    typingUsers: [
      ...s.typingUsers.filter(u => u.userId !== user.userId),
      user,
    ],
  })),

  removeTypingUser: (userId) => set((s) => ({
    typingUsers: s.typingUsers.filter(u => u.userId !== userId),
  })),

  setTrending: (topics) => set({ trending: topics }),
  setLoading: (isLoading) => set({ isLoading }),
  setHasMore: (hasMore) => set({ hasMore }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  cacheUser: (userId, data) => set((s) => ({
    usersCache: { ...s.usersCache, [userId]: data },
  })),
    }),
    {
      name: 'aiub-shout-cache',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        messages: state.messages.slice(0, 50).filter(m => !m.is_pending),
      }),
    }
  )
)
