import { Camera, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { recordLivePhoto } from '../lib/livePhoto'
import { FILTERS } from '../lib/strip'
import { useCamera } from '../hooks/useCamera'
import { useSession } from '../session'

const MSG: Record<string, string> = {
  denied: 'Camera permission was denied. Allow camera access in your browser settings, then retry.',
  unavailable: 'No camera is available or it was disconnected.',
  unsupported: 'This browser does not support camera access (HTTPS or localhost is required).',
}

export default function Booth() {
  const { photos, setPhotos, livePhotos, setLivePhotos, design } = useSession()
  const { videoRef, status, start, stop } = useCamera()
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [secs, setSecs] = useState(3)
  const [auto, setAuto] = useState(true)
  const [flash, setFlash] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const photoCount = photos.length
  const snapRef = useRef<(i: number) => void>(() => {})
  const nextSlotRef = useRef(0)
  const timer = useRef<number>(0)
  const busy = useRef(false)
  const session = useRef(0)
  const urls = useMemo(() => photos.map((p) => (p ? URL.createObjectURL(p) : null)), [photos])
  useEffect(() => () => urls.forEach((u) => u && URL.revokeObjectURL(u)), [urls])
  useEffect(() => () => { clearInterval(timer.current); session.current++ }, [])

  const filled = photos.filter(Boolean).length

  function snap(index: number) {
    if (busy.current || status !== 'ready') return
    busy.current = true; setCapturing(true); setError('')
    const isNextSlot = index === nextSlotRef.current
    const mine = ++session.current
    let n = secs; setCount(n)
    timer.current = window.setInterval(() => {
      n--
      if (n > 0) return setCount(n)
      clearInterval(timer.current); setCount(null)
      const v = videoRef.current
      if (mine !== session.current || !v || !v.videoWidth) { busy.current = false; setCapturing(false); return setError('Capture failed. Try again.') }
      const stream = v.srcObject
      if (!(stream instanceof MediaStream)) { busy.current = false; setCapturing(false); return setError('Camera stream is unavailable. Try again.') }
      const c = document.createElement('canvas')
      c.width = v.videoWidth; c.height = v.videoHeight
      const ctx = c.getContext('2d')!
      ctx.translate(c.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(v, 0, 0)
      c.toBlob((b) => {
        if (mine !== session.current) return
        if (!b) { busy.current = false; setCapturing(false); return setError('Capture failed. Try again.') }
        const next = [...photos]; next[index] = b; setPhotos(next)
        const clips = [...livePhotos]; clips[index] = null; setLivePhotos(clips)
        setFlash(true); setTimeout(() => setFlash(false), 180)
        recordLivePhoto(stream).then((clip) => {
          if (mine !== session.current) return
          const nextClips = [...clips]; nextClips[index] = clip; setLivePhotos(nextClips)
        }).catch((reason: Error) => {
          if (mine === session.current) setError(`Photo captured, but its live clip could not be recorded: ${reason.message}.`)
        }).finally(() => {
          if (mine !== session.current) return
          busy.current = false
          setCapturing(false)
          const nx = next.findIndex((p) => !p)
          if (auto && nx >= 0 && isNextSlot) setTimeout(() => mine === session.current && snapRef.current(nx), 900)
        })
      }, 'image/jpeg', 0.92)
    }, 1000)
  }
  function restart() {
    clearInterval(timer.current); session.current++; busy.current = false; setCount(null)
    setCapturing(false)
    setPhotos(Array(photoCount).fill(null))
    setLivePhotos(Array(photoCount).fill(null))
  }
  function changePhotoCount(value: number) {
    clearInterval(timer.current); session.current++; busy.current = false; setCount(null)
    setCapturing(false)
    setPhotos(Array(value).fill(null))
    setLivePhotos(Array(value).fill(null))
  }
  const nextSlot = photos.findIndex((p) => !p)
  nextSlotRef.current = nextSlot
  snapRef.current = snap

  return (
    <div className="grid gap-10 py-2 lg:grid-cols-[1fr_280px]">
      <div>
        <div className="relative aspect-square overflow-hidden grain rounded-[2rem] bg-ink shadow-lift ring-8 ring-white sm:aspect-[4/3]">
          <video ref={videoRef} playsInline muted style={{ filter: FILTERS[design.filter] }} className="h-full w-full -scale-x-100 object-cover" />
          {status !== 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-paper">
              {MSG[status] && <p role="alert">{MSG[status]}</p>}
              {status === 'loading' ? <p>Starting camera…</p> : (
                <button onClick={start} className="btn btn-coral">
                  <Camera size={18} aria-hidden /> {MSG[status] ? 'Retry camera' : 'Enable camera'}
                </button>
              )}
            </div>
          )}
          {flash && <div className="absolute inset-0 bg-white" />}
          {count && <div aria-live="assertive" className="absolute inset-0 flex items-center justify-center font-display text-[10rem] text-white drop-shadow-lg">{count}</div>}
        </div>
        {error && <p role="alert" className="mt-3 text-coral">{error}</p>}
        {capturing && count === null && <p role="status" className="mt-3 text-sm text-ink/65">Recording the short live clip…</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm">Photos <select value={photoCount} onChange={(e) => changePhotoCount(+e.target.value)} className="rounded-lg border border-ink/20 bg-white px-2 py-1"><option value={4}>4 frames</option><option value={6}>6 frames</option><option value={8}>8 frames</option></select></label>
          <label className="text-sm">Timer <select value={secs} onChange={(e) => setSecs(+e.target.value)} className="rounded-lg border border-ink/20 bg-white px-2 py-1"><option value={3}>3s</option><option value={5}>5s</option><option value={10}>10s</option></select></label>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto-capture all {photoCount}</label>
          <span className="font-mono text-sm">{String(Math.min(filled + 1, photoCount)).padStart(2, '0')} / {String(photoCount).padStart(2, '0')}</span>
          <button disabled={status !== 'ready' || nextSlot < 0 || count !== null || capturing} onClick={() => snap(nextSlot)}
            className="btn btn-ink">
            {count ? 'Get ready…' : nextSlot < 0 ? 'All photos captured' : 'Take photo'}
          </button>
          <button onClick={restart} className="btn btn-ghost"><RotateCcw size={16} aria-hidden /> Restart</button>
          {filled === photoCount && <Link to="/studio" onClick={stop} className="btn btn-coral">Continue to Studio</Link>}
      </div>
      </div>
      <ul className="grid grid-cols-2 content-start gap-3 self-start">
        {urls.map((u, i) => (
          <li key={i} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white p-1.5 shadow-lift">
            {u && <img src={u} alt={`Photo ${i + 1}`} style={{ filter: FILTERS[design.filter] }} className="h-full w-full object-cover" />}
            <span className="absolute left-2 top-2 rounded bg-paper/90 px-2 text-xs">0{i + 1}</span>
            {u && <button disabled={status !== 'ready' || count !== null || capturing} onClick={() => snap(i)} className="absolute bottom-2 right-2 rounded-full bg-paper px-3 py-1 text-xs disabled:opacity-40">Retake</button>}
          </li>
        ))}
      </ul>
    </div>
  )
}
