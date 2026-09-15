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

export function ExternalLinkIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M14 5 H19 V10" />
      <path d="M19 5 L10 14" />
      <path d="M17 13 V18 a1 1 0 0 1 -1 1 H6 a1 1 0 0 1 -1 -1 V8 a1 1 0 0 1 1 -1 h5" />
    </svg>
  )
}
