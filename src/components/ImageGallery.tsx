import type { Dispatch, SetStateAction } from 'react'
import { ImageDropInput } from './ImageDropInput'
import { ThumbnailImage } from './ThumbnailImage'

export const MAX_ITEM_IMAGES = 5

/** Add/remove UI for an inventory item's images, capped at MAX_ITEM_IMAGES - shared by the
 *  admin create form and the item edit form so both get the same cap and thumbnail grid. */
export function ImageGallery({ images, onChange }: { images: string[]; onChange: Dispatch<SetStateAction<string[]>> }) {
  const atMax = images.length >= MAX_ITEM_IMAGES

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((key) => (
            <div key={key} className="relative">
              <ThumbnailImage imageKey={key} className="h-20 w-20 rounded-lg" />
              <button
                type="button"
                onClick={() => onChange((current) => current.filter((k) => k !== key))}
                aria-label="Remove photo"
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-xs text-white hover:bg-ink"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <ImageDropInput
        label="Add photo"
        disabled={atMax}
        onUploaded={(key) => key && onChange((current) => [...current, key])}
      />
      <p className="text-xs text-ink/50">{images.length}/{MAX_ITEM_IMAGES} photos added.</p>
    </div>
  )
}
