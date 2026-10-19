import { useEffect, useState } from 'react'
import { Download, Film, Image as ImageIcon } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { getPhoneShare, type ShareInfo } from '../lib/sharing'

export default function Share() {
  const { id = '' } = useParams()
  const [share, setShare] = useState<ShareInfo | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    getPhoneShare(id).then((value) => {
      if (live) setShare(value)
    }).catch((reason: Error) => {
      if (live) setError(reason.message)
    })
    return () => { live = false }
  }, [id])

  return (
    <main className="mx-auto max-w-xl py-8">
      <section className="panel">
        <p className="text-sm font-semibold uppercase tracking-[.15em] text-coral">Selfie Booth</p>
        <h1 className="mt-2 text-4xl font-bold">Your photos are ready</h1>
        <p className="mt-3 text-ink/70">Tap a file to save it to this phone. Anyone with this link can download the files until it expires.</p>
        {error && <p role="alert" className="mt-6 rounded-xl bg-coral/10 p-4 text-coral">{error}</p>}
        {!share && !error && <p role="status" className="mt-6">Loading your files…</p>}
        {share && (
          <>
            <p className="mt-2 text-sm text-ink/60">Files will be deleted after {new Date(share.expiresAt).toLocaleString()}.</p>
            <ul className="mt-6 space-y-3">
              {share.files.map((file) => {
                const isVideo = file.contentType.startsWith('video/')
                return (
                  <li key={file.name}>
                    <a href={`/api/shares/${encodeURIComponent(id)}/files/${encodeURIComponent(file.name)}`} download
                      className="flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-mist/60 p-4 transition hover:bg-mist">
                      <span className="flex min-w-0 items-center gap-3">
                        {isVideo ? <Film className="shrink-0 text-coral" aria-hidden /> : <ImageIcon className="shrink-0 text-coral" aria-hidden />}
                        <span className="min-w-0">
                          <span className="block font-semibold">{isVideo ? 'Live clip' : 'Photo'} {file.name.match(/\d+/)?.[0]}</span>
                          <span className="block text-sm text-ink/60">{(file.size / 1024 / 1024).toFixed(1)} MB · {isVideo ? 'Video' : 'JPEG image'}</span>
                        </span>
                      </span>
                      <Download className="shrink-0" size={19} aria-label="Download" />
                    </a>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        <p className="mt-6 text-sm text-ink/60">Photos and clips are temporarily stored for transfer and automatically deleted when the link expires.</p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-coral">Made with Selfie Booth</Link>
      </section>
    </main>
  )
}
