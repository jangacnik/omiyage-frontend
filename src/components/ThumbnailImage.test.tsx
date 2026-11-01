import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThumbnailImage } from './ThumbnailImage'

describe('ThumbnailImage', () => {
  it('shows a placeholder when there is no image key', () => {
    render(<ThumbnailImage imageKey={undefined} />)

    expect(screen.getByTestId('thumbnail-placeholder')).toBeInTheDocument()
  })

  it('shows the image when a key is given', () => {
    render(<ThumbnailImage imageKey="uploads/a.png" alt="card" />)

    expect(screen.getByAltText('card')).toBeInTheDocument()
    expect(screen.queryByTestId('thumbnail-placeholder')).not.toBeInTheDocument()
  })

  it('falls back to the placeholder when the image fails to load', () => {
    render(<ThumbnailImage imageKey="uploads/missing.png" alt="card" />)

    fireEvent.error(screen.getByAltText('card'))

    expect(screen.getByTestId('thumbnail-placeholder')).toBeInTheDocument()
  })
})
