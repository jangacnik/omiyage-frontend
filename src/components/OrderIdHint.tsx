export function OrderIdHint({ id, nickname }: { id: string; nickname: string | null }) {
  if (!nickname) return null
  return <span className="text-sm text-muted"> ({id.slice(0, 8)})</span>
}
