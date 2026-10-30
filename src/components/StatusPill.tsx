/**
 * Status tones run light-to-dark as the order progresses, so the ramp itself reads
 * as "how far along is this" even before you read the label.
 */
export type StatusTone = 'idle' | 'early' | 'mid' | 'late' | 'done' | 'stopped'

const TONES: Record<StatusTone, { pill: string; dot: string }> = {
  idle: { pill: 'bg-surface text-ink/70 ring-1 ring-inset ring-mist', dot: 'bg-sage' },
  early: { pill: 'bg-mint text-ink', dot: 'bg-forest' },
  mid: { pill: 'bg-sage/30 text-forest-deep', dot: 'bg-forest' },
  late: { pill: 'bg-forest text-paper', dot: 'bg-mint' },
  done: { pill: 'bg-ink text-mint', dot: 'bg-mint' },
  stopped: { pill: 'bg-danger-soft text-danger', dot: 'bg-danger' },
}

export function StatusDot({ tone }: { tone: StatusTone }) {
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONES[tone].dot}`} aria-hidden="true" />
}

export function StatusPill({ tone, label, size = 'md' }: { tone: StatusTone; label: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      } ${TONES[tone].pill}`}
    >
      <StatusDot tone={tone} />
      {label}
    </span>
  )
}
