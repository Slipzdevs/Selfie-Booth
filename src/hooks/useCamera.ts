import { useCallback, useEffect, useRef, useState } from 'react'

export type CamStatus = 'idle' | 'loading' | 'ready' | 'denied' | 'unavailable' | 'unsupported'

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const reqId = useRef(0)
  const [status, setStatus] = useState<CamStatus>('idle')

  const stop = useCallback(() => {
    reqId.current++ // invalidates any in-flight request
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const start = useCallback(async () => {
    if (streamRef.current) return // never open two streams
    if (!navigator.mediaDevices?.getUserMedia) return setStatus('unsupported')
    const id = ++reqId.current
    setStatus('loading')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false,
      })
      if (id !== reqId.current) return s.getTracks().forEach((t) => t.stop()) // stale
      streamRef.current = s
      if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play().catch(() => {}) }
      s.getVideoTracks()[0].onended = () => { stop(); setStatus('unavailable') }
      setStatus('ready')
    } catch (e) {
      if (id !== reqId.current) return
      const n = (e as DOMException).name
      setStatus(n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : 'unavailable')
    }
  }, [stop])

  useEffect(() => stop, [stop])
  return { videoRef, status, start, stop }
}
