export interface SharedFile {
  name: string
  contentType: string
  size: number
}

export interface ShareInfo {
  id: string
  expiresAt: number
  files: SharedFile[]
}

export interface CreatedShare {
  url: string
  expiresAt: number
}

async function responseError(response: Response): Promise<Error> {
  const contentType = response.headers.get('content-type') || ''
  const message = contentType.includes('application/json')
    ? (await response.json() as { error?: string }).error
    : await response.text()
  return new Error(message || `Share request failed (${response.status})`)
}

export async function createPhoneShare(photos: Blob[], livePhotos: (Blob | null)[]): Promise<CreatedShare> {
  const create = await fetch('/api/shares', { method: 'POST' })
  if (!create.ok) throw await responseError(create)
  const { id, uploadKey, expiresAt } = await create.json() as { id: string; uploadKey: string; expiresAt: number }

  const files: { name: string; blob: Blob; contentType: string }[] = []
  photos.forEach((photo, index) => {
    files.push({ name: `photo-${index + 1}.jpg`, blob: photo, contentType: 'image/jpeg' })
    const livePhoto = livePhotos[index]
    if (livePhoto) {
      const extension = livePhoto.type.includes('mp4') ? 'mp4' : 'webm'
      files.push({ name: `live-${index + 1}.${extension}`, blob: livePhoto, contentType: livePhoto.type || `video/${extension}` })
    }
  })

  try {
    for (const file of files) {
      const upload = await fetch(`/api/shares/${id}/files/${file.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': file.contentType, 'X-Upload-Key': uploadKey },
        body: file.blob,
      })
      if (!upload.ok) throw await responseError(upload)
    }
  } catch (error) {
    try {
      const remove = await fetch(`/api/shares/${id}`, {
        method: 'DELETE',
        headers: { 'X-Upload-Key': uploadKey },
      })
      if (!remove.ok) {
        throw await responseError(remove)
      }
    } catch (cleanupError) {
      const uploadMessage = error instanceof Error ? error.message : 'Upload failed'
      const cleanupMessage = cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error'
      throw new Error(`${uploadMessage}; temporary files could not be removed (${cleanupMessage}) and will expire automatically.`)
    }
    throw error
  }

  return { url: `${window.location.origin}/share/${id}`, expiresAt }
}

export async function getPhoneShare(id: string): Promise<ShareInfo> {
  const response = await fetch(`/api/shares/${encodeURIComponent(id)}`)
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<ShareInfo>
}
