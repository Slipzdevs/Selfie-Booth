const SCENES = [
  ['#ffb3a7', '#ff5c70', '#fff1ec'], ['#c7b8ff', '#7b61ff', '#efeaff'],
  ['#ffe1a8', '#ff9f5c', '#fff6e5'], ['#a8e6d9', '#2fae97', '#e8fbf6'],
]
/** Original illustrated "portrait" used as sample photo (no remote images). */
export function PhotoArt({ i = 0 }: { i?: number }) {
  const [a, b, c] = SCENES[i % 4]
  const id = `g${i % 4}`
  return (
    <svg viewBox="0 0 400 300" className="block h-full w-full" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c} /><stop offset="1" stopColor={a} /></linearGradient></defs>
      <rect width="400" height="300" fill={`url(#${id})`} />
      <circle cx={90 + (i % 3) * 110} cy="80" r="46" fill={b} opacity=".35" />
      <path d="M95 300c8-70 50-96 105-96s97 26 105 96z" fill={b} />
      <circle cx="200" cy="140" r="46" fill="#19191f" opacity=".88" />
      <path d="M156 128c8-34 80-40 90 0-30-14-60-14-90 0z" fill="#19191f" />
    </svg>
  )
}

interface StripProps { frame: string; text: string; caption: string; offset?: number; className?: string; small?: boolean }
export function MiniStrip({ frame, text, caption, offset = 0, className = '', small }: StripProps) {
  return (
    <div className={`relative flex flex-col gap-2 rounded-md p-3 shadow-lift ${small ? 'w-28' : 'w-44 sm:w-52'} ${className}`} style={{ background: frame, color: text }}>
      {[0, 1, 2, 3].map((n) => <div key={n} className="aspect-[4/3] overflow-hidden rounded-[3px]"><PhotoArt i={n + offset} /></div>)}
      <p className={`text-center font-display ${small ? 'text-sm' : 'text-xl'} leading-none pt-1 pb-0.5`}>{caption}</p>
    </div>
  )
}
