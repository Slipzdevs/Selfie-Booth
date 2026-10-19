import { createContext, useContext, useState, type ReactNode } from 'react'
import { DEFAULT_DESIGN, type Design } from './lib/strip'

interface Session {
  photos: (Blob | null)[]
  setPhotos: (p: (Blob | null)[]) => void
  livePhotos: (Blob | null)[]
  setLivePhotos: (p: (Blob | null)[]) => void
  design: Design
  setDesign: (d: Design) => void
}
const Ctx = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<(Blob | null)[]>(Array(6).fill(null))
  const [livePhotos, setLivePhotos] = useState<(Blob | null)[]>(Array(6).fill(null))
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN)
  return <Ctx.Provider value={{ photos, setPhotos, livePhotos, setLivePhotos, design, setDesign }}>{children}</Ctx.Provider>
}
export function useSession() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useSession outside SessionProvider')
  return c
}
