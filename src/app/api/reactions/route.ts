import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { type ReactionEmoji } from '@/types'

const VALID_EMOJIS: ReactionEmoji[] = ['👍', '🔥', '😂', '💀', '❤️']

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

// Toggle reaction (add if not exists, remove if exists)
export async function POST(request: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!user.email?.endsWith('@student.aiub.edu')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { message_id, emoji } = await request.json()

  if (!message_id || typeof message_id !== 'string' || !VALID_EMOJIS.includes(emoji)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('users').select('is_banned').eq('id', user.id).single()
  if (profile?.is_banned) {
    return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 })
  }

  // Check if already reacted
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('message_id', message_id)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    // Remove reaction
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existing.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ action: 'removed' })
  }

  // Add reaction
  const { error } = await supabase
    .from('reactions')
    .insert({ message_id, user_id: user.id, emoji })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ action: 'added' }, { status: 201 })
}
