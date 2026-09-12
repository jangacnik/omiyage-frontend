export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--color-ink)" />
      <path d="M32 18 C32 9 22 7 22 13.5 C22 17.5 27 18 32 18 Z" fill="var(--color-mint)" />
      <path d="M32 18 C32 9 42 7 42 13.5 C42 17.5 37 18 32 18 Z" fill="var(--color-mint)" />
      <rect x="11" y="28" width="42" height="25" rx="3" fill="var(--color-paper)" />
      <rect x="8" y="18" width="48" height="11" rx="3" fill="var(--color-mint)" />
      <rect x="28" y="18" width="8" height="35" fill="var(--color-forest)" />
    </svg>
  )
}
