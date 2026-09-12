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
