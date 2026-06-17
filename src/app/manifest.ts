import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AIUB Shout',
    short_name: 'AIUB Shout',
    description: 'Anonymous real-time campus chat for AIUB students',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#08080E',
    theme_color: '#6366F1',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
