interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <button type="button" className="btn-secondary" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>
        Previous
      </button>
      <span className="text-sm text-slate-500">
        Page {page + 1} of {totalPages}
      </span>
      <button type="button" className="btn-secondary" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
        Next
      </button>
    </div>
  )
}
