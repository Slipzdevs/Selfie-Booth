import { getStore } from '@netlify/blobs'

const STORE_NAME = 'selfie-booth-shares'

export const config = { schedule: '15 * * * *' }

export default async function cleanupShares() {
  const store = getStore(STORE_NAME, { consistency: 'strong' })
  for await (const page of store.list({ prefix: 'share/', paginate: true })) {
    for (const entry of page.blobs) {
      const metadata = await store.get(entry.key, { type: 'json', consistency: 'strong' })
      if (!metadata || metadata.expiresAt > Date.now()) continue
      await Promise.all(Object.keys(metadata.files || {}).map((name) => store.delete(`file/${metadata.id}/${name}`)))
      await store.delete(entry.key)
    }
  }
  for await (const page of store.list({ prefix: 'rate/', paginate: true })) {
    for (const entry of page.blobs) {
      const limit = await store.get(entry.key, { type: 'json', consistency: 'strong' })
      if (limit && limit.resetAt <= Date.now()) await store.delete(entry.key)
    }
  }
}
