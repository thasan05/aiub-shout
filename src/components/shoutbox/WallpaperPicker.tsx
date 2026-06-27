'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ImageOff } from 'lucide-react'
import { WALLPAPERS, useWallpaper } from '@/hooks/useWallpaper'

interface Props {
  open: boolean
  onClose: () => void
}

export default function WallpaperPicker({ open, onClose }: Props) {
  const { wallpaper, setWallpaper } = useWallpaper()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => window.addEventListener('mousedown', onClick), 0)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'oklch(0 0 0 / 0.5)' }}
        >
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-semibold">Chat Wallpaper</span>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'var(--muted-foreground)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid */}
            <div className="p-3 grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
              {/* No wallpaper option */}
              <button
                onClick={() => { setWallpaper(null); onClose() }}
                className="relative aspect-square rounded-xl overflow-hidden flex items-center justify-center transition-all"
                style={{
                  background: 'var(--surface-2)',
                  border: `2px solid ${!wallpaper ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                <ImageOff className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
                {!wallpaper && (
                  <div className="absolute inset-0 rounded-xl ring-2 ring-inset" style={{ ringColor: 'var(--primary)' }} />
                )}
              </button>

              {WALLPAPERS.map(id => (
                <button
                  key={id}
                  onClick={() => { setWallpaper(id); onClose() }}
                  className="relative aspect-square rounded-xl overflow-hidden transition-transform hover:scale-105 active:scale-95"
                  style={{ border: `2px solid ${wallpaper === id ? 'var(--primary)' : 'transparent'}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/themes/${id}.jpg`}
                    alt="wallpaper"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {wallpaper === id && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: 'oklch(0 0 0 / 0.25)' }}>
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--primary)' }} />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
