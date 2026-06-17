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

export async function GET() {
  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('get_trending_topics', { p_limit: 6 })

  if (error) return NextResponse.json({ topics: [] })

  return NextResponse.json({ topics: data ?? [] }, {
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}
