interface IconProps {
  size?: number
}

function base(size: number) {
  return {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
}

export function TrashIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 7 H20 M10 7 V5 a1 1 0 0 1 1-1 h2 a1 1 0 0 1 1 1 v2" />
      <path d="M6 7 L7 19 a1 1 0 0 0 1 1 h8 a1 1 0 0 0 1-1 L18 7" />
      <path d="M10 11 V16 M14 11 V16" />
    </svg>
  )
}

export function CheckIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 12.5 L9.5 18 L20 5.5" />
    </svg>
  )
}

export function CartIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="9" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <path d="M3 4 H5.5 L7.8 15.2 a1.5 1.5 0 0 0 1.47 1.3 H18 a1.5 1.5 0 0 0 1.46 -1.16 L21.5 8 H6.2" />
    </svg>
  )
}

export function CloseIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 5 L19 19 M19 5 L5 19" />
    </svg>
  )
}

export function EditIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M16.5 3.5 a2.12 2.12 0 0 1 3 3 L7 19 l-4 1 1-4 Z" />
    </svg>
  )
}

export function RefreshIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 4 V9 H9" />
      <path d="M4.5 15 a8 8 0 1 0 2-11.5 L4 9" />
    </svg>
  )
}

export function LinkIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9 15 L15 9" />
      <path d="M11 6 L13.5 3.5 a4 4 0 0 1 5.5 5.5 L16.5 11.5" />
      <path d="M13 18 L10.5 20.5 a4 4 0 0 1 -5.5 -5.5 L7.5 12.5" />
    </svg>
  )
}

export function SplitIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 4 H4 V9" />
      <path d="M4 4 L11 11" />
      <path d="M16 4 H20 V9" />
      <path d="M20 4 L13 11" />
      <path d="M12 13 V20" />
    </svg>
  )
}

export function SendIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 12 L20 4 L13 20 L11 13 Z" />
      <path d="M11 13 L20 4" />
    </svg>
  )
}

export function MoveIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 9 L5 5 L9 5" />
      <path d="M5 5 L11 11" />
      <path d="M13 13 H20 V20 H13 Z" />
    </svg>
  )
}

export function PlusIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 5 V19 M5 12 H19" />
    </svg>
  )
}

export function CopyIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9 9 H18 V18 H9 Z" />
      <path d="M6 15 H5 a1 1 0 0 1 -1 -1 V6 a1 1 0 0 1 1 -1 h9 a1 1 0 0 1 1 1 v1" />
    </svg>
  )
}

export function ChevronLeftIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M15 5 L8 12 L15 19" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9 5 L16 12 L9 19" />
    </svg>
  )
}

export function ExternalLinkIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M14 5 H19 V10" />
      <path d="M19 5 L10 14" />
      <path d="M17 13 V18 a1 1 0 0 1 -1 1 H6 a1 1 0 0 1 -1 -1 V8 a1 1 0 0 1 1 -1 h5" />
    </svg>
  )
}
