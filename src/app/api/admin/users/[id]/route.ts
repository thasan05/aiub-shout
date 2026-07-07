import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabase
    .from('users').select('is_admin').eq('id', user.id).single()
  if (!adminProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { action, reason } = await request.json()

  if (!['ban', 'unban'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Prevent banning admin accounts (including self)
  const { data: targetUser } = await supabase
    .from('users').select('is_admin').eq('id', id).single()
  if (targetUser?.is_admin) {
    return NextResponse.json({ error: 'Cannot ban admin accounts' }, { status: 403 })
  }

  if (action === 'ban') {
    const { error } = await supabase
      .from('users')
      .update({ is_banned: true, ban_reason: reason ?? 'Banned by admin' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (action === 'unban') {
    const { error } = await supabase
      .from('users')
      .update({ is_banned: false, ban_reason: null })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
