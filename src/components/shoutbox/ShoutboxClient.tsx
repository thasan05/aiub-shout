'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useShoutboxStore } from '@/store/shoutboxStore'
import { type Message, type User } from '@/types'
import Header from '@/components/layout/Header'
import MessageList from './MessageList'
import MessageComposer from './MessageComposer'
import TypingIndicator from './TypingIndicator'
import WallpaperPicker from './WallpaperPicker'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useWallpaper } from '@/hooks/useWallpaper'
import { useNotificationSound } from '@/hooks/useNotificationSound'
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications'

interface Props {
  initialMessages: Message[]
  initialUser: User | null
  initialOnline: number
}

export default function ShoutboxClient({ initialMessages, initialUser, initialOnline }: Props) {
  const {
    setMessages,
    setCurrentUser,
    setOnlineCount,
    addMessage,
    updateMessage,
    setHasMore,
    addTypingUser,
    removeTypingUser,
    addReply,
    cacheUser,
  } = useShoutboxStore()

  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const presenceTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const initializedRef = useRef(false)
  const [tabUnread, setTabUnread] = useState(0)
  const [wallpaperOpen, setWallpaperOpen] = useState(false)
  const { wallpaperUrl } = useWallpaper()
  const { ping } = useNotificationSound()
  const { notify } = useBrowserNotifications()

  useKeyboardShortcuts({
    onOpenSearch: () => window.dispatchEvent(new CustomEvent('shoutbox:open-search')),
    onFocusComposer: () => window.dispatchEvent(new CustomEvent('shoutbox:focus-composer')),
    onEscape: () => window.dispatchEvent(new CustomEvent('shoutbox:escape')),
  })

  useEffect(() => {
    function onOpen() { setWallpaperOpen(true) }
    window.addEventListener('shoutbox:open-wallpaper', onOpen)
    return () => window.removeEventListener('shoutbox:open-wallpaper', onOpen)
  }, [])

  useEffect(() => {
    if (tabUnread > 0) {
      document.title = `(${tabUnread}) AIUB Shout`
    } else {
      document.title = 'AIUB Shout — Campus Chat'
    }
  }, [tabUnread])

  useEffect(() => {
    function onFocus() { setTabUnread(0) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Hydrate store — client-side fallback if SSR returned empty
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    setCurrentUser(initialUser)
    setOnlineCount(initialOnline)

    if (initialMessages.length > 0) {
      setMessages(initialMessages)
      setHasMore(initialMessages.length === 50)
    } else {
      // SSR returned empty (RLS/auth timing issue) — fetch on client
      fetch('/api/messages?limit=50')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.messages?.length > 0) {
            setMessages(data.messages)
            setHasMore(data.hasMore ?? false)
          }
        })
        .catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('shoutbox-main')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const raw = payload.new as {
            id: string; user_id: string; content: string;
            parent_id: string | null; created_at: string; is_deleted: boolean;
          }

          if (raw.user_id === initialUser?.id) return

          const cached = useShoutboxStore.getState().usersCache[raw.user_id]
          let nickname = cached?.nickname
          let nickname_color = cached?.nickname_color

          if (!nickname) {
            const { data: profile } = await supabase
              .from('users')
              .select('nickname, nickname_color')
              .eq('id', raw.user_id)
              .single()
            nickname = profile?.nickname ?? 'Unknown'
            nickname_color = profile?.nickname_color ?? '#60A5FA'
            if (profile) cacheUser(raw.user_id, { nickname, nickname_color })
          }

          const message: Message = {
            id: raw.id,
            user_id: raw.user_id,
            content: raw.content,
            parent_id: raw.parent_id,
            created_at: raw.created_at,
            is_deleted: false,
            nickname: nickname!,
            nickname_color: nickname_color!,
            reply_count: 0,
            reactions: [],
          }

          if (raw.parent_id) {
            addReply(raw.parent_id, message)
          } else {
            addMessage(message)
            ping()
            notify('AIUB Shout', `${message.nickname}: ${message.content.slice(0, 80)}`)
            if (!document.hasFocus()) setTabUnread(n => n + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updated = payload.new as {
            id: string; is_deleted: boolean; content: string; edited_at: string | null
          }
          if (updated.is_deleted) {
            useShoutboxStore.getState().removeMessage(updated.id)
          } else {
            updateMessage(updated.id, {
              content: updated.content,
              edited_at: updated.edited_at ?? null,
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions' },
        async (payload) => {
          const messageId =
            (payload.new as { message_id?: string })?.message_id ??
            (payload.old as { message_id?: string })?.message_id
          if (!messageId) return

          const { data } = await supabase
            .from('reactions')
            .select('emoji, user_id')
            .eq('message_id', messageId)

          if (!data) return

          const currentUserId = initialUser?.id
          const grouped: Record<string, string[]> = {}
          for (const r of data) {
            if (!grouped[r.emoji]) grouped[r.emoji] = []
            grouped[r.emoji].push(r.user_id)
          }

          const reactions = Object.entries(grouped).map(([emoji, userIds]) => ({
            emoji: emoji as Message['reactions'][0]['emoji'],
            count: userIds.length,
            user_reacted: currentUserId ? userIds.includes(currentUserId) : false,
          }))

          updateMessage(messageId, { reactions })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'online_presence' },
        async () => {
          const { data } = await supabase.rpc('get_online_count')
          if (data !== null) setOnlineCount(data)
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, nickname, nickname_color } = payload.payload as {
          userId: string; nickname: string; nickname_color: string
        }
        if (userId === initialUser?.id) return

        addTypingUser({ userId, nickname, nickname_color, timestamp: Date.now() })

        if (typingTimers.current[userId]) clearTimeout(typingTimers.current[userId])
        typingTimers.current[userId] = setTimeout(() => {
          removeTypingUser(userId)
          delete typingTimers.current[userId]
        }, 3500)
      })
      .subscribe()

    function onSelfTyping() {
      if (!initialUser) return
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: initialUser.id,
          nickname: initialUser.nickname,
          nickname_color: initialUser.nickname_color,
        },
      })
    }
    window.addEventListener('shoutbox:typing', onSelfTyping)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('shoutbox:typing', onSelfTyping)
      Object.values(typingTimers.current).forEach(clearTimeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Presence heartbeat
  useEffect(() => {
    if (!initialUser) return

    async function heartbeat() {
      const res = await fetch('/api/presence', { method: 'POST' })
      if (res.ok) {
        const { online } = await res.json()
        setOnlineCount(online)
      }
    }

    heartbeat()
    presenceTimer.current = setInterval(heartbeat, 60_000)
    return () => { if (presenceTimer.current) clearInterval(presenceTimer.current) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <Header />

      <WallpaperPicker open={wallpaperOpen} onClose={() => setWallpaperOpen(false)} />

      <div
        className="flex-1 flex flex-col overflow-hidden w-full max-w-3xl mx-auto"
        data-wallpaper={wallpaperUrl ? '1' : undefined}
        style={wallpaperUrl ? {
          backgroundImage: `url(${wallpaperUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'local',
        } : undefined}
      >
        <MessageList />
        <TypingIndicator />

        <div
          className="px-3 pt-2 border-t"
          style={{ borderColor: 'oklch(0.92 0 0 / 0.06)' }}
        >
          <MessageComposer />
          <p
            className="text-center text-[10px] pt-1.5"
            style={{
              color: 'var(--muted-foreground)',
              opacity: 0.3,
              paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
            }}
          >
            <kbd>/</kbd> search · <kbd>Shift+↵</kbd> newline
          </p>
        </div>
      </div>
    </div>
  )
}
