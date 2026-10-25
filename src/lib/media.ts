import { BASE_URL } from './apiClient'

export function mediaUrl(key: string): string {
  return `${BASE_URL}/api/images/${key}`
}
