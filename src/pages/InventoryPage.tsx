import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCategories, useInventory } from '../api/inventory'
import { useDeleteInventoryItem } from '../api/adminInventory'
import { useAuthStore } from '../store/authStore'
import { useConfirm } from '../components/ConfirmDialog'
import { Pagination } from '../components/Pagination'
import { Spinner } from '../components/Spinner'
import { InventoryCard } from '../components/InventoryCard'
import { InventoryItemEditForm } from '../components/InventoryItemEditForm'
import { errorMessage } from '../lib/apiClient'

export function InventoryPage() {
  const isAdmin = useAuthStore((s) => s.claims?.role === 'ADMIN')
  const [searchParams] = useSearchParams()
  const urlTitle = searchParams.get('title') ?? ''
  const [titleInput, setTitleInput] = useState(urlTitle)
  const [title, setTitle] = useState(urlTitle)
  const [categoryId, setCategoryId] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const deleteItem = useDeleteInventoryItem()
  const confirm = useConfirm()

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTitle(titleInput)
      setPage(0)
    }, 300)
    return () => clearTimeout(timeout)
  }, [titleInput])

  // initialTitle only seeds state on mount - if this page stays mounted and something (e.g. the
  // "See all N results in Inventory" link from a search dropdown) re-enters it with a different
  // ?title=, resync from the URL instead of silently keeping whatever was typed before.
  useEffect(() => {
    setTitleInput(urlTitle)
    setTitle(urlTitle)
    setPage(0)
  }, [urlTitle])

  const { data: categories } = useCategories()
  const { data, isLoading, isError, refetch, isRefetching } = useInventory({ title, categoryId: categoryId || undefined, inStockOnly, page })
  const editingItem = data?.content.find((item) => item.id === editingId)

  async function handleDelete(id: string, itemTitle: string) {
    const ok = await confirm({
      title: 'Delete item',
      message: `Delete "${itemTitle}" from inventory? This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteItem.mutate(id)
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="page-title">Inventory</h1>
        {data && (
          <span className="text-sm text-ink/50">
            {data.totalElements} {data.totalElements === 1 ? 'item' : 'items'}
          </span>
        )}
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
        <label className="flex items-center gap-2 text-sm text-ink/80">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => {
              setInStockOnly(e.target.checked)
              setPage(0)
            }}
          />
          In stock only
        </label>
      </div>

      {isLoading && <Spinner label="Fetching inventory" />}
      {isError && (
        <div className="card flex flex-col items-center gap-1 py-8 text-center">
          <p className="error-text">Could not load inventory.</p>
          <button type="button" className="btn-secondary mt-2" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}
      {data && data.content.length === 0 && (
        <div className="card flex flex-col items-center gap-1 py-12 text-center">
          <p className="font-medium text-ink">Nothing here yet</p>
          <p className="text-sm text-ink/55">Try a different search term or category.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {data?.content.map((item, i) => (
          <div key={item.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 11) * 0.04}s` }}>
            <InventoryCard
              item={item}
              onEdit={isAdmin ? () => setEditingId(item.id) : undefined}
              onDelete={isAdmin ? () => handleDelete(item.id, item.title) : undefined}
            />
          </div>
        ))}
      </div>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
      {deleteItem.isError && <p className="error-text mt-2">{errorMessage(deleteItem.error, 'Could not delete that item.')}</p>}

      {editingItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4" onClick={() => setEditingId(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <InventoryItemEditForm item={editingItem} onDone={() => setEditingId(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
