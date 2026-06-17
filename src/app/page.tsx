import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import ShoutboxClient from '@/components/shoutbox/ShoutboxClient'
import { type Message, type User, type RawReactionFromDB, type ReactionSummary } from '@/types'

export const dynamic = 'force-dynamic'

function mapReactions(raw: RawReactionFromDB[], currentUserId?: string): ReactionSummary[] {
  return (raw ?? []).map(r => ({
    emoji: r.emoji as ReactionSummary['emoji'],
    count: Number(r.count),
    user_reacted: currentUserId ? (r.user_ids ?? []).includes(currentUserId) : false,
    user_ids: r.user_ids ?? [],
  }))
}

export default async function HomePage() {
  const supabase = await createServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  // Service role client for messages — bypasses auth so SSR always returns data
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [messagesResult, userResult, onlineResult] = await Promise.all([
    adminSupabase.rpc('get_messages', {
      p_limit: 50,
      p_before: new Date().toISOString(),
      p_search: null,
    }),
    authUser
      ? supabase.from('users').select('*').eq('id', authUser.id).single()
      : Promise.resolve({ data: null, error: null }),
    adminSupabase.rpc('get_online_count'),
  ])

  const rawMessages = messagesResult.data ?? []
  const currentUser: User | null = userResult.data ?? null
  const onlineCount: number = onlineResult.data ?? 0

  const messages: Message[] = rawMessages.map((m: Record<string, unknown>) => ({
    id: m.id as string,
    user_id: m.user_id as string,
    content: m.content as string,
    parent_id: m.parent_id as string | null,
    created_at: m.created_at as string,
    is_deleted: false,
    nickname: m.nickname as string,
    nickname_color: m.nickname_color as string,
    reply_count: Number(m.reply_count ?? 0),
    reactions: mapReactions(m.reactions as RawReactionFromDB[], authUser?.id),
  }))

  return (
    <ShoutboxClient
      initialMessages={messages}
      initialUser={currentUser}
      initialOnline={onlineCount}
    />
  )
}
