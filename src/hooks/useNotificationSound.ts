'use client'

import { useRef, useEffect, useCallback } from 'react'

const LS_KEY = 'aiubshout_sound'

export function getSound(): boolean {
  if (typeof window === 'undefined') return true
  const v = localStorage.getItem(LS_KEY)
  return v === null ? true : v === '1'
}

export function setSound(on: boolean) {
  localStorage.setItem(LS_KEY, on ? '1' : '0')
}

function createPing(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08)
  gain.gain.setValueAtTime(0.18, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.26)
}

export function useNotificationSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    return () => { ctxRef.current?.close() }
  }, [])

  const ping = useCallback(() => {
    if (!getSound()) return
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().then(() => createPing(ctxRef.current!))
    } else {
      createPing(ctxRef.current)
    }
  }, [])

  return { ping }
}
