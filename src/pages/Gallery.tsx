import { useCallback, useEffect, useState } from 'react'
import { clearStrips, deleteStrip, listStrips, type Saved } from '../lib/gallery'
import { downloadBlob } from '../lib/strip'

export default function Gallery() {
  const [items, setItems] = useState<(Saved & { url: string })[]>([])
  const [err, setErr] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const l = await listStrips()
      setItems((old) => { old.forEach((o) => URL.revokeObjectURL(o.url)); return l.map((s) => ({ ...s, url: URL.createObjectURL(s.blob) })) })
      setErr('')
    } catch (e) { setErr((e as Error).message) }
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => () => items.forEach((o) => URL.revokeObjectURL(o.url)), [items])

  const run = (f: () => Promise<unknown>) => f().then(load).catch((e: Error) => setErr(e.message))
  const sel = items.find((i) => i.id === open)
  return (
    <div className="py-6">
      <h1 className="text-6xl">Gallery</h1>
      <p className="mt-2 text-ink/70">Gallery strips are stored only in this browser on this device.</p>
      {err && <p role="alert" className="mt-3 text-coral">{err}</p>}
      {items.length === 0 && !err && <p className="mt-10 rounded-3xl bg-mist p-10 text-center">No saved strips yet. Make one in the Studio.</p>}
      {items.length > 0 && <button className="mt-4 text-sm underline" onClick={() => confirm('Delete all saved strips?') && run(clearStrips)}>Clear all</button>}
      <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((s) => (
          <li key={s.id} className="panel !p-3">
            <button onClick={() => setOpen(s.id)} aria-label="Open strip"><img src={s.url} alt={`Strip saved ${new Date(s.created).toLocaleString()}`} className="max-h-72 w-full object-contain" /></button>
            <button className="mt-2 text-sm underline" onClick={() => run(() => deleteStrip(s.id))}>Delete</button>
          </li>))}
      </ul>
      {sel && (
        <div role="dialog" aria-label="Saved strip" className="fixed inset-0 z-10 flex flex-col items-center gap-3 overflow-auto bg-ink/90 p-6">
          <img src={sel.url} alt="Saved strip" className="max-h-[80vh] object-contain" />
          <div className="flex gap-3"><button onClick={() => downloadBlob(sel.blob)} className="rounded-full bg-coral px-5 py-2 text-white">Download</button>
            <button onClick={() => setOpen(null)} className="rounded-full bg-paper px-5 py-2">Close</button></div>
        </div>)}
    </div>
  )
}
