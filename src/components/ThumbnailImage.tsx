import { mediaUrl } from '../lib/media'

/** A thumbnail box that always fills its allotted space: the image sits centered on a flat
 *  background, uncropped. `className` controls the box's size/shape (e.g. `h-20 w-20 rounded-lg`),
 *  same as a plain `<img>` would have been sized before. */
export function ThumbnailImage({
  imageKey,
  alt = '',
  className = '',
}: {
  imageKey?: string | null
  alt?: string
  className?: string
}) {
  return (
    <div className={`overflow-hidden bg-mist ${className}`}>
      {imageKey && <img src={mediaUrl(imageKey)} alt={alt} className="h-full w-full object-contain" />}
    </div>
  )
}
