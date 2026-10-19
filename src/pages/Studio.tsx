import { useEffect, useRef, useState, type MouseEvent } from 'react'
import QRCode from 'qrcode'
import { Link } from 'react-router'
import { saveStrip } from '../lib/gallery'
import { canvasToPng, DEFAULT_DESIGN, downloadBlob, FILTERS, getStickerPlacement, renderBlobs, TEMPLATES, type Filter } from '../lib/strip'
import { useSession } from '../session'

const STICKERS = [
  ['✨', 'Sparkles'], ['❤️', 'Red heart'], ['💖', 'Sparkling heart'], ['🥰', 'Smiling face with hearts'],
  ['😎', 'Smiling face with sunglasses'], ['😂', 'Face with tears of joy'], ['🎀', 'Ribbon'],
  ['⭐', 'Star'], ['🌸', 'Cherry blossom'], ['🦋', 'Butterfly'], ['🫶', 'Heart hands'],
  ['🍒', 'Cherries'], ['🎞️', 'Film frames'], ['☁️', 'Cloud'], ['🌈', 'Rainbow'], ['', 'No sticker'],
] as const

export default function Studio() {
  const { photos, setPhotos, livePhotos, setLivePhotos, design: d, setDesign, shareUrl, setShareUrl } = useSession()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [rendered, setRendered] = useState<{ photos: typeof photos; design: typeof d; shareUrl: string } | null>(null)
  const ready = photos.length > 0 && photos.every(Boolean)
  const previewReady = rendered?.photos === photos && rendered.design === d && rendered.shareUrl === shareUrl

  useEffect(() => {
    if (!ready || !canvas.current) return
    let live = true
    const target = canvas.current
    const render = async () => {
      const qr = shareUrl
        ? await QRCode.toDataURL(shareUrl, { width: 240, margin: 2, errorCorrectionLevel: 'H' })
        : undefined
      if (live) {
        const preview = document.createElement('canvas')
        await renderBlobs(preview, photos as Blob[], d, qr)
        if (!live) return
        const context = target.getContext('2d')
        if (!context) throw new Error('Canvas 2D is not available')
        target.width = preview.width
        target.height = preview.height
        context.drawImage(preview, 0, 0)
        setRendered({ photos, design: d, shareUrl })
      }
    }
    render().catch((reason: unknown) => {
      if (live) {
        setRendered(null)
        setMsg(`Could not render the strip: ${reason instanceof Error ? reason.message : String(reason)}`)
      }
    })
    return () => { live = false }
  }, [photos, d, ready, shareUrl])

  const set = (p: Partial<typeof d>) => setDesign({ ...d, ...p })
  function placeSticker(event: MouseEvent<HTMLCanvasElement>) {
    if (!d.sticker) {
      setMsg('Choose a sticker first, then click a photo to place it.')
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) * event.currentTarget.width / bounds.width
    const y = (event.clientY - bounds.top) * event.currentTarget.height / bounds.height
    const placement = getStickerPlacement(x, y, photos.length, d.gap)
    if (!placement) {
      setMsg('Click inside a photo to place the sticker.')
      return
    }
    set({
      stickerPositions: [...d.stickerPositions, { ...placement, sticker: d.sticker }],
    })
    setMsg(`Sticker added to photo ${placement.frame + 1}.`)
  }
  async function act(kind: 'download' | 'save') {
    if (!canvas.current || busy || !previewReady) return
    setBusy(true); setMsg('')
    try {
      const png = await canvasToPng(canvas.current)
      if (kind === 'download') await downloadBlob(png)
      else await saveStrip(png)
      setMsg(kind === 'save'
        ? 'Saved to your gallery. Your photos and design are still here until you clear them.'
        : 'Download started. Your photos and design are still here until you clear them.')
    } catch (reason) {
      if (kind === 'download' && reason instanceof Error && reason.name === 'AbortError') setMsg('Download cancelled.')
      else setMsg(`${kind === 'save' ? 'Save' : 'Download'} failed: ${reason instanceof Error ? reason.message : String(reason)}. Please try again.`)
    }
    finally { setBusy(false) }
  }
  function clearPhotos() {
    if (!window.confirm('Clear all captured photos and reset the strip design?')) return
    setPhotos(Array(photos.length).fill(null))
    setLivePhotos(Array(livePhotos.length).fill(null))
    setDesign(DEFAULT_DESIGN)
    setShareUrl('')
    setMsg('Captured photos and strip design cleared.')
  }
  const field = 'mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2'
  return (
    <div className="grid gap-8 py-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col items-center gap-3 rounded-[2rem] bg-mist p-8">
        {ready ? (
          <>
            <p className="text-center text-sm text-ink/70">
              Choose a sticker, then click a photo to add it. Repeat to add different stickers.
              {shareUrl ? ' The QR code is added at the bottom of the strip and opens your phone downloads.' : ' Use “Share to phone” in the booth to add a scannable QR code at the bottom of the strip.'}
            </p>
            {!previewReady && <p role="status" className="text-sm text-ink/60">Updating photo strip…</p>}
            <canvas ref={canvas} onClick={placeSticker} aria-label="Photo strip preview. Click a photo to add the selected sticker." className="max-h-[80vh] w-auto max-w-full cursor-crosshair shadow-2xl" />
          </>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
            <div>
              <h1 className="text-4xl">Set up your photo strip</h1>
              <p className="mt-2 max-w-md text-ink/70">Choose a frame, filter, and sticker before your photos. After capturing, click each photo to place the selected sticker where you want it.</p>
              {d.sticker && <p className="mt-2 text-sm">Selected sticker: <span className="text-xl">{d.sticker}</span></p>}
            </div>
            <Link to="/booth" className="btn btn-coral">Continue to Photo Booth</Link>
          </div>
        )}
      </div>
      <div className="panel space-y-5 self-start lg:sticky lg:top-24">
        <fieldset><legend className="font-medium">Template</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Object.entries(TEMPLATES).map(([n, t]) => (
              <button key={n} aria-pressed={d.template === n} onClick={() => set({ template: n, ...t })}
                className={`rounded-xl border-2 px-3 py-2 ${d.template === n ? 'border-coral bg-coral/10 font-semibold' : 'border-transparent bg-mist hover:bg-mist/70'}`}>
                {d.template === n ? '✓ ' : ''}{n}
              </button>))}
          </div></fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label>Frame<input type="color" value={d.frame} onChange={(e) => set({ frame: e.target.value })} className={field} /></label>
          <label>Text<input type="color" value={d.text} onChange={(e) => set({ text: e.target.value })} className={field} /></label>
        </div>
        <fieldset><legend className="font-medium">Filter</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(FILTERS) as Filter[]).map((f) => (
              <button key={f} aria-pressed={d.filter === f} onClick={() => set({ filter: f })}
                className={`min-h-10 rounded-full px-3 py-2 text-sm capitalize ${d.filter === f ? 'bg-ink text-paper' : 'bg-mist'}`}>{d.filter === f ? '✓ ' : ''}{f}</button>))}
          </div></fieldset>
        <fieldset><legend className="font-medium">Stickers</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {STICKERS.map(([sticker, label]) => (
              <button key={label} aria-pressed={d.sticker === sticker} aria-label={label} title={label} onClick={() => set({ sticker })}
                className={`size-11 rounded-xl text-xl ${d.sticker === sticker ? 'bg-coral/20 ring-2 ring-coral' : 'bg-mist'}`}>{sticker || '∅'}</button>))}
          </div></fieldset>
          <button disabled={d.stickerPositions.length === 0} onClick={() => set({ stickerPositions: [] })} className="rounded-full bg-mist px-3 py-2 text-sm disabled:opacity-50">
            Remove placed stickers ({d.stickerPositions.length})
          </button>
        <label className="block">Spacing: {d.gap}px
          <input type="range" min={0} max={60} value={d.gap} onChange={(e) => set({ gap: +e.target.value })} className="w-full" /></label>
        <label className="block">Caption<input value={d.caption} maxLength={30} onChange={(e) => set({ caption: e.target.value })} className={field} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={d.showDate} onChange={(e) => set({ showDate: e.target.checked })} /> Show date</label>
        <div className="flex flex-wrap gap-2">
          <button disabled={!ready || !previewReady || busy} onClick={() => act('download')} className="btn btn-coral">{busy ? 'Working…' : 'Download PNG'}</button>
          <button disabled={!ready || !previewReady || busy} onClick={() => act('save')} className="btn btn-ink">Save to gallery</button>
          <button disabled={!photos.some(Boolean) || busy} onClick={clearPhotos} className="btn btn-ghost">Clear photos</button>
          <button onClick={() => setDesign(DEFAULT_DESIGN)} className="btn btn-ghost">Reset</button>
          <Link to="/booth" className="btn btn-ghost">Back to booth</Link>
        </div>
        {msg && <p role="status" className="text-sm">{msg}</p>}
      </div>
    </div>
  )
}
