export function recordLivePhoto(stream: MediaStream, durationMs = 1800): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') {
    return Promise.reject(new Error('Live video recording is not supported in this browser'))
  }

  const mimeType = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp8',
    'video/webm',
  ].find((type) => MediaRecorder.isTypeSupported(type))
  let recorder: MediaRecorder
  try {
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error('Could not start live video recording'))
  }

  return new Promise((resolve, reject) => {
    const chunks: Blob[] = []
    const timeout = window.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop()
    }, durationMs)
    const cleanUp = () => window.clearTimeout(timeout)

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    })
    recorder.addEventListener('error', () => {
      cleanUp()
      reject(new Error('The camera could not record a live clip'))
    }, { once: true })
    recorder.addEventListener('stop', () => {
      cleanUp()
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' })
      if (blob.size === 0) reject(new Error('The camera returned an empty live clip'))
      else resolve(blob)
    }, { once: true })

    try {
      recorder.start(200)
    } catch (error) {
      cleanUp()
      reject(error instanceof Error ? error : new Error('Could not start live video recording'))
    }
  })
}
