import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { type ReportReason } from '@/types'

const VALID_REASONS: ReportReason[] = ['spam', 'harassment', 'hate_speech', 'personal_info', 'other']

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

export async function POST(request: NextRequest) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!user.email?.endsWith('@student.aiub.edu')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { message_id, reason, details } = await request.json()

  if (!message_id || typeof message_id !== 'string' || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const sanitizedDetails = typeof details === 'string' ? details.trim().slice(0, 500) : null

  const { error } = await supabase.from('reports').insert({
    message_id,
    reporter_id: user.id,
    reason,
    details: sanitizedDetails || null,
  })

  if (error?.code === '23505') {
    return NextResponse.json({ error: 'Already reported' }, { status: 409 })
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true }, { status: 201 })
}
