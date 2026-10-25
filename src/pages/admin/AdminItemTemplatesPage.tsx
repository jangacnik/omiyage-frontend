import { useState } from 'react'
import {
  useCreateItemTemplate,
  useDeleteItemTemplate,
  useItemTemplates,
  useUpdateItemTemplate,
  type ItemTemplateInput,
} from '../../api/adminItemTemplates'
import { Field } from '../../components/Field'
import { Spinner, ButtonSpinner } from '../../components/Spinner'
import { useConfirm } from '../../components/confirmContext'
import { IconButton } from '../../components/IconButton'
import { CheckIcon, CloseIcon, EditIcon, TrashIcon } from '../../components/icons'
import { errorMessage } from '../../lib/apiClient'
import { formatGrams, formatMoney } from '../../lib/currency'
import type { ItemTemplateDto } from '../../types/api'

interface TemplateForm {
  name: string
  title: string
  description: string
  priceAmount: string
  boughtPrice: string
  weight: string
}

const emptyForm: TemplateForm = { name: '', title: '', description: '', priceAmount: '', boughtPrice: '', weight: '' }

function formOf(template: ItemTemplateDto): TemplateForm {
  return {
    name: template.name,
    title: template.title ?? '',
    description: template.description ?? '',
    priceAmount: template.priceAmount?.toString() ?? '',
    boughtPrice: template.boughtPrice?.toString() ?? '',
    weight: template.weight?.toString() ?? '',
  }
}

function toInput(form: TemplateForm): ItemTemplateInput {
  return {
    name: form.name.trim(),
    title: form.title.trim() || undefined,
    description: form.description.trim() || undefined,
    priceAmount: form.priceAmount ? Number(form.priceAmount) : undefined,
    boughtPrice: form.boughtPrice ? Number(form.boughtPrice) : undefined,
    weight: form.weight ? Number(form.weight) : undefined,
  }
}

function errorMessageOf(error: unknown): string {
  return errorMessage(error, 'Something went wrong. Please try again.')
}

function TemplateFields({
  form,
  onChange,
  idPrefix,
}: {
  form: TemplateForm
  onChange: <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) => void
  idPrefix: string
}) {
  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Field label="Template name" className="sm:flex-1">
          <input
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
            aria-label={`Template name (${idPrefix})`}
            className="field-input"
          />
        </Field>
        <Field label="Item title" hint="Optional" className="sm:flex-1">
          <input
            value={form.title}
            onChange={(e) => onChange('title', e.target.value)}
            aria-label={`Item title (${idPrefix})`}
            className="field-input"
          />
        </Field>
      </div>
      <Field label="Description" hint="Optional">
        <textarea
          value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          aria-label={`Description (${idPrefix})`}
          className="field-input"
        />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Field label="Price" hint="Optional, EUR" className="sm:flex-1">
          <input
            value={form.priceAmount}
            onChange={(e) => onChange('priceAmount', e.target.value)}
            aria-label={`Price (${idPrefix})`}
            className="field-input"
          />
        </Field>
        <Field label="Bought price" hint="Optional, JPY" className="sm:flex-1">
          <input
            value={form.boughtPrice}
            onChange={(e) => onChange('boughtPrice', e.target.value)}
            aria-label={`Bought price (${idPrefix})`}
            className="field-input"
          />
        </Field>
        <Field label="Weight" hint="Optional, grams" className="sm:flex-1">
          <input
            value={form.weight}
            onChange={(e) => onChange('weight', e.target.value)}
            aria-label={`Weight (${idPrefix})`}
            className="field-input"
          />
        </Field>
      </div>
    </>
  )
}

function TemplateRow({ template }: { template: ItemTemplateDto }) {
  const updateTemplate = useUpdateItemTemplate()
  const deleteTemplate = useDeleteItemTemplate()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<TemplateForm>(formOf(template))
  const [error, setError] = useState<string | null>(null)

  function updateField<K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function startEdit() {
    setForm(formOf(template))
    setError(null)
    setEditing(true)
  }

  function handleSave() {
    updateTemplate.mutate(
      { id: template.id, ...toInput(form) },
      { onSuccess: () => setEditing(false), onError: (err) => setError(errorMessageOf(err)) },
    )
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Delete template',
      message: `Delete the "${template.name}" template? Items already created from it keep their values.`,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteTemplate.mutate(template.id)
  }

  if (editing) {
    return (
      <li className="card flex flex-col gap-2 py-3">
        <TemplateFields form={form} onChange={updateField} idPrefix={template.id} />
        <div className="flex gap-2">
          <IconButton
            variant="primary"
            label="Save"
            onClick={handleSave}
            disabled={updateTemplate.isPending}
            icon={updateTemplate.isPending ? <ButtonSpinner /> : <CheckIcon size={14} />}
          />
          <IconButton label="Cancel" onClick={() => setEditing(false)} icon={<CloseIcon size={14} />} />
        </div>
        {error && <p className="error-text">{error}</p>}
      </li>
    )
  }

  return (
    <li className="card flex items-center justify-between gap-2 py-2">
      <div className="flex flex-col">
        <span className="font-medium text-ink">{template.name}</span>
        <span className="text-sm text-muted">
          {[
            template.title,
            template.priceAmount != null ? formatMoney(template.priceAmount, 'EUR') : null,
            template.boughtPrice != null ? formatMoney(template.boughtPrice, 'JPY') : null,
            template.weight != null ? formatGrams(template.weight) : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'No preset values'}
        </span>
      </div>
      <span className="flex shrink-0 gap-2">
        <IconButton label="Edit" onClick={startEdit} icon={<EditIcon size={14} />} />
        <IconButton variant="danger" label="Delete" onClick={handleDelete} icon={<TrashIcon size={14} />} />
      </span>
    </li>
  )
}

export function AdminItemTemplatesPage() {
  const { data: templates, isLoading } = useItemTemplates()
  const createTemplate = useCreateItemTemplate()
  const [form, setForm] = useState<TemplateForm>(emptyForm)
  const [createError, setCreateError] = useState<string | null>(null)

  function updateField<K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    createTemplate.mutate(toInput(form), {
      onSuccess: () => setForm(emptyForm),
      onError: (err) => setCreateError(errorMessageOf(err)),
    })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={handleCreate} className="card mb-6 flex flex-col gap-2">
        <TemplateFields form={form} onChange={updateField} idPrefix="new" />
        <button type="submit" className="btn-primary self-start" disabled={createTemplate.isPending}>
          Add template
        </button>
        {createError && <p className="error-text">{createError}</p>}
      </form>

      {isLoading && <Spinner label="Fetching item templates" />}
      {!isLoading && templates?.length === 0 && <p className="text-muted">No item templates yet.</p>}

      <ul className="flex flex-col gap-2">
        {templates?.map((t) => (
          <TemplateRow key={t.id} template={t} />
        ))}
      </ul>
    </div>
  )
}
