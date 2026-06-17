import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

// Heartbeat — call every 60s to stay "online"
export async function POST() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.rpc('upsert_presence', { p_user_id: user.id })

  const { data: count } = await supabase.rpc('get_online_count')
  return NextResponse.json({ online: count ?? 0 })
}

// Get online count (public)
export async function GET() {
  const supabase = await getSupabase()
  const { data: count } = await supabase.rpc('get_online_count')
  return NextResponse.json({ online: count ?? 0 })
}
