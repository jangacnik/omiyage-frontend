import { useState } from 'react'
import { useAdminInventory, useDeleteInventoryItem } from '../../api/adminInventory'
import { Pagination } from '../../components/Pagination'
import { Spinner } from '../../components/Spinner'
import { InventoryCard } from '../../components/InventoryCard'
import { InventoryItemFormDialog } from '../../components/InventoryItemFormDialog'
import { Modal } from '../../components/Modal'
import { useConfirm } from '../../components/ConfirmDialog'

export function AdminInventoryPage() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useAdminInventory(page)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const editingItem = data?.content.find((item) => item.id === editingId)
  const deleteItem = useDeleteInventoryItem()
  const confirm = useConfirm()

  async function handleDelete(id: string, title: string) {
    const ok = await confirm({
      title: 'Delete item',
      message: `Delete "${title}" from inventory? This can't be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteItem.mutate(id)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Admin: Inventory</h1>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          Add item
        </button>
      </div>

      {isLoading && <Spinner label="Fetching inventory" />}

      <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data?.content.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onEdit={() => setEditingId(item.id)}
              onDelete={() => handleDelete(item.id, item.title)}
            />
          ))}
        </div>
      </div>

      {data && <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />}

      {creating && (
        <Modal onClose={() => setCreating(false)}>
          <InventoryItemFormDialog onDone={() => setCreating(false)} />
        </Modal>
      )}

      {editingItem && (
        <Modal onClose={() => setEditingId(null)}>
          <InventoryItemFormDialog item={editingItem} onDone={() => setEditingId(null)} />
        </Modal>
      )}
    </div>
  )
}
