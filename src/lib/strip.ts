export type Filter = 'none' | 'grayscale' | 'warm' | 'soft' | 'vintage' | 'cool' | 'vivid' | 'faded' | 'dramatic' | 'dreamy'
export interface StickerPlacement {
  frame: number
  x: number
  y: number
  sticker: string
}
export interface Design {
  template: string; frame: string; text: string
  filter: Filter; sticker: string; stickerPositions: StickerPlacement[]
  gap: number; caption: string; showDate: boolean
}
export const TEMPLATES: Record<string, { frame: string; text: string }> = {
  Clean: { frame: '#ffffff', text: '#19191f' },
  Editorial: { frame: '#f1e8d6', text: '#3b2f23' },
  Pop: { frame: '#ff5c70', text: '#ffffff' },
  Midnight: { frame: '#19191f', text: '#c7b8ff' },
  Blush: { frame: '#f8dfe3', text: '#713b4b' },
  Sage: { frame: '#dce8d5', text: '#354b37' },
  Sky: { frame: '#dcedf7', text: '#294a63' },
  Lavender: { frame: '#e9e1f5', text: '#493b62' },
  Butter: { frame: '#fff0c2', text: '#59471f' },
  Noir: { frame: '#262626', text: '#f5f1e8' },
}
export const FILTERS: Record<Filter, string> = {
  none: 'none',
  grayscale: 'grayscale(1)',
  warm: 'sepia(.35) saturate(1.3) hue-rotate(-10deg)',
  soft: 'contrast(.9) brightness(1.08) saturate(.9)',
  vintage: 'sepia(.6) contrast(.9) brightness(.95)',
  cool: 'saturate(.95) hue-rotate(12deg) brightness(1.02)',
  vivid: 'saturate(1.5) contrast(1.08)',
  faded: 'saturate(.7) contrast(.82) brightness(1.08)',
  dramatic: 'contrast(1.25) saturate(1.1) brightness(.92)',
  dreamy: 'contrast(.88) saturate(1.15) brightness(1.12)',
}
export const DEFAULT_DESIGN: Design = {
  template: 'Clean', ...TEMPLATES.Clean, filter: 'none', sticker: '', stickerPositions: [],
  gap: 24, caption: 'Selfie Booth', showDate: true,
}

const PW = 520, PH = 390, PAD = 40, FOOT = 140, QR_FOOT = 220, QR_SIZE = 160, COLS = 2
interface StripImage {
  source: CanvasImageSource
  width: number
  height: number
  close?: () => void
}

export function getStickerPlacement(x: number, y: number, count: number, gap: number): Omit<StickerPlacement, 'sticker'> | null {
  for (let frame = 0; frame < count; frame++) {
    const left = PAD + (frame % COLS) * (PW + gap)
    const top = PAD + Math.floor(frame / COLS) * (PH + gap)
    if (x >= left && x <= left + PW && y >= top && y <= top + PH) {
      return {
        frame,
        x: Math.max(0.08, Math.min(0.92, (x - left) / PW)),
        y: Math.max(0.08, Math.min(0.92, (y - top) / PH)),
      }
    }
  }
  return null
}

/** Draws the full strip (the same canvas is previewed and exported). */
export function renderStrip(canvas: HTMLCanvasElement, imgs: StripImage[], d: Design, qr?: HTMLImageElement) {
  const rows = Math.ceil(imgs.length / COLS)
  const footer = qr ? QR_FOOT : FOOT
  const W = PAD * 2 + PW * COLS + d.gap * (COLS - 1)
  const H = PAD * 2 + PH * rows + d.gap * (rows - 1) + footer
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available')
  ctx.fillStyle = d.frame; ctx.fillRect(0, 0, W, H)
  imgs.forEach((im, i) => {
    const x = PAD + (i % COLS) * (PW + d.gap)
    const y = PAD + Math.floor(i / COLS) * (PH + d.gap)
    const s = Math.max(PW / im.width, PH / im.height) // cover-crop, never stretch
    const sw = PW / s, sh = PH / s
    ctx.save()
    ctx.beginPath(); ctx.roundRect(x, y, PW, PH, 28); ctx.clip()
    ctx.filter = FILTERS[d.filter]
    ctx.drawImage(im.source, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, PW, PH)
    ctx.restore()
    for (const placement of d.stickerPositions) {
      if (placement.frame !== i) continue
      ctx.font = '64px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(placement.sticker, x + placement.x * PW, y + placement.y * PH)
    }
  })
  ctx.fillStyle = d.text; ctx.textAlign = 'center'
  const footerTop = H - PAD - footer
  const textCenter = qr ? (PAD + W - PAD - QR_SIZE - 24) / 2 : W / 2
  const fy = qr ? footerTop + 72 : H - PAD - FOOT / 2 + 10
  ctx.font = '600 56px system-ui, sans-serif'
  ctx.fillText(d.caption, textCenter, d.showDate ? fy : fy + 20)
  if (d.showDate) {
    ctx.font = '28px system-ui, sans-serif'
    ctx.fillText(new Date().toLocaleDateString(), textCenter, fy + (qr ? 42 : 52))
  }
  if (qr) {
    const x = W - PAD - QR_SIZE
    const y = H - PAD - QR_SIZE
    ctx.fillStyle = '#19191f'
    ctx.font = '600 18px system-ui, sans-serif'
    ctx.fillText('Scan to download', x + QR_SIZE / 2, footerTop + 31)
    ctx.drawImage(qr, x, y, QR_SIZE, QR_SIZE)
  }
}

export async function renderBlobs(canvas: HTMLCanvasElement, blobs: Blob[], d: Design, qrDataUrl?: string) {
  const images = await Promise.all(blobs.map(loadBlobImage))
  try {
    const qr = qrDataUrl ? await loadImage(qrDataUrl) : undefined
    renderStrip(canvas, images, d, qr)
  } finally {
    images.forEach((image) => image.close?.())
  }
}

function loadBlobImage(blob: Blob): Promise<StripImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error('Captured photo could not be decoded'))
        return
      }
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Captured photo could not be decoded'))
    }
    image.src = url
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load QR code image'))
    image.src = src
  })
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('PNG export failed'))), 'image/png'))
}

export async function downloadBlob(blob: Blob): Promise<void> {
  const filename = `selfie-booth-${new Date().toISOString().slice(0, 10)}.png`
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const file = new File([blob], filename, { type: blob.type || 'image/png' })
  if (isIOS && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Selfie Booth photo strip' })
    return
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
