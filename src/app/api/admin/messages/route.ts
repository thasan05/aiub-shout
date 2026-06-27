import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? ''
  const page = parseInt(searchParams.get('page') ?? '0')
  const limit = 30

  let query = sb
    .from('messages')
    .select('id, content, created_at, is_deleted, parent_id, users!inner(id, nickname, nickname_color, email)')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (q) query = query.ilike('content', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ messages: data ?? [], hasMore: (data?.length ?? 0) === limit })
}
