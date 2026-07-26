import { useState } from 'react'
import { useAdminCategories, useCreateCategory, useDeleteCategory } from '../../api/adminInventory'

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
  const [name, setName] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createCategory.mutateAsync({ name: name.trim(), slug: slugify(name) })
    setName('')
  }

  return (
    <div>
      <h1>Admin: Categories</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Category name" />
        <button type="submit" disabled={createCategory.isPending}>
          Add category
        </button>
      </form>

      {isLoading && <p>Loading...</p>}

      <ul>
        {categories?.map((c) => (
          <li key={c.id}>
            {c.name}
            <button type="button" onClick={() => deleteCategory.mutate(c.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
