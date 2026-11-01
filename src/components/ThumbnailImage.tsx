import { useState } from 'react'
import { mediaUrl } from '../lib/media'
import { ImageIcon } from './icons'

/** A thumbnail box that always fills its allotted space: the image sits centered on a flat
 *  background, uncropped. `className` controls the box's size/shape (e.g. `h-20 w-20 rounded-lg`),
 *  same as a plain `<img>` would have been sized before. Shows a placeholder icon when there is
 *  no image or it fails to load. */
export function ThumbnailImage({
  imageKey,
  alt = '',
  className = '',
}: {
  imageKey?: string | null
  alt?: string
  className?: string
}) {
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const showImage = imageKey && failedKey !== imageKey
  return (
    <div className={`flex items-center justify-center overflow-hidden bg-mist text-muted ${className}`}>
      {showImage ? (
        <img
          src={mediaUrl(imageKey)}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailedKey(imageKey)}
          className="h-full w-full object-contain"
        />
      ) : (
        <span data-testid="thumbnail-placeholder">
          <ImageIcon size={20} />
        </span>
      )}
    </div>
  )
}
