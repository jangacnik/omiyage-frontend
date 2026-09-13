import { useState } from 'react'
import { useAdminCategories, useCreateCategory, useDeleteCategory } from '../../api/adminInventory'
import { Spinner } from '../../components/Spinner'
import { useConfirm } from '../../components/ConfirmDialog'
import { TrashIcon } from '../../components/icons'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function AdminCategoriesPage() {
  const { data: categories, isLoading } = useAdminCategories()
  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const confirm = useConfirm()
  const [name, setName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createCategory.mutateAsync({ name: name.trim(), slug: slugify(name) })
    setName('')
  }

  async function handleDelete(id: string, categoryName: string) {
    const ok = await confirm({
      title: 'Delete category',
      message: `Delete "${categoryName}"? Items already tagged with it keep their other categories.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteCategory.mutate(id)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={handleCreate} className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Category name"
          className="field-input"
        />
        <button type="submit" className="btn-primary shrink-0" disabled={createCategory.isPending}>
          Add category
        </button>
      </form>

      {isLoading && <Spinner label="Fetching categories" />}

      <ul className="flex flex-col gap-2">
        {categories?.map((c) => (
          <li key={c.id} className="card flex items-center justify-between py-2">
            <span className="text-sm text-ink/80">{c.name}</span>
            <button type="button" className="btn-danger px-2 py-1 text-xs" onClick={() => handleDelete(c.id, c.name)}>
              <TrashIcon size={13} /> Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
