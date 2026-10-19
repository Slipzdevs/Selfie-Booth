import { Camera } from 'lucide-react'
import { NavLink, Route, Routes } from 'react-router'
import Booth from './pages/Booth'
import Gallery from './pages/Gallery'
import Home from './pages/Home'
import Share from './pages/Share'
import Studio from './pages/Studio'

const links = [['/', 'Home'], ['/booth', 'Photo Booth'], ['/studio', 'Templates'], ['/gallery', 'Gallery']]
const copyrightYear = new Date().getFullYear()

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-6xl flex-col items-stretch gap-2 rounded-3xl border border-ink/10 bg-paper/80 px-3 py-3 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:px-6">
        <NavLink to="/" className="flex items-center justify-center gap-2 whitespace-nowrap font-display text-xl sm:justify-start sm:text-2xl">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-coral text-white"><Camera size={16} aria-hidden /></span> Selfie Booth
        </NavLink>
        <nav aria-label="Main" className="flex w-full items-center justify-between gap-1 text-xs sm:w-auto sm:justify-center sm:gap-1 sm:text-sm">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} end
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-2 py-2 text-center font-medium transition-colors sm:px-3 ${isActive ? 'bg-ink text-paper' : 'hover:bg-mist'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 pb-12 pt-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/booth" element={<Booth />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/share/:id" element={<Share />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
      <footer className="mt-auto border-t border-ink/10 bg-white/75">
        <div className="mx-auto w-full max-w-6xl px-5 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.3fr_.8fr_1fr]">
            <div>
              <NavLink to="/" className="inline-flex items-center gap-2 font-display text-2xl font-semibold text-ink">
                <span className="grid size-9 place-items-center rounded-full bg-coral text-white"><Camera size={17} aria-hidden /></span>
                Selfie Booth
              </NavLink>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink/65">
                A simple, private photo booth for turning little moments into keepsakes.
              </p>
            </div>
            <nav aria-label="Footer" className="flex flex-col items-start gap-2">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-ink">Explore</h2>
              {links.map(([to, label]) => (
                <NavLink key={to} to={to} end className="text-sm text-ink/65 transition-colors hover:text-coral">{label}</NavLink>
              ))}
            </nav>
            <div className="rounded-2xl border border-coral/20 bg-coral/5 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-coral">developed by</p>
              <p className="mt-1 text-lg font-bold text-ink">NGORN SIVGECH</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">
                Independent developer building thoughtful tools for capturing and keeping memories.
              </p>
              <a
                href="https://github.com/Slipzdevs"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white/70 px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-coral/30 hover:bg-white hover:text-coral"
              >
                <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
                  <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.76-1.32-3.76-1.32-.5-1.29-1.24-1.63-1.24-1.63-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1 1.96-.76 2.43-1.37.1-.72.4-1.2.72-1.48-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.06 1.15a10.62 10.62 0 0 1 5.57 0c2.12-1.45 3.06-1.15 3.06-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3 0 4.29-2.62 5.24-5.11 5.52.4.35.76 1.03.76 2.08v3.35c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
                </svg>
                <span>github.com/Slipzdevs</span>
                <span className="text-ink/50" aria-hidden="true">↗</span>
              </a>
        
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-ink/10 pt-5 text-xs text-ink/55 sm:flex-row sm:items-center sm:justify-between">
            <p>© {copyrightYear} NGORN SIVGECH. All rights reserved.</p>
            <p>Photos stay on your device and are never uploaded.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
