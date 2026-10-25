import { IconButton } from './IconButton'
import { ChevronLeftIcon, ChevronRightIcon } from './icons'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <IconButton label="Previous page" disabled={page <= 0} onClick={() => onPageChange(page - 1)} icon={<ChevronLeftIcon size={14} />} />
      <span className="text-sm text-muted">
        Page {page + 1} of {totalPages}
      </span>
      <IconButton
        label="Next page"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        icon={<ChevronRightIcon size={14} />}
      />
    </div>
  )
}
