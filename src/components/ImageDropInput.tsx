import { useRef, useState } from 'react'
import { api } from '../lib/apiClient'
import { ButtonSpinner } from './Spinner'

interface ImageDropInputProps {
  label?: string
  onUploaded: (key: string) => void
  onUploadingChange?: (uploading: boolean) => void
}

export function ImageDropInput({ label = 'Photo', onUploaded, onUploadingChange }: ImageDropInputProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    setUploading(true)
    onUploadingChange?.(true)
    try {
      const result = await api.upload<{ key: string }>('/api/images', file)
      onUploaded(result.key)
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void uploadFile(file)
    e.target.value = ''
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    const file = item?.getAsFile()
    if (file) {
      e.preventDefault()
      void uploadFile(file)
    }
  }

  return (
    <div
      className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-stone-light bg-surface px-3 py-3 focus-within:ring-2 focus-within:ring-persimmon"
      onPaste={handlePaste}
      tabIndex={0}
      role="group"
      aria-label={`${label} — paste an image or choose a file`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secondary px-2 py-1 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          Choose file
        </button>
        <span className="text-xs text-ink/50">or click here and paste an image (Ctrl+V)</span>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} aria-label={label} className="hidden" />
      {uploading && (
        <p className="flex items-center gap-2 text-sm text-ink/60">
          <ButtonSpinner /> Uploading...
        </p>
      )}
    </div>
  )
}
