import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/apiClient'
import { ButtonSpinner } from './Spinner'
import { mediaUrl } from '../lib/media'

interface ImageDropInputProps {
  label?: string
  initialImageKey?: string
  disabled?: boolean
  onUploaded: (key: string | undefined) => void
  onUploadingChange?: (uploading: boolean) => void
}

export function ImageDropInput({ label = 'Photo', initialImageKey, disabled, onUploaded, onUploadingChange }: ImageDropInputProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(initialImageKey ? mediaUrl(initialImageKey) : undefined)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | undefined>(undefined)

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    [],
  )

  async function uploadFile(file: File) {
    setError(null)
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const localUrl = URL.createObjectURL(file)
    objectUrlRef.current = localUrl
    setPreviewUrl(localUrl)

    setUploading(true)
    onUploadingChange?.(true)
    try {
      const result = await api.upload<{ key: string }>('/api/images', file)
      onUploaded(result.key)
    } catch {
      setError('Upload failed — try again.')
      setPreviewUrl(undefined)
      onUploaded(undefined)
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

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (!disabled) setDragActive(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    if (disabled) return
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
    if (file) void uploadFile(file)
  }

  function handleRemove() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = undefined
    setPreviewUrl(undefined)
    setError(null)
    onUploaded(undefined)
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="field-label">{label} <span className="font-normal text-ink/45">(optional)</span></span>
      <div
        className={`flex flex-col items-start gap-2 rounded-lg border border-dashed px-3 py-3 focus-within:ring-2 focus-within:ring-forest ${
          dragActive ? 'border-forest bg-forest/5' : 'border-mist bg-surface'
        } ${disabled ? 'opacity-50' : ''}`}
        onPaste={disabled ? undefined : handlePaste}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={disabled ? -1 : 0}
        role="group"
        aria-disabled={disabled}
        aria-label={`${label} — drag an image here, paste, or choose a file`}
      >
      <div className="flex flex-wrap items-center gap-3">
        {previewUrl && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-mist">
            <img
              src={previewUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-lg"
            />
            <img src={previewUrl} alt="Selected preview" className="relative h-full w-full object-contain" />
            {!uploading && (
              <button
                type="button"
                onClick={handleRemove}
                aria-label="Remove photo"
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-xs text-white hover:bg-ink"
              >
                ×
              </button>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
                <ButtonSpinner />
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-2 py-1 text-xs"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || disabled}
            >
              {previewUrl ? 'Replace file' : 'Choose file'}
            </button>
            <span className="text-xs text-ink/50">or drag an image here, or click and paste (Ctrl+V)</span>
          </div>
          {uploading && (
            <p className="flex items-center gap-2 text-sm text-ink/60">
              <ButtonSpinner /> Uploading...
            </p>
          )}
          {!uploading && previewUrl && !error && <p className="text-xs text-forest">Photo attached.</p>}
          {error && <p className="error-text text-xs">{error}</p>}
        </div>
      </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} aria-label={label} className="hidden" />
      </div>
    </div>
  )
}
