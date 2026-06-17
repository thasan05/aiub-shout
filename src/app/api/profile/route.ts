import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

export async function PATCH(request: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { nickname, nickname_color } = body

  const trimmed = typeof nickname === 'string' ? nickname.trim() : ''
  if (trimmed.length < 2 || trimmed.length > 20) {
    return NextResponse.json({ error: 'Nickname must be 2–20 characters' }, { status: 400 })
  }
  if (!nickname_color || !/^#[0-9A-Fa-f]{6}$/.test(nickname_color)) {
    return NextResponse.json({ error: 'Invalid color' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('users').select('id').eq('nickname', trimmed).neq('id', user.id).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Nickname already taken' }, { status: 409 })

  const { error } = await supabase
    .from('users').update({ nickname: trimmed, nickname_color }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
