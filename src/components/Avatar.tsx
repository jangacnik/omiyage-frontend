import { mediaUrl } from '../lib/media'

const SIZE_CLASSES = { sm: 'h-6 w-6 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-16 w-16 text-xl' } as const

/** Small circular avatar shown next to a nickname - falls back to the nickname's first letter
 *  on a flat mist background when no avatar image has been set. */
export function Avatar({
  imageKey,
  nickname,
  size = 'sm',
}: {
  imageKey?: string | null
  nickname: string
  size?: keyof typeof SIZE_CLASSES
}) {
  const sizeClass = SIZE_CLASSES[size]

  if (!imageKey) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-mist font-medium text-ink/60 ${sizeClass}`}
        aria-hidden="true"
      >
        {nickname.charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <img
      src={mediaUrl(imageKey)}
      alt={`${nickname}'s avatar`}
      className={`shrink-0 rounded-full object-cover ${sizeClass}`}
    />
  )
}
