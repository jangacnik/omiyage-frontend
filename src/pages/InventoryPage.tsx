import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCategories, useInventory } from '../api/inventory'
import { Pagination } from '../components/Pagination'
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
      <h1>Inventory</h1>

      <div className="flex gap-3 py-3">
        <input
          type="search"
          placeholder="Search by title"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          aria-label="Search by title"
        />
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value)
            setPage(0)
          }}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p>Loading...</p>}
      {isError && <p>Could not load inventory.</p>}
      {data && data.content.length === 0 && <p>No items found.</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {data?.content.map((item) => (
          <Link to={`/inventory/${item.id}`} key={item.id} className="border border-gray-200 p-2">
            {item.images[0] && <img src={mediaUrl(item.images[0])} alt={item.title} className="aspect-square w-full object-cover" />}
            <p>{item.title}</p>
            <p>
              {item.priceAmount} {item.currency}
            </p>
          </Link>
        ))}
      </div>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  )
}
