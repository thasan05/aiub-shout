import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase.rpc('get_replies', { p_parent_id: id })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const replies = (data ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    reactions: ((m.reactions as RawReactionFromDB[]) ?? []).map(r => ({
      emoji: r.emoji as ReactionSummary['emoji'],
      count: Number(r.count),
      user_reacted: user ? (r.user_ids ?? []).includes(user.id) : false,
    })),
    reply_count: 0,
  }))

  return NextResponse.json({ replies })
}
