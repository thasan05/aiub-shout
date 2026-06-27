import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(s) { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
  return p?.is_admin ? user : null
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { count: totalUsers },
    { count: totalMessages },
    { count: messagesToday },
    { count: pendingReports },
    { count: bannedUsers },
    { data: onlineData },
    { data: topUsers },
    { data: recentMessages },
  ] = await Promise.all([
    sb.from('users').select('*', { count: 'exact', head: true }),
    sb.from('messages').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    sb.from('messages').select('*', { count: 'exact', head: true })
      .eq('is_deleted', false).gte('created_at', today.toISOString()),
    sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true),
    sb.rpc('get_online_count'),
    sb.from('users')
      .select('id, nickname, nickname_color, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    sb.from('messages')
      .select('id, content, created_at, user_id, users!inner(nickname, nickname_color)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    totalMessages: totalMessages ?? 0,
    messagesToday: messagesToday ?? 0,
    pendingReports: pendingReports ?? 0,
    bannedUsers: bannedUsers ?? 0,
    onlineNow: onlineData ?? 0,
    recentUsers: topUsers ?? [],
    recentMessages: recentMessages ?? [],
  })
}
