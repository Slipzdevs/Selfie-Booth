import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHandler } from '../netlify/functions/shares.mjs'

function createMemoryStore() {
  const values = new Map()
  return {
    values,
    async get(key, { type } = {}) {
      const value = values.get(key)
      if (value === undefined) return null
      if (type === 'json') return structuredClone(value)
      if (type === 'arrayBuffer') {
        const bytes = value instanceof ArrayBuffer
          ? new Uint8Array(value)
          : new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      }
      return value
    },
    async set(key, value, { onlyIfNew = false } = {}) {
      if (onlyIfNew && values.has(key)) return { modified: false }
      values.set(key, value instanceof Uint8Array || value instanceof ArrayBuffer ? value : structuredClone(value))
      return { modified: true }
    },
    async setJSON(key, value, options) {
      return this.set(key, value, options)
    },
    async delete(key) {
      values.delete(key)
    },
  }
}

function request(path, method = 'GET', headers, body) {
  return new Request(`https://selfie-booth.example${path}`, { method, headers, body })
}

test('creates share links, accepts authorized files, lists and downloads them', async () => {
  const store = createMemoryStore()
  const handler = createHandler(() => store)
  const created = await handler(request('/api/shares', 'POST'), { ip: 'test-client' })
  assert.equal(created.status, 201)
  const { id, uploadKey } = await created.json()
  assert.match(id, /^[0-9a-f-]{36}$/i)

  const bytes = new Uint8Array([1, 2, 3, 4])
  const upload = await handler(request(
    `/api/shares/${id}/files/photo-1.jpg`,
    'PUT',
    { 'Content-Type': 'image/jpeg', 'X-Upload-Key': uploadKey },
    bytes,
  ), { ip: 'test-client' })
  assert.equal(upload.status, 201)

  const listing = await handler(request(`/api/shares/${id}`), { ip: 'test-client' })
  assert.equal(listing.status, 200)
  const details = await listing.json()
  assert.equal(details.files.length, 1)
  assert.equal(details.files[0].name, 'photo-1.jpg')

  const downloaded = await handler(request(`/api/shares/${id}/files/photo-1.jpg`), { ip: 'test-client' })
  assert.equal(downloaded.status, 200)
  assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()), bytes)
})

test('rejects unauthorized uploads and removes an expired share', async () => {
  const store = createMemoryStore()
  const handler = createHandler(() => store)
  const created = await handler(request('/api/shares', 'POST'), { ip: 'test-client' })
  const { id } = await created.json()

  const rejected = await handler(request(
    `/api/shares/${id}/files/photo-1.jpg`,
    'PUT',
    { 'Content-Type': 'image/jpeg' },
    new Uint8Array([1]),
  ), { ip: 'test-client' })
  assert.equal(rejected.status, 403)

  const metadataKey = `share/${id}`
  const metadata = store.values.get(metadataKey)
  metadata.files['photo-1.jpg'] = { name: 'photo-1.jpg', contentType: 'image/jpeg', size: 1 }
  store.values.set(metadataKey, metadata)
  store.values.set(`file/${id}/photo-1.jpg`, new Uint8Array([1]))
  metadata.expiresAt = Date.now() - 1

  const expired = await handler(request(`/api/shares/${id}`), { ip: 'test-client' })
  assert.equal(expired.status, 404)
  assert.equal(store.values.has(metadataKey), false)
  assert.equal(store.values.has(`file/${id}/photo-1.jpg`), false)
})
