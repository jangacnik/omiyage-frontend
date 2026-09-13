export function PreorderBadge({ expectedReleaseDate }: { expectedReleaseDate: string | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
      title={expectedReleaseDate ? `Expected release: ${expectedReleaseDate}` : 'Preorder'}
    >
      🕒 Preorder{expectedReleaseDate ? ` · ${expectedReleaseDate}` : ''}
    </span>
  )
}
