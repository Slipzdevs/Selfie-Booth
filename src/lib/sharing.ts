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

async function responseError(response: Response): Promise<Error> {
  const contentType = response.headers.get('content-type') || ''
  const message = contentType.includes('application/json')
    ? (await response.json() as { error?: string }).error
    : await response.text()
  return new Error(message || `Share request failed (${response.status})`)
}

export async function getPhoneShare(id: string): Promise<ShareInfo> {
  const response = await fetch(`/api/shares/${encodeURIComponent(id)}`)
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<ShareInfo>
}
