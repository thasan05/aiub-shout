'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

interface OGData {
  title?: string
  description?: string
  image?: string
  siteName?: string
  url: string
}

const cache = new Map<string, OGData | null>()

export default function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<OGData | null>(cache.get(url) ?? null)
  const [loaded, setLoaded] = useState(cache.has(url))

  useEffect(() => {
    if (cache.has(url)) return
    const controller = new AbortController()
    fetch(`/api/og?url=${encodeURIComponent(url)}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then((d: OGData | null) => {
        const hasContent = d && (d.title || d.description || d.image)
        const result = hasContent ? d : null
        cache.set(url, result)
        setData(result)
        setLoaded(true)
      })
      .catch(() => { cache.set(url, null); setLoaded(true) })
    return () => controller.abort()
  }, [url])

  if (!loaded || !data) return null
  if (!data.title && !data.description && !data.image) return null

  const host = (() => { try { return new URL(url).hostname.replace('www.', '') } catch { return url } })()

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={e => e.stopPropagation()}
      className="flex gap-3 mt-1.5 rounded-xl overflow-hidden max-w-xs group/preview"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        textDecoration: 'none',
      }}
    >
      {data.image && (
        <div className="w-16 h-16 shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.image}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}
      <div className="flex-1 py-2 pr-2 min-w-0" style={{ paddingLeft: data.image ? 0 : 10 }}>
        <p className="text-xs font-medium truncate leading-tight group-hover/preview:underline"
          style={{ color: 'var(--foreground)' }}>
          {data.title ?? host}
        </p>
        {data.description && (
          <p className="text-[11px] mt-0.5 line-clamp-2 leading-tight"
            style={{ color: 'var(--muted-foreground)' }}>
            {data.description}
          </p>
        )}
        <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
          <ExternalLink className="w-2.5 h-2.5" />
          {data.siteName ?? host}
        </p>
      </div>
    </motion.a>
  )
}
