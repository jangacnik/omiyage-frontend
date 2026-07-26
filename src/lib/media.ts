const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL ?? 'http://localhost:9000/omiyage'

export function mediaUrl(key: string): string {
  return `${MEDIA_BASE_URL}/${key}`
}
