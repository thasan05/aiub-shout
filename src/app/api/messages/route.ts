import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { moderateContent } from '@/lib/moderation'
import { type RawReactionFromDB, type ReactionSummary } from '@/types'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(s) { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )
}

function mapReactions(raw: RawReactionFromDB[], currentUserId?: string): ReactionSummary[] {
  return raw.map(r => ({
    emoji: r.emoji as ReactionSummary['emoji'],
    count: Number(r.count),
    user_reacted: currentUserId ? (r.user_ids ?? []).includes(currentUserId) : false,
    user_ids: r.user_ids ?? [],
  }))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const before = searchParams.get('before') || new Date().toISOString()
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const search = searchParams.get('search') || null

  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase.rpc('get_messages', {
    p_limit: limit,
    p_before: before,
    p_search: search,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const messages = (data ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    reactions: mapReactions((m.reactions as RawReactionFromDB[]) ?? [], user?.id),
  }))

  return NextResponse.json({ messages, hasMore: messages.length === limit })
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Server-side domain enforcement — client validation alone is bypassable
  if (!user.email?.endsWith('@student.aiub.edu')) {
    return NextResponse.json({ error: 'Only @student.aiub.edu accounts can post' }, { status: 403 })
  }

  const body = await request.json()
  const { content, parent_id } = body

  const mod = moderateContent(content ?? '')
  if (!mod.allowed) return NextResponse.json({ error: mod.reason }, { status: 400 })

  // Fetch profile — check ban status before doing anything
  const { data: profile } = await supabase
    .from('users')
    .select('nickname, nickname_color, is_banned')
    .eq('id', user.id)
    .single()

  if (profile?.is_banned) {
    return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 })
  }

  // Rate limit
  const { data: rateOk } = await supabase.rpc('check_rate_limit', {
    p_user_id: user.id,
    p_limit: 5,
    p_window_seconds: 30,
  })
  if (!rateOk) {
    return NextResponse.json({ error: 'Slow down! Max 5 messages per 30 seconds.' }, { status: 429 })
  }

  const { data: msg, error } = await supabase
    .from('messages')
    .insert({ content: content.trim(), parent_id: parent_id ?? null, user_id: user.id })
    .select('id, content, parent_id, created_at, user_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    message: {
      ...msg,
      nickname: profile?.nickname ?? '',
      nickname_color: profile?.nickname_color ?? '#60A5FA',
      reply_count: 0,
      reactions: [],
    },
  }, { status: 201 })
}
