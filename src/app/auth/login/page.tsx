'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { isValidAiubEmail } from '@/lib/moderation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimmed = email.trim().toLowerCase()
    if (!trimmed) { setError('Enter your AIUB email'); return }
    if (!isValidAiubEmail(trimmed)) {
      setError('Only @student.aiub.edu emails are allowed')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    })
    setLoading(false)

    if (authError) {
      console.error('Auth error:', authError)
      setError(authError.message || `Error ${authError.status ?? ''} — check Supabase auth logs`)
      toast.error('Failed to send magic link')
      return
    }

    setSent(true)
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--background)' }}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 text-center"
      >
        {/* Light mode */}
        <div className="bg-white rounded-2xl px-8 py-5 shadow-lg inline-block dark:hidden">
          <Image src="/logo.png" alt="AIUB Shout" width={200} height={62} className="object-contain block" priority />
        </div>
        {/* Dark mode */}
        <div className="hidden dark:inline-block">
          <Image src="/logo2.png" alt="AIUB Shout" width={200} height={62} className="object-contain block" priority />
        </div>
        <p className="text-sm mt-3" style={{ color: 'var(--muted-foreground)' }}>
          Anonymous student talk box
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 40px oklch(0 0 0 / 0.08)',
        }}
      >
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--online-green-dim)' }}>
                <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--online-green)' }} />
              </div>
              <h2 className="text-lg font-semibold mb-1">Check your email</h2>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Magic link sent to
              </p>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--primary)' }}>
                {email}
              </p>
              <p className="text-xs mt-3" style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>
                Click the link in the email. Check spam if you don&apos;t see it.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 text-xs"
                style={{ color: 'var(--muted-foreground)' }}
                onClick={() => { setSent(false); setEmail('') }}
              >
                Use a different email
              </Button>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="text-lg font-semibold mb-1">Sign in to post</h1>
              <p className="text-sm mb-5" style={{ color: 'var(--muted-foreground)' }}>
                Anyone can read. Only AIUB accounts can post.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: 'var(--muted-foreground)' }} />
                  <Input
                    type="email"
                    placeholder="your@student.aiub.edu"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    className="pl-9 h-10 text-sm"
                    style={{
                      background: 'var(--surface-2)',
                      borderColor: error ? 'var(--destructive)' : undefined,
                    }}
                    autoFocus
                    autoComplete="email"
                    inputMode="email"
                    disabled={loading}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs"
                      style={{ color: 'var(--destructive)' }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Send Magic Link
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t text-xs space-y-1.5"
                style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                <p>✓ No password — magic link via email</p>
                <p>✓ Completely anonymous — random nickname</p>
                <p>✓ AIUB accounts only</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 text-xs"
        style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}
      >
        Your real identity is never shown publicly
      </motion.p>
    </div>
  )
}
