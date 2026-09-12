export function OrderIdHint({ id, nickname }: { id: string; nickname: string | null }) {
  if (!nickname) return null
  return <span className="text-sm text-ink/50"> ({id.slice(0, 8)})</span>
}
