import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories, useInventory } from '../api/inventory'
import { Pagination } from '../components/Pagination'
import { Spinner } from '../components/Spinner'
import { mediaUrl } from '../lib/media'

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
      <h1 className="page-title mb-4">Inventory</h1>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
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
      {data && data.content.length === 0 && <p className="text-ink/50">No items found.</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {data?.content.map((item) => (
          <Link
            to={`/inventory/${item.id}`}
            key={item.id}
            className="card overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="aspect-square w-full bg-stone-light">
              {item.images[0] && <img src={mediaUrl(item.images[0])} alt={item.title} className="h-full w-full object-cover" />}
            </div>
            <div className="p-3">
              <p className="truncate font-medium text-ink">{item.title}</p>
              <p className="text-sm text-ink/60">
                {item.priceAmount} {item.currency}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
