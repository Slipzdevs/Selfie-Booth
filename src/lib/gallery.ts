const DB = 'snapstudio', STORE = 'strips'
export interface Saved { id: number; blob: Blob; created: number }

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (!('indexedDB' in window)) return rej(new Error('IndexedDB is unavailable'))
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error ?? new Error('Could not open storage'))
  })
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode)
    const r = fn(t.objectStore(STORE))
    t.oncomplete = () => { db.close(); res(r.result) }
    t.onerror = t.onabort = () => { db.close(); rej(t.error ?? new Error('Storage failed (quota?)')) }
  })
}
export const saveStrip = (blob: Blob) => tx('readwrite', (s) => s.add({ blob, created: Date.now() }))
export const deleteStrip = (id: number) => tx('readwrite', (s) => s.delete(id))
export const clearStrips = () => tx('readwrite', (s) => s.clear())
export async function listStrips(): Promise<Saved[]> {
  const all = await tx<Saved[]>('readonly', (s) => s.getAll())
  return all.filter((x) => x.blob instanceof Blob).sort((a, b) => b.created - a.created)
}
