'use client'

import { useState, useEffect } from 'react'

export const WALLPAPERS = [
  '9ec0bbf510e0b62b898c9f1817029ceb',
  'e6b9aef86f6ad184abf312afa41e31eb',
  'a3927ff2e0ecdbed7c48d026813dbe1d',
  'f06984cd5b8a65ae80a4184d4131b4da',
  'f851edd1bfb65e65958257e65957aec9',
  '51a00dd8f8c3a044e3788159b73d1a3b',
  'c484e37a2b08361fcca67646d40be45a',
  '19c9112badd89378b49c76c2949ec6c1',
  '9f38396a14e6685b40cab4b881da8f79',
  '03af7963c02b06ddd2b27a7ee8ff0095',
  '0a7a286635f8e55f9770dff99ef8632a',
  '497c7ce9f791c1bb3365727174936840',
  '460b86418c8ce37b678cb06095373d56',
  'd57e20e3f6b579d93a82261723003194',
  '8b353fee62d6eef4cac3a979513a2661',
  '0eed2112a003ebb88462aa5f75915357',
  '3a03a00230424adb1680b2e07b10091d',
] as const

const LS_KEY = 'aiubshout_wallpaper'

export function useWallpaper() {
  const [wallpaper, setWallpaperState] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) setWallpaperState(saved)
  }, [])

  function setWallpaper(id: string | null) {
    setWallpaperState(id)
    if (id) localStorage.setItem(LS_KEY, id)
    else localStorage.removeItem(LS_KEY)
  }

  const wallpaperUrl = wallpaper ? `/themes/${wallpaper}.jpg` : null

  return { wallpaper, wallpaperUrl, setWallpaper }
}
