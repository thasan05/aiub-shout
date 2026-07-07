import path from 'path'
import type { NextConfig } from 'next'

// Content Security Policy
// - script-src 'unsafe-inline': required for Next.js inline theme script
// - style-src 'unsafe-inline': required for Framer Motion inline styles
// - img-src https:: needed for OG preview images from arbitrary HTTPS sources
// - connect-src: restricts fetch/XHR/WS to self and Supabase only
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "media-src 'none'",
  "object-src 'none'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },

  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },
}

export default nextConfig
