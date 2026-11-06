import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCategories, useInventory } from '../api/inventory'
import { useDeleteInventoryItem } from '../api/adminInventory'
import { useAuthStore } from '../store/authStore'
import { useConfirm } from '../components/confirmContext'
import { Pagination } from '../components/Pagination'
import { Spinner } from '../components/Spinner'
import { InventoryCard } from '../components/InventoryCard'
import { InventoryItemFormDialog } from '../components/InventoryItemFormDialog'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { errorMessage } from '../lib/apiClient'

const PAGE_SIZES = [20, 40, 80]

export function InventoryPage() {
  const isAdmin = useAuthStore((s) => s.claims?.role === 'ADMIN')
  const [searchParams, setSearchParams] = useSearchParams()
  const urlTitle = searchParams.get('title') ?? ''
  const [titleInput, setTitleInput] = useState(urlTitle)
  const [title, setTitle] = useState(urlTitle)
  const [categoryId, setCategoryId] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const page = Math.max(0, Number(searchParams.get('page')) || 0)
  const size = PAGE_SIZES.includes(Number(searchParams.get('size'))) ? Number(searchParams.get('size')) : PAGE_SIZES[0]
  const [editingId, setEditingId] = useState<string | null>(null)
  const deleteItem = useDeleteInventoryItem()
  const confirm = useConfirm()

  function updateParams(changes: Record<string, string | null>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      return next
    })
  }

  function setPage(newPage: number) {
    updateParams({ page: newPage === 0 ? null : String(newPage) })
  }

  function setSize(newSize: number) {
    updateParams({ size: newSize === PAGE_SIZES[0] ? null : String(newSize), page: null })
  }

  useEffect(() => {
    if (titleInput === title) return
    const timeout = setTimeout(() => {
      setTitle(titleInput)
      setPage(0)
    }, 300)
    return () => clearTimeout(timeout)
  }, [titleInput]) // eslint-disable-line react-hooks/exhaustive-deps

  // urlTitle only seeds state on mount - if this page stays mounted and something (e.g. the
  // "See all N results in Inventory" link from a search dropdown) re-enters it with a different
  // ?title=, resync from the URL instead of silently keeping whatever was typed before.
  const [syncedUrlTitle, setSyncedUrlTitle] = useState(urlTitle)
  if (urlTitle !== syncedUrlTitle) {
    setSyncedUrlTitle(urlTitle)
    setTitleInput(urlTitle)
    setTitle(urlTitle)
  }

  const { data: categories } = useCategories()
  const { data, isLoading, isError, refetch, isRefetching } = useInventory({ title, categoryId: categoryId || undefined, inStockOnly, page, size })
  const editingItem = data?.content.find((item) => item.id === editingId)

  const hasFilters = title !== '' || categoryId !== '' || inStockOnly

  function clearFilters() {
    setTitleInput('')
    setTitle('')
    setCategoryId('')
    setInStockOnly(false)
    setPage(0)
  }

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
    <div className="flex h-full flex-col">
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="page-title">Inventory</h1>
        {data && (
          <span className="text-sm text-muted">
            {data.totalElements} {data.totalElements === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Search" className="sm:max-w-xs">
          <input
            type="search"
            placeholder="Search by title"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className="field-input"
          />
        </Field>
        <Field label="Category" className="sm:max-w-xs">
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value)
              setPage(0)
            }}
            className="field-input"
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Per page" className="sm:max-w-xs">
          <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="field-input">
            {PAGE_SIZES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink/80">
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
      {isError && <ErrorState message="Could not load inventory." onRetry={() => refetch()} isRetrying={isRefetching} />}
      {data && data.content.length === 0 && (
        hasFilters ? (
          <EmptyState
            title="No items match"
            message="Try a different search term or category."
            action={
              <button type="button" className="btn-secondary mt-2" onClick={clearFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState title="No inventory yet" />
        )
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data?.content.map((item) => (
            <div key={item.id}>
              <InventoryCard
                item={item}
                onEdit={isAdmin ? () => setEditingId(item.id) : undefined}
                onDelete={isAdmin ? () => handleDelete(item.id, item.title) : undefined}
              />
            </div>
          ))}
        </div>
      </div>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}
      {deleteItem.isError && <p className="error-text mt-2">{errorMessage(deleteItem.error, 'Could not delete that item.')}</p>}

      {editingItem && (
        <Modal onClose={() => setEditingId(null)} labelledBy="inventory-item-dialog-title">
          <InventoryItemFormDialog item={editingItem} onDone={() => setEditingId(null)} />
        </Modal>
      )}
    </div>
  )
}
