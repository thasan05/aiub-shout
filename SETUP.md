# AIUB Shoutbox — Setup Guide

## 1. Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Wait for it to provision

## 2. Run Database Schema

In the Supabase SQL Editor, run the entire contents of `supabase/schema.sql`

This creates:
- `users` table (synced from auth)
- `messages` table (with 200 char limit)
- `reactions` table
- `reports` table
- `online_presence` table
- All indexes
- Row Level Security policies
- PostgreSQL functions (rate limiting, trending, presence)
- Realtime enabled on all tables

## 3. Configure Supabase Auth

In Supabase Dashboard → Authentication → Settings:
- **Email** provider: Enabled
- **Email OTP**: Enabled (for magic links)
- Set Site URL to: `http://localhost:3000` (dev) / your production URL
- Add Redirect URL: `http://localhost:3000/auth/callback`

## 4. Set Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in the values from Supabase Dashboard → Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key

## 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Architecture

```
Phase 1 (complete):
├── Auth — AIUB email-only magic link
├── Anonymous nicknames — deterministic hash → "Blue Tiger" etc.
├── Real-time messages — Supabase Realtime postgres_changes
├── Typing indicators — Supabase Realtime broadcast
├── Reactions — optimistic UI + server sync
├── Replies — nested threads
├── Reports — 5 reasons + details
├── Content moderation — blocks phones, emails, spam
├── Rate limiting — 5 msgs / 30 sec (PostgreSQL function)
├── Online presence — heartbeat every 60s
└── Trending topics — PostgreSQL word frequency
```

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui (base-ui)
- Supabase (Auth + DB + Realtime)
- Framer Motion
- Zustand
