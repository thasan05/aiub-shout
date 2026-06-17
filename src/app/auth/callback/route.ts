import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { generateUniqueNickname } from '@/lib/nicknames'
import { isValidAiubEmail } from '@/lib/moderation'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=missing_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/auth/login?error=exchange_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_user`)
  }

  // Enforce AIUB email domain
  if (!isValidAiubEmail(user.email)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/auth/login?error=invalid_domain`)
  }

  // Create user profile if first sign-in
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!existingUser) {
    const nickname = await generateUniqueNickname(supabase as never, user.id)
    const { error: insertError } = await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      nickname: nickname.name,
      nickname_color: nickname.hex,
      avatar_seed: user.id,
    })

    if (insertError) {
      console.error('Failed to create user profile:', insertError)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
