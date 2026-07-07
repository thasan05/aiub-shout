import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { THEME_SCRIPT } from '@/lib/theme'
import ErrorBoundary from '@/components/ErrorBoundary'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AIUB Shout — Campus Chat',
  description: 'Anonymous real-time shoutbox for AIUB students. Post quick messages, react, reply, and stay connected with your campus.',
  keywords: ['AIUB', 'chat', 'shoutbox', 'students', 'anonymous', 'campus'],
  applicationName: 'AIUB Shout',
  appleWebApp: {
    capable: true,
    title: 'AIUB Shout',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Makes keyboard resize the viewport on Android Chrome
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#08080E' },
    { media: '(prefers-color-scheme: light)', color: '#F5F5F8' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runs before paint to prevent FOUC. React 19 warns about inline scripts — expected, harmless. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
            },
          }}
        />
      </body>
    </html>
  )
}
