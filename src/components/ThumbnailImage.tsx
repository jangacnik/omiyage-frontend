import { mediaUrl } from '../lib/media'

/** A thumbnail box that always fills its allotted space: a blurred, cropped copy of the same
 *  image fills the background so a smaller source image never leaves bare space around it, while
 *  the actual image sits centered on top, uncropped. `className` controls the box's size/shape
 *  (e.g. `h-20 w-20 rounded-lg`), same as a plain `<img>` would have been sized before. */
export function ThumbnailImage({
  imageKey,
  alt = '',
  className = '',
  foregroundClassName = '',
}: {
  imageKey?: string | null
  alt?: string
  className?: string
  /** Extra classes for the sharp foreground image only, e.g. a hover transition. */
  foregroundClassName?: string
}) {
  if (!imageKey) {
    return <div className={`overflow-hidden bg-mist ${className}`} />
  }

  const src = mediaUrl(imageKey)
  return (
    <div className={`relative overflow-hidden bg-mist ${className}`}>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-lg"
      />
      <img src={src} alt={alt} className={`relative h-full w-full object-contain ${foregroundClassName}`} />
    </div>
  )
}
