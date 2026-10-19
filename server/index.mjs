import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')
const uploadDir = resolve(process.env.UPLOAD_DIR || join(root, 'uploads'))
const port = Number(process.env.PORT || 3000)
const retentionMs = Number(process.env.SHARE_TTL_MS || 24 * 60 * 60 * 1000)
const maxFileBytes = 16 * 1024 * 1024
const maxShareBytes = 80 * 1024 * 1024
const maxCreatesPerHour = 20
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const photoPattern = /^photo-[1-8]\.jpg$/
const videoPattern = /^live-[1-8]\.(webm|mp4)$/
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}
const createLimits = new Map()

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.')
if (!Number.isSafeInteger(retentionMs) || retentionMs <= 0) throw new Error('SHARE_TTL_MS must be a positive number of milliseconds.')

function json(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(JSON.stringify(value))
}

function sameSecret(actual, expected) {
  if (typeof actual !== 'string' || typeof expected !== 'string') return false
  const a = Buffer.from(actual)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function streamFile(path, res) {
  const stream = createReadStream(path)
  stream.on('error', (error) => {
    console.error(`Could not read temporary/static file ${path}:`, error)
    if (res.headersSent) res.destroy(error)
    else json(res, 500, { error: 'The file could not be read.' })
  })
  stream.pipe(res)
}

async function readShare(id) {
  if (!uuidPattern.test(id)) return null
  const folder = join(uploadDir, id)
  let metadata
  try {
    metadata = JSON.parse(await readFile(join(folder, 'share.json'), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  if (metadata.expiresAt <= Date.now()) {
    await rm(folder, { recursive: true, force: true })
    return null
  }
  return { folder, metadata }
}

async function cleanupExpired() {
  await mkdir(uploadDir, { recursive: true })
  for (const entry of await readdir(uploadDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !uuidPattern.test(entry.name)) continue
    try {
      await readShare(entry.name)
    } catch (error) {
      console.error(`Could not check temporary share ${entry.name}:`, error)
    }
  }
}

function checkCreateRate(req) {
  const address = req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const current = createLimits.get(address)
  const limit = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + 60 * 60 * 1000 }
    : current
  limit.count++
  createLimits.set(address, limit)
  if (limit.count > maxCreatesPerHour) throw new HttpError(429, 'Too many share links were created. Try again later.')
}

async function createShare(req, res) {
  checkCreateRate(req)
  const id = randomUUID()
  const uploadKey = randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + retentionMs
  const folder = join(uploadDir, id)
  await mkdir(folder, { recursive: true })
  await writeFile(join(folder, 'share.json'), JSON.stringify({
    id,
    uploadKey,
    createdAt: Date.now(),
    expiresAt,
    files: {},
  }), { flag: 'wx' })
  json(res, 201, { id, uploadKey, expiresAt })
}

async function writeUpload(req, target, maxBytes) {
  const declaredSize = Number(req.headers['content-length'] || 0)
  if (declaredSize > maxBytes) throw new HttpError(413, 'This file is too large to share.')
  const temporary = `${target}.${randomUUID()}.upload`
  let size = 0
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      size += chunk.length
      if (size > maxBytes) callback(new HttpError(413, 'This file is too large to share.'))
      else callback(null, chunk)
    },
  })
  try {
    await pipeline(req, limiter, createWriteStream(temporary, { flags: 'wx' }))
    if (size === 0) throw new HttpError(400, 'The uploaded file is empty.')
    await rename(temporary, target)
    return size
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
}

async function uploadFile(req, res, id, name) {
  const share = await readShare(id)
  if (!share) throw new HttpError(404, 'This share link has expired or does not exist.')
  if (!sameSecret(req.headers['x-upload-key'], share.metadata.uploadKey)) {
    throw new HttpError(403, 'Upload authorization failed.')
  }

  const isPhoto = photoPattern.test(name)
  const isVideo = videoPattern.test(name)
  if (!isPhoto && !isVideo) throw new HttpError(400, 'Unsupported file name.')
  const contentType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase()
  if ((isPhoto && contentType !== 'image/jpeg') ||
      (isVideo && !['video/webm', 'video/mp4'].includes(contentType))) {
    throw new HttpError(415, 'Unsupported file type.')
  }
  if (share.metadata.files[name]) throw new HttpError(409, 'This file has already been uploaded.')

  const usedBytes = Object.values(share.metadata.files).reduce((sum, file) => sum + file.size, 0)
  if (usedBytes >= maxShareBytes) throw new HttpError(413, 'The share has reached its storage limit.')
  const size = await writeUpload(req, join(share.folder, name), Math.min(maxFileBytes, maxShareBytes - usedBytes))
  share.metadata.files[name] = { name, contentType, size }
  await writeFile(join(share.folder, 'share.json'), JSON.stringify(share.metadata))
  json(res, 201, { name, size })
}

async function getShare(res, id) {
  const share = await readShare(id)
  if (!share) throw new HttpError(404, 'This share link has expired or does not exist.')
  json(res, 200, {
    id,
    expiresAt: share.metadata.expiresAt,
    files: Object.values(share.metadata.files).sort((a, b) => a.name.localeCompare(b.name)),
  })
}

async function deleteShare(req, res, id) {
  const share = await readShare(id)
  if (!share) throw new HttpError(404, 'This share link has expired or does not exist.')
  if (!sameSecret(req.headers['x-upload-key'], share.metadata.uploadKey)) {
    throw new HttpError(403, 'Share deletion authorization failed.')
  }
  await rm(share.folder, { recursive: true, force: true })
  res.writeHead(204, { 'Cache-Control': 'no-store' })
  res.end()
}

async function downloadFile(res, id, name) {
  const share = await readShare(id)
  const file = share?.metadata.files[name]
  if (!share || !file || (!photoPattern.test(name) && !videoPattern.test(name))) {
    throw new HttpError(404, 'This file has expired or does not exist.')
  }
  const path = join(share.folder, name)
  const info = await stat(path)
  res.writeHead(200, {
    'Content-Type': file.contentType,
    'Content-Length': info.size,
    'Content-Disposition': `attachment; filename="${name}"`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  streamFile(path, res)
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/shares' && req.method === 'POST') return createShare(req, res)
  let match = url.pathname.match(/^\/api\/shares\/([^/]+)$/)
  if (match && req.method === 'GET') return getShare(res, match[1])
  if (match && req.method === 'DELETE') return deleteShare(req, res, match[1])
  match = url.pathname.match(/^\/api\/shares\/([^/]+)\/files\/([^/]+)$/)
  if (match) {
    const id = decodeURIComponent(match[1])
    const name = decodeURIComponent(match[2])
    if (req.method === 'PUT') return uploadFile(req, res, id, name)
    if (req.method === 'GET') return downloadFile(res, id, name)
  }
  throw new HttpError(404, 'API endpoint not found.')
}

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' })
    return res.end()
  }
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    throw new HttpError(400, 'Invalid URL path.')
  }
  const requested = resolve(distDir, `.${decoded === '/' ? '/index.html' : decoded}`)
  if (!requested.startsWith(`${distDir}${sep}`) && requested !== join(distDir, 'index.html')) {
    throw new HttpError(400, 'Invalid URL path.')
  }
  let filePath = requested
  try {
    if (!(await stat(filePath)).isFile()) filePath = join(distDir, 'index.html')
  } catch (error) {
    if (error.code === 'ENOENT') {
      if (decoded.startsWith('/assets/')) throw new HttpError(404, 'File not found.')
      filePath = join(distDir, 'index.html')
    } else {
      throw error
    }
  }
  let info
  try {
    info = await stat(filePath)
  } catch {
    throw new HttpError(503, 'Build the app before starting the production server.')
  }
  res.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
    'Content-Length': info.size,
    'X-Content-Type-Options': 'nosniff',
  })
  if (req.method === 'HEAD') return res.end()
  streamFile(filePath, res)
}

await mkdir(uploadDir, { recursive: true })
await cleanupExpired()
const cleanupTimer = setInterval(() => {
  cleanupExpired().catch((error) => console.error('Could not clean expired shares:', error))
  for (const [address, limit] of createLimits) {
    if (limit.resetAt <= Date.now()) createLimits.delete(address)
  }
}, 15 * 60 * 1000)
cleanupTimer.unref()

createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost')
  const operation = url.pathname.startsWith('/api/')
    ? handleApi(req, res, url)
    : serveStatic(req, res, url.pathname)
  operation.catch((error) => {
    if (error instanceof HttpError) return json(res, error.status, { error: error.message })
    console.error('Request failed:', error)
    json(res, 500, { error: 'The request could not be completed.' })
  })
}).listen(port, '0.0.0.0', () => {
  console.log(`Selfie Booth server listening on port ${port}; temporary files expire after ${retentionMs} ms.`)
})
