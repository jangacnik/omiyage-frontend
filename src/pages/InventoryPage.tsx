import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories, useInventory } from '../api/inventory'
import { Money } from '../components/Money'
import { Pagination } from '../components/Pagination'
import { Spinner } from '../components/Spinner'
import { ThumbnailImage } from '../components/ThumbnailImage'

export function InventoryPage() {
  const [titleInput, setTitleInput] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTitle(titleInput)
      setPage(0)
    }, 300)
    return () => clearTimeout(timeout)
  }, [titleInput])

  const { data: categories } = useCategories()
  const { data, isLoading, isError } = useInventory({ title, categoryId: categoryId || undefined, page })

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="page-title">Inventory</h1>
        {data && <span className="text-sm text-ink/50">{data.totalElements} items</span>}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          placeholder="Search by title"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          aria-label="Search by title"
          className="field-input sm:max-w-xs"
        />
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setPage(0)
          }}
          aria-label="Filter by category"
          className="field-input sm:max-w-xs"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Spinner label="Fetching inventory" />}
      {isError && <p className="error-text">Could not load inventory.</p>}
      {data && data.content.length === 0 && (
        <div className="card flex flex-col items-center gap-1 py-12 text-center">
          <p className="font-medium text-ink">Nothing here yet</p>
          <p className="text-sm text-ink/55">Try a different search term or category.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {data?.content.map((item, i) => (
          <Link
            to={`/inventory/${item.id}`}
            key={item.id}
            className="card card-interactive animate-rise group overflow-hidden p-0"
            style={{ animationDelay: `${Math.min(i, 11) * 0.04}s` }}
          >
            <ThumbnailImage
              imageKey={item.images[0]}
              alt={item.title}
              className="aspect-square w-full"
              foregroundClassName="transition-transform duration-500 ease-[var(--ease-out-soft)] group-hover:scale-105"
            />
            <div className="p-3">
              <p className="truncate font-medium text-ink">{item.title}</p>
              <p className="text-sm text-ink/60">
                <Money amount={item.priceAmount} currency={item.currency} />
              </p>
            </div>
          </Link>
        ))}
      </div>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
